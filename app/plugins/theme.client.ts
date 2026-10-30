/**
 * Apply saved / system theme as early as possible on the client
 * (pairs with the inline head script for first paint).
 */
export default defineNuxtPlugin(() => {
  const { setPreference } = useTheme()
  try {
    const stored = localStorage.getItem('nm_theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setPreference(stored)
      return
    }
  }
  catch { /* ignore */ }
  setPreference('system')
})
