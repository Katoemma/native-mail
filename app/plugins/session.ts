/**
 * Client-side plugin — this is the ONLY place fetchSession() is called.
 * Runs before any route navigation. Sets initialized = true when done.
 * The auth middleware reads initialized/loggedIn — never calls fetchSession itself.
 */
export default defineNuxtPlugin(async () => {
  const sessionStore = useSessionStore()
  if (!sessionStore.initialized) {
    await sessionStore.fetchSession()
  }
})
