import type { EmailChangesResponse } from '../../shared/types'

/**
 * Drives incremental Email/changes sync.
 * Fires on tab focus + optionally on a timer.
 * Uses the queryState token stored per mailbox in the mail store.
 */
export function useSync() {
  const mailStore     = useMailStore()
  const mailboxesStore = useMailboxesStore()

  let syncing = false

  async function syncMailbox(mailboxId: string) {
    const sinceState = mailStore.queryStateByMailbox[mailboxId]
    if (!sinceState || syncing) return

    syncing = true
    try {
      const changes = await $fetch<EmailChangesResponse>('/api/emails/changes', {
        query: { sinceState },
      })

      if (changes.created.length || changes.updated.length || changes.destroyed.length) {
        // Fetch new/updated emails into the store
        if (changes.created.length || changes.updated.length) {
          await mailStore.fetchList(mailboxId, true)
        }
        mailStore.applyChanges(
          mailboxId,
          changes.created,
          changes.updated,
          changes.destroyed,
        )
      }

      // Update the state token
      if (changes.newState) {
        mailStore.queryStateByMailbox[mailboxId] = changes.newState
      }

      // Refresh mailbox unread counts
      await mailboxesStore.fetch()
    }
    catch {
      // Silent — sync failures should not surface to the user
    }
    finally {
      syncing = false
    }
  }

  async function syncAll() {
    const selectedId = mailboxesStore.selectedId
    if (selectedId) await syncMailbox(selectedId)
  }

  /** Call this in a page's onMounted to wire up tab-focus sync. */
  function setupFocusSync() {
    const handler = () => syncAll()
    if (import.meta.client) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') syncAll()
      })
      window.addEventListener('focus', handler)
    }
    onUnmounted(() => {
      if (import.meta.client) window.removeEventListener('focus', handler)
    })
  }

  return { syncAll, syncMailbox, setupFocusSync }
}
