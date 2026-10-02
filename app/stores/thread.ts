import { defineStore } from 'pinia'
import type { MailThread, MailMessage, ApiThreadResponse } from '../../shared/types'

interface ThreadState {
  threads: Record<string, MailThread>
  emailsByThread: Record<string, MailMessage[]>
  loading: boolean
  error: string | null
}

export const useThreadStore = defineStore('thread', {
  state: (): ThreadState => ({
    threads: {},
    emailsByThread: {},
    loading: false,
    error: null,
  }),

  actions: {
    async fetch(threadId: string) {
      if (this.threads[threadId]) return
      this.loading = true
      this.error = null
      try {
        const res = await $fetch<ApiThreadResponse>(`/api/threads/${threadId}`)
        this.threads[threadId] = res.thread
        this.emailsByThread[threadId] = res.emails
        // Merge emails into mail store so viewer can use them
        const mailStore = useMailStore()
        for (const e of res.emails) {
          mailStore.emails[e.id] = e
        }
      }
      catch (err: unknown) {
        this.error = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
          ?? 'Failed to load thread'
      }
      finally {
        this.loading = false
      }
    },
  },
})
