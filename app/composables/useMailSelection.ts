/**
 * Shared multi-select state for mail lists (sidebar panel + mobile list).
 */
export function useMailSelection() {
  const selected = useState<string[]>('mail-selected-ids', () => [])

  const count = computed(() => selected.value.length)
  const hasSelection = computed(() => selected.value.length > 0)

  function isSelected(id: string) {
    return selected.value.includes(id)
  }

  function toggle(id: string) {
    if (isSelected(id)) {
      selected.value = selected.value.filter(x => x !== id)
    }
    else {
      selected.value = [...selected.value, id]
    }
  }

  function selectAll(ids: string[]) {
    selected.value = [...ids]
  }

  function clear() {
    selected.value = []
  }

  /** Select all visible, or clear if everything visible is already selected. */
  function toggleAll(ids: string[]) {
    const allSelected = ids.length > 0 && ids.every(id => selected.value.includes(id))
    if (allSelected) clear()
    else selectAll(ids)
  }

  return { selected, count, hasSelection, isSelected, toggle, selectAll, clear, toggleAll }
}
