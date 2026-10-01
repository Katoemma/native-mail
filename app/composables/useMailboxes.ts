export function useMailboxes() {
  const store = useMailboxesStore()
  return {
    mailboxes: computed(() => store.list),
    selected:  computed(() => store.selected),
    inbox:     computed(() => store.inbox),
    loading:   computed(() => store.loading),
    error:     computed(() => store.error),
    fetch:     () => store.fetch(),
    select:    (id: string) => store.select(id),
    selectByRole: (role: string) => store.selectByRole(role as never),
  }
}
