import type { MailMessage, ApiSearchResponse } from '../../shared/types'

export function useSearch() {
  const results  = ref<MailMessage[]>([])
  const total    = ref(0)
  const loading  = ref(false)
  const error    = ref<string | null>(null)
  const query    = ref('')

  let abortController: AbortController | null = null

  async function search(q: string) {
    query.value = q.trim()
    if (!query.value) { results.value = []; total.value = 0; return }

    // Cancel previous in-flight request
    abortController?.abort()
    abortController = new AbortController()

    loading.value = true
    error.value = null
    try {
      const res = await $fetch<ApiSearchResponse>('/api/search', {
        query: { q: query.value, limit: 50 },
        signal: abortController.signal,
      })
      results.value = res.emails
      total.value   = res.total
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
