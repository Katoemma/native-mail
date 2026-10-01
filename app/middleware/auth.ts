export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const sessionStore = useSessionStore()
  if (!sessionStore.loggedIn) {
    await sessionStore.fetchSession()
  }
  if (!sessionStore.loggedIn) {
    return navigateTo('/login')
  }
})
