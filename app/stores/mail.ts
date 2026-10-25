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
  /** Email/query queryState per mailbox (for Email/queryChanges) */
  queryStateByMailbox: Record<string, string>
  /** Account-wide Email/get state — used with Email/changes on push */
  emailState: string | null
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
    emailState: null,
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
        if (res.emailState) this.emailState = res.emailState
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

    applyChanges(mailboxId: string, created: string[], _updated: string[], destroyed: string[]) {
      for (const id of destroyed) this._removeFromAllMailboxes(id)
      // Do not wipe fullEmails for updates — that blanked the open viewer after mark-read.
      if (created.length || destroyed.length) {
        this.idsByMailbox[mailboxId] = (this.idsByMailbox[mailboxId] ?? []).filter(
          id => !destroyed.includes(id),
        )
      }
    },

    /**
     * Patch the store from Email/changes without reloading the list.
     * New emails are prepended to any loaded mailbox they belong to.
     */
    applyIncremental(payload: {
      emails: MailMessage[]
      created: string[]
      updated: string[]
      destroyed: string[]
    }) {
      const { emails, created, updated, destroyed } = payload
      const createdSet = new Set(created)
      const updatedSet = new Set(updated)

      for (const id of destroyed) {
        // Adjust totals for mailboxes that had this id
        for (const mbId of Object.keys(this.idsByMailbox)) {
          if (this.idsByMailbox[mbId].includes(id)) {
            this.totalByMailbox[mbId] = Math.max(0, (this.totalByMailbox[mbId] ?? 1) - 1)
            this.positionByMailbox[mbId] = Math.max(0, (this.positionByMailbox[mbId] ?? 1) - 1)
          }
        }
        this._removeFromAllMailboxes(id)
      }

      // Newest first when inserting several at once
      const sorted = [...emails].sort((a, b) => {
        const ta = a.receivedAt ? Date.parse(a.receivedAt) : 0
        const tb = b.receivedAt ? Date.parse(b.receivedAt) : 0
        return tb - ta
      })

      for (const email of sorted) {
        this.emails[email.id] = email

        // Merge into an open full email — never delete the body.
        // Deleting fullEmails on $seen updates made the viewer flash empty
        // right after opening an unread message (WS StateChange → Email/changes).
        if (updatedSet.has(email.id)) {
          const full = this.fullEmails[email.id]
          if (full) {
            this.fullEmails[email.id] = {
              ...full,
              subject: email.subject,
              preview: email.preview,
              keywords: email.keywords,
              isRead: email.isRead,
              isStarred: email.isStarred,
              hasAttachment: email.hasAttachment,
              mailboxIds: email.mailboxIds,
              from: email.from,
              to: email.to,
              cc: email.cc,
              replyTo: email.replyTo,
              receivedAt: email.receivedAt,
              sentAt: email.sentAt,
              size: email.size,
            }
          }
        }

        const targetMailboxes = Object.keys(email.mailboxIds).filter(k => email.mailboxIds[k])

        // Drop from mailboxes it no longer belongs to
        for (const mbId of Object.keys(this.idsByMailbox)) {
          const inList = this.idsByMailbox[mbId].includes(email.id)
          const shouldBe = targetMailboxes.includes(mbId)
          if (inList && !shouldBe) {
            this.idsByMailbox[mbId] = this.idsByMailbox[mbId].filter(i => i !== email.id)
            this.totalByMailbox[mbId] = Math.max(0, (this.totalByMailbox[mbId] ?? 1) - 1)
            this.positionByMailbox[mbId] = Math.max(0, (this.positionByMailbox[mbId] ?? 1) - 1)
          }
        }

        // Add / refresh membership in loaded mailboxes
        for (const mbId of targetMailboxes) {
          // Only touch mailboxes we've already loaded
          if (!(mbId in this.idsByMailbox)) continue

          const ids = this.idsByMailbox[mbId]
          const idx = ids.indexOf(email.id)

          if (idx === -1 && createdSet.has(email.id)) {
            this.idsByMailbox[mbId] = [email.id, ...ids]
            this.totalByMailbox[mbId] = (this.totalByMailbox[mbId] ?? 0) + 1
            this.positionByMailbox[mbId] = (this.positionByMailbox[mbId] ?? 0) + 1
          }
          else if (idx === -1 && updatedSet.has(email.id)) {
            // Moved into this mailbox — place at top
            this.idsByMailbox[mbId] = [email.id, ...ids]
            this.totalByMailbox[mbId] = (this.totalByMailbox[mbId] ?? 0) + 1
            this.positionByMailbox[mbId] = (this.positionByMailbox[mbId] ?? 0) + 1
          }
          // else: already in list — email object updated in place above
        }
      }
    },
  },
})
