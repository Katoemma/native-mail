export function useEmails(mailboxId: Ref<string> | string) {
  const store = useMailStore()
  const mbId = isRef(mailboxId) ? mailboxId : ref(mailboxId)

  const emails = computed(() => store.emailsForMailbox(mbId.value))
  const loading = computed(() => store.loadingList)
  const error   = computed(() => store.listError)
  const hasMore = computed(() => store.hasMore(mbId.value))
  const pageInfo = computed(() => store.pageInfo(mbId.value))

  async function load(reset = false) {
    if (mbId.value) await store.fetchList(mbId.value, reset)
  }

  watch(mbId, () => load(true), { immediate: false })

  return {
    emails,
    loading,
    error,
    hasMore,
    pageInfo,
    load,
    loadMore: () => store.fetchNextPage(mbId.value),
    prevPage: () => store.fetchPrevPage(mbId.value),
    nextPage: () => store.fetchNextPage(mbId.value),
  }
}
