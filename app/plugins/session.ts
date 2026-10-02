/**
 * Client-side plugin — runs before any page mounts.
 * Fetches the session from the server cookie.
 * Sets sessionStore.initialized = true when done (success or failure).
 * app.vue watches initialized to hide the loading screen.
 */
export default defineNuxtPlugin(async () => {
  const sessionStore = useSessionStore()
  if (!sessionStore.initialized) {
    await sessionStore.fetchSession()
  }
})
