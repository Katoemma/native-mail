import { defineStore } from 'pinia'

interface SessionState {
  username: string | null
  displayName: string | null
  email: string | null
  loggedIn: boolean
  loading: boolean
  error: string | null
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => ({
    username: null,
    displayName: null,
    email: null,
    loggedIn: false,
    loading: false,
    error: null,
  }),

  actions: {
    async login(username: string, password: string) {
      this.loading = true
      this.error = null
      try {
        const res = await $fetch<{ ok: boolean; displayName: string; email: string }>(
          '/api/auth/login',
          { method: 'POST', body: { username, password } },
        )
        this.username = username
        this.displayName = res.displayName
        this.email = res.email
        this.loggedIn = true
        return true
      }
      catch (err: unknown) {
        const msg = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
        this.error = msg ?? 'Login failed'
        return false
      }
      finally {
        this.loading = false
      }
    },

    async logout() {
      await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
      this.$reset()
      await navigateTo('/login')
    },

    /** Called on app boot to rehydrate from the session cookie. */
    async fetchSession() {
      try {
        const res = await $fetch<{ username: string; displayName: string; email: string }>('/api/session')
        this.username = res.username
        this.displayName = res.displayName
        this.email = res.email
        this.loggedIn = true
      }
      catch {
        this.loggedIn = false
      }
    },
  },
})
