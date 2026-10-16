import type { MailMessage, ApiSearchResponse } from '../../shared/types'

/** Shared search state — sidebar panel + /mail/search page both use this. */
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

      // Merge into mail store so star / viewer can resolve list metadata
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
  }

  return { query, results, total, loading, error, search, clear }
}
