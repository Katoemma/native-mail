const MIN_VISIBLE_MS = 900

/**
 * Gmail-style boot splash while the mail shell warms up.
 * Shows on every cold start (empty mailbox list), not a one-shot localStorage flag.
 */
export function useInboxOnboarding() {
  const mailboxesStore = useMailboxesStore()
  const mailStore = useMailStore()

  // Show immediately on cold client mount (before fetch finishes)
  const open = ref(import.meta.client && mailboxesStore.list.length === 0)

  async function runBoot(options?: {
    fetchMailboxes?: () => Promise<void>
  }) {
    const cold = mailboxesStore.list.length === 0
    // Warm navigations (mailboxes already in memory) — skip splash
    if (!cold) {
      open.value = false
      if (options?.fetchMailboxes) await options.fetchMailboxes()
      else await mailboxesStore.fetch()
      return
    }

    open.value = true
    const started = Date.now()

    try {
      if (options?.fetchMailboxes) await options.fetchMailboxes()
      else await mailboxesStore.fetch()

      const inboxId = mailboxesStore.inbox?.id
      if (inboxId && !(mailStore.idsByMailbox[inboxId]?.length)) {
        await mailStore.fetchList(inboxId, true)
      }
    }
    finally {
      const elapsed = Date.now() - started
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed)
      if (wait > 0) await new Promise<void>(resolve => setTimeout(resolve, wait))
      await nextTick()
      open.value = false
    }
  }

  return { open, runBoot }
}
