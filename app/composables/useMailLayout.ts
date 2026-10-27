/**
 * Desktop mail chrome: Gmail-style list vs classic split pane.
 * See docs/MAIL-LAYOUT.md
 */

export type MailLayoutMode = 'list' | 'split'

const STORAGE_KEY = 'nm_mail_layout'

function normalize(value: unknown): MailLayoutMode {
  return value === 'split' ? 'split' : 'list'
}

export function useMailLayout() {
  const config = useRuntimeConfig()

  const mode = useState<MailLayoutMode>('mail-layout', () =>
    normalize(config.public.mailLayout),
  )

  const isList = computed(() => mode.value === 'list')
  const isSplit = computed(() => mode.value === 'split')

  function setMode(next: MailLayoutMode) {
    mode.value = normalize(next)
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, mode.value)
    }
  }

  function toggle() {
    setMode(mode.value === 'list' ? 'split' : 'list')
  }

  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'list' || stored === 'split') {
      mode.value = stored
    }
  })

  return {
    mode,
    isList,
    isSplit,
    setMode,
    toggle,
  }
}
