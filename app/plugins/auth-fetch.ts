/**
 * When any API call returns 401 (Stalwart token expired and refresh failed),
 * clear local session state and redirect to login.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const original = globalThis.$fetch

  globalThis.$fetch = original.create({
    async onResponseError({ response, request }) {
      if (response?.status !== 401) return

      const path = typeof request === 'string'
        ? request
        : (request as Request)?.url ?? ''

      // Let session/auth endpoints handle their own flow
      if (path.includes('/api/auth/') || path.includes('/api/session')) return

      if (!import.meta.client) return

      const sessionStore = useSessionStore()
      if (!sessionStore.loggedIn && !sessionStore.initialized) return

      sessionStore.$reset()
      sessionStore.initialized = true

      if (!window.location.pathname.startsWith('/login')) {
        await nuxtApp.runWithContext(() =>
          navigateTo('/login?reason=session_expired'),
        )
      }
    },
  }) as typeof $fetch
})
