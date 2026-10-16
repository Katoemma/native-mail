import type { MailMessage, ApiSearchResponse } from '../../shared/types'

/** Shared search state — sidebar panel + header + /mail/search page. */
export function useSearch() {
  const query   = useState('search-query',   () => '')
  const results = useState<MailMessage[]>('search-results', () => [])
  const total   = useState('search-total',   () => 0)
  const loading = useState('search-loading', () => false)
  const error   = useState<string | null>('search-error', () => null)

  let abortController: AbortController | null = null

  async function search(q: string) {
    const trimmed = q.trim()
    query.value = trimmed
    if (!trimmed) {
      results.value = []
      total.value = 0
      error.value = null
      return
    }

    abortController?.abort()
    abortController = new AbortController()

    loading.value = true
    error.value = null
    try {
      const res = await $fetch<ApiSearchResponse>('/api/search', {
        query: { q: trimmed, limit: 50 },
        signal: abortController.signal,
      })
      results.value = res.emails
      total.value   = res.total

      const mailStore = useMailStore()
      for (const e of res.emails) mailStore.emails[e.id] = e
    }
    catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') return
      error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
        ?? 'Search failed'
    }
    finally {
      loading.value = false
    }
  }

  function clear() {
    query.value   = ''
    results.value = []
    total.value   = 0
    error.value   = null
    abortController?.abort()
  }

  return { query, results, total, loading, error, search, clear }
}

/**
 * Wire debounced navigation + fetch once app-wide.
 * Safe to call from layout and sidebar — watchers register only on first call.
 */
export function useDebouncedMailSearch(delay = 350) {
  const router = useRouter()
  const route = useRoute()
  const { query, search, clear } = useSearch()
  const wired = useState('search-debounce-wired', () => false)
  const skipNext = useState('search-debounce-skip', () => false)

  async function commit(raw: string) {
    const q = raw.trim()
    if (!q) {
      clear()
      if (route.path === '/mail/search') await router.push('/mail/inbox')
      return
    }
    const currentQ = typeof route.query.q === 'string' ? route.query.q : ''
    if (route.path !== '/mail/search' || currentQ !== q) {
      await router.push({ path: '/mail/search', query: { q } })
    }
    await search(q)
  }

  if (!wired.value) {
    wired.value = true

    watch(
      () => route.query.q,
      (q) => {
        if (typeof q === 'string' && q !== query.value) {
          // URL is source of truth — update box + fetch, skip debounce re-nav
          skipNext.value = true
          query.value = q
          void search(q)
        }
      },
      { immediate: true },
    )

    watchDebounced(
      query,
      (q) => {
        if (skipNext.value) {
          skipNext.value = false
          return
        }
        void commit(q)
      },
      { debounce: delay },
    )
  }

  function searchNow() {
    skipNext.value = true
    void commit(query.value)
  }

  return { query, searchNow, commit }
}
