import { defineStore } from 'pinia'
import type { Mailbox, MailboxRole } from '../../shared/types'

interface MailboxState {
  list: Mailbox[]
  selectedId: string | null
  loading: boolean
  error: string | null
}

export const useMailboxesStore = defineStore('mailboxes', {
  state: (): MailboxState => ({
    list: [],
    selectedId: null,
    loading: false,
    error: null,
  }),

  getters: {
    byRole: (state) => (role: MailboxRole) =>
      state.list.find(m => m.role === role) ?? null,

    inbox: (state) => state.list.find(m => m.role === 'inbox') ?? null,
    sent:  (state) => state.list.find(m => m.role === 'sent')  ?? null,
    drafts:(state) => state.list.find(m => m.role === 'drafts') ?? null,
    trash: (state) => state.list.find(m => m.role === 'trash') ?? null,
    junk:  (state) => state.list.find(m => m.role === 'junk')  ?? null,

    selected: (state) => state.list.find(m => m.id === state.selectedId) ?? null,

    totalUnread: (state) => state.list.reduce((sum, m) => sum + (m.unreadEmails ?? 0), 0),
  },

  actions: {
    async fetch() {
      this.loading = true
      this.error = null
      try {
        const res = await $fetch<{ mailboxes: Mailbox[] }>('/api/mailboxes')
        this.list = res.mailboxes
      }
      catch (err: unknown) {
        this.error = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to load mailboxes'
      }
      finally {
        this.loading = false
      }
    },

    select(id: string) {
      this.selectedId = id
    },

    selectByRole(role: MailboxRole) {
      const mb = this.list.find(m => m.role === role)
      if (mb) this.selectedId = mb.id
    },

    /**
     * Optimistically bump unread badges for the given mailboxes.
     * Used when mark-read / mark-unread happens locally before Mailbox/get refreshes.
     */
    adjustUnread(mailboxIds: string[], delta: number) {
      if (!mailboxIds.length || delta === 0) return
      const set = new Set(mailboxIds)
      this.list = this.list.map((mb) => {
        if (!set.has(mb.id)) return mb
        return {
          ...mb,
          unreadEmails: Math.max(0, (mb.unreadEmails ?? 0) + delta),
        }
      })
    },
  },
})
