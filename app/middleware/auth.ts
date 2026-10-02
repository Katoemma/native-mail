export default defineNuxtRouteMiddleware(async (to) => {
  // Login and OAuth callback pages are always accessible
  if (to.path === '/login' || to.path.startsWith('/api/')) return

  const sessionStore = useSessionStore()

  // Wait for the plugin's fetchSession() to complete.
  // On first load the plugin runs before navigation so this resolves instantly.
  // On subsequent navigations initialized is already true.
  if (!sessionStore.initialized) {
    await new Promise<void>((resolve) => {
      const stop = watch(
        () => sessionStore.initialized,
        (ready) => {
          if (ready) { stop(); resolve() }
        },
        { immediate: true },
      )
    })
  }

  // Now we have the real auth state — redirect if not logged in
  if (!sessionStore.loggedIn) {
    return navigateTo('/login')
  }
})
