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
    /**
     * Redirects the browser to the BFF OAuth authorize endpoint.
     * The BFF generates PKCE + state, then redirects to Stalwart.
     * No password ever touches Nuxt client code.
     */
    startOAuth() {
      window.location.href = '/api/auth/authorize'
    },

    async logout() {
      await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
      this.$reset()
      await navigateTo('/login')
    },

    /** Rehydrates from the server-side session cookie on app boot. */
    async fetchSession() {
      this.loading = true
      try {
        const res = await $fetch<{ username: string; displayName: string; email: string }>(
          '/api/session',
        )
        this.username    = res.username
        this.displayName = res.displayName
        this.email       = res.email
        this.loggedIn    = true
      }
      catch {
        this.loggedIn = false
      }
      finally {
        this.loading = false
      }
    },
  },
})
