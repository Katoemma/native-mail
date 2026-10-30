export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'nm_theme'

/**
 * Light / dark / system theme. Applies `.dark` on <html>.
 * Preference is persisted in localStorage.
 */
export function useTheme() {
  const preference = useState<ThemePreference>('theme-preference', () => 'system')
  const preferredDark = usePreferredDark()

  const isDark = computed(() => {
    if (preference.value === 'dark') return true
    if (preference.value === 'light') return false
    return preferredDark.value
  })

  function apply() {
    if (!import.meta.client) return
    document.documentElement.classList.toggle('dark', isDark.value)
    document.documentElement.style.colorScheme = isDark.value ? 'dark' : 'light'
  }

  function setPreference(next: ThemePreference) {
    preference.value = next
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, next)
      }
      catch { /* private mode */ }
    }
    apply()
  }

  function cycle() {
    const order: ThemePreference[] = ['light', 'dark', 'system']
    const i = order.indexOf(preference.value)
    setPreference(order[(i + 1) % order.length]!)
  }

  onMounted(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        preference.value = stored
      }
    }
    catch { /* ignore */ }
    apply()
  })

  watch([isDark, preference], () => apply())

  return {
    preference,
    isDark,
    setPreference,
    cycle,
  }
}
