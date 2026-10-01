/**
 * Runs on app mount (client-side only).
 * Rehydrates the Pinia session store from the server-side session cookie.
 */
export default defineNuxtPlugin(async () => {
  const sessionStore = useSessionStore()
  if (!sessionStore.loggedIn) {
    await sessionStore.fetchSession()
  }
})
