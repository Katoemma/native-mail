export default defineNuxtRouteMiddleware((to) => {
  // OAuth callback and login are always accessible
  if (to.path === '/login' || to.path.startsWith('/api/')) return

  const sessionStore = useSessionStore()

  // In SPA mode the session plugin runs before any navigation,
  // so initialized is always true here. Guard anyway for safety.
  if (!sessionStore.loggedIn) {
    return navigateTo('/login')
  }
})
