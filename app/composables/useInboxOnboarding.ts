const STORAGE_PREFIX = 'native-mail:inbox-onboarded:'

/**
 * Gmail-style first-load overlay for the inbox.
 * Shown once per account until mailboxes + inbox list finish loading.
 */
export function useInboxOnboarding() {
  const sessionStore = useSessionStore()
  const mailboxesStore = useMailboxesStore()
  const mailStore = useMailStore()

  const open = ref(false)

  function storageKey() {
    const who = sessionStore.email || sessionStore.username || 'anon'
    return `${STORAGE_PREFIX}${who}`
  }

  function alreadyDone(): boolean {
    if (!import.meta.client) return true
    try {
      return localStorage.getItem(storageKey()) === '1'
    }
    catch {
      return false
    }
  }

  function markDone() {
    if (!import.meta.client) return
    try {
      localStorage.setItem(storageKey(), '1')
    }
    catch {
      /* private mode */
    }
  }

  /**
   * Call from the mail layout after mount.
   * Fetches mailboxes (always) and primes inbox on first onboard.
   */
  async function runBoot(options?: {
    fetchMailboxes?: () => Promise<void>
  }) {
    const firstTime = !alreadyDone()
    if (firstTime) open.value = true

    try {
      if (options?.fetchMailboxes) await options.fetchMailboxes()
      else await mailboxesStore.fetch()

      if (firstTime) {
        const inboxId = mailboxesStore.inbox?.id
        if (inboxId && !(mailStore.idsByMailbox[inboxId]?.length)) {
          await mailStore.fetchList(inboxId, true)
        }
        // Let the UI paint one frame before fade-out
        await nextTick()
        markDone()
      }
    }
    finally {
      open.value = false
    }
  }

  return { open, runBoot, alreadyDone, markDone }
}
