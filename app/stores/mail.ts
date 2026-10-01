import { defineStore } from 'pinia'
import type { MailMessage, MailMessageFull, ApiEmailsResponse } from '../../shared/types'

interface MailState {
  /** All fetched list-view emails keyed by id */
  emails: Record<string, MailMessage>
  /** Full emails (with body) keyed by id */
  fullEmails: Record<string, MailMessageFull>
  /** Email IDs per mailbox id */
  idsByMailbox: Record<string, string[]>
  /** Currently selected email id */
  selectedId: string | null
  /** Loading states */
  loadingList: boolean
  loadingEmail: boolean
  /** Error messages */
  listError: string | null
  emailError: string | null
  /** Pagination */
  totalByMailbox: Record<string, number>
  positionByMailbox: Record<string, number>
  /** JMAP state tokens for incremental sync */
  queryStateByMailbox: Record<string, string>
}

export const useMailStore = defineStore('mail', {
  state: (): MailState => ({
    emails: {},
    fullEmails: {},
    idsByMailbox: {},
    selectedId: null,
    loadingList: false,
    loadingEmail: false,
    listError: null,
    emailError: null,
    totalByMailbox: {},
    positionByMailbox: {},
    queryStateByMailbox: {},
  }),

  getters: {
    emailsForMailbox: (state) => (mailboxId: string): MailMessage[] => {
      const ids = state.idsByMailbox[mailboxId] ?? []
      return ids.map(id => state.emails[id]).filter(Boolean)
    },

    selectedEmail: (state): MailMessage | null =>
      state.selectedId ? (state.emails[state.selectedId] ?? null) : null,

    selectedEmailFull: (state): MailMessageFull | null =>
      state.selectedId ? (state.fullEmails[state.selectedId] ?? null) : null,

    hasMore: (state) => (mailboxId: string): boolean => {
      const ids = state.idsByMailbox[mailboxId] ?? []
      const total = state.totalByMailbox[mailboxId] ?? 0
      return ids.length < total
    },
  },

  actions: {
    async fetchList(mailboxId: string, reset = false) {
      if (reset) {
        this.idsByMailbox[mailboxId] = []
        this.positionByMailbox[mailboxId] = 0
      }
      const position = this.positionByMailbox[mailboxId] ?? 0
      this.loadingList = true
      this.listError = null
      try {
        const res = await $fetch<ApiEmailsResponse>('/api/emails', {
          query: { mailbox: mailboxId, position, limit: 50 },
        })
        const newIds = res.emails.map(e => e.id)
        // Merge into store
        for (const e of res.emails) this.emails[e.id] = e
        const existing = reset ? [] : (this.idsByMailbox[mailboxId] ?? [])
        this.idsByMailbox[mailboxId] = [...existing, ...newIds.filter(id => !existing.includes(id))]
        this.totalByMailbox[mailboxId] = res.total
        this.positionByMailbox[mailboxId] = position + res.emails.length
        this.queryStateByMailbox[mailboxId] = res.queryState
      }
      catch (err: unknown) {
        this.listError = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to load emails'
      }
      finally {
        this.loadingList = false
      }
    },

    async fetchMore(mailboxId: string) {
      if (!this.hasMore(mailboxId) || this.loadingList) return
      await this.fetchList(mailboxId, false)
    },

    async fetchOne(id: string) {
      this.loadingEmail = true
      this.emailError = null
      try {
        const res = await $fetch<{ email: MailMessageFull }>(`/api/emails/${id}`)
        this.fullEmails[id] = res.email
        // Also update list entry with latest keywords
        this.emails[id] = { ...res.email }
      }
      catch (err: unknown) {
        this.emailError = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to load email'
      }
      finally {
        this.loadingEmail = false
      }
    },

    select(id: string | null) {
      this.selectedId = id
    },

    // Optimistic keyword update
    _setKeyword(id: string, keyword: string, value: boolean) {
      const email = this.emails[id]
      if (!email) return
      const kw = { ...email.keywords }
      if (value) kw[keyword] = true
      else delete kw[keyword]
      this.emails[id] = {
        ...email,
        keywords: kw,
        isRead: '$seen' in kw,
        isStarred: '$flagged' in kw,
      }
      const full = this.fullEmails[id]
      if (full) {
        this.fullEmails[id] = { ...full, keywords: kw, isRead: '$seen' in kw, isStarred: '$flagged' in kw }
      }
    },

    async markRead(id: string, read = true) {
      this._setKeyword(id, '$seen', read)
      await $fetch(`/api/emails/${id}`, {
        method: 'PATCH',
        body: { read },
      }).catch(() => this._setKeyword(id, '$seen', !read))
    },

    async markStarred(id: string, starred = true) {
      this._setKeyword(id, '$flagged', starred)
      await $fetch(`/api/emails/${id}`, {
        method: 'PATCH',
        body: { starred },
      }).catch(() => this._setKeyword(id, '$flagged', !starred))
    },

    async move(id: string, mailboxId: string) {
      // Remove from current mailbox lists optimistically
      for (const mbId in this.idsByMailbox) {
        this.idsByMailbox[mbId] = this.idsByMailbox[mbId].filter(i => i !== id)
      }
      await $fetch(`/api/emails/${id}`, {
        method: 'PATCH',
        body: { mailboxId },
      })
    },

    async trash(id: string) {
      const mailboxesStore = useMailboxesStore()
      const trashId = mailboxesStore.trash?.id
      if (trashId) await this.move(id, trashId)
    },

    async destroy(id: string) {
      await $fetch(`/api/emails/${id}`, { method: 'DELETE' })
      this._removeFromAllMailboxes(id)
    },

    _removeFromAllMailboxes(id: string) {
      for (const mbId in this.idsByMailbox) {
        this.idsByMailbox[mbId] = this.idsByMailbox[mbId].filter(i => i !== id)
      }
      delete this.emails[id]
      delete this.fullEmails[id]
    },

    applyChanges(mailboxId: string, created: string[], updated: string[], destroyed: string[]) {
      // Remove destroyed
      for (const id of destroyed) this._removeFromAllMailboxes(id)
      // Invalidate updated (re-fetch on next view)
      for (const id of updated) {
        delete this.fullEmails[id]
      }
      // Created: will appear on next fetchList
      if (created.length || destroyed.length) {
        this.idsByMailbox[mailboxId] = (this.idsByMailbox[mailboxId] ?? []).filter(
          id => !destroyed.includes(id),
        )
      }
    },
  },
})
