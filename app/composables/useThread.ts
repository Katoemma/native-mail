export function useThread(threadId: Ref<string | null>) {
  const store = useThreadStore()

  const thread   = computed(() => threadId.value ? (store.threads[threadId.value] ?? null) : null)
  const emails   = computed(() => threadId.value ? (store.emailsByThread[threadId.value] ?? []) : [])
  const loading  = computed(() => store.loading)
  const error    = computed(() => store.error)

  watch(threadId, (id) => { if (id) store.fetch(id) }, { immediate: true })

  return { thread, emails, loading, error }
}
