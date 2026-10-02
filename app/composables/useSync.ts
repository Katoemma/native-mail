import type { EmailChangesResponse } from '../../shared/types'

/**
 * Real-time sync via WebSocket + fallback polling.
 *
 * Flow:
 *  1. Connect to /ws/mail (Nuxt BFF)
 *  2. BFF proxies to Stalwart JMAP WebSocket using OAuth token
 *  3. On StateChange push → run Email/changes for affected mailboxes
 *  4. On disconnect → reconnect with exponential backoff
 *  5. On tab focus → trigger a manual sync as safety net
 */
export function useSync() {
  const mailStore      = useMailStore()
  const mailboxesStore = useMailboxesStore()
  const sessionStore   = useSessionStore()

  // ── WebSocket state ──────────────────────────────────────────────────────
  const wsStatus = ref<'connecting' | 'connected' | 'disconnected'>('disconnected')
  let ws: ReturnType<typeof useWebSocket> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectDelay = 2000   // starts at 2s, doubles up to 30s

  // ── Sync logic ───────────────────────────────────────────────────────────
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
        if (changes.created.length || changes.updated.length) {
          await mailStore.fetchList(mailboxId, true)
        }
        mailStore.applyChanges(mailboxId, changes.created, changes.updated, changes.destroyed)
      }

      if (changes.newState) {
        mailStore.queryStateByMailbox[mailboxId] = changes.newState
      }

      await mailboxesStore.fetch()
    }
    catch {
      // Silent — don't surface sync errors
    }
    finally {
      syncing = false
    }
  }

  async function syncAll() {
    // Sync the currently selected mailbox
    const selectedId = mailboxesStore.selectedId
    if (selectedId) await syncMailbox(selectedId)
  }

  // ── WebSocket connection ──────────────────────────────────────────────────
  function connect() {
    if (!import.meta.client) return
    if (!sessionStore.loggedIn) return

    wsStatus.value = 'connecting'

    ws = useWebSocket('/ws/mail', {
      immediate: false,

      onConnected() {
        wsStatus.value  = 'connected'
        reconnectDelay  = 2000   // reset backoff on successful connect
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
      },

      onDisconnected() {
        wsStatus.value = 'disconnected'
        scheduleReconnect()
      },

      onError() {
        wsStatus.value = 'disconnected'
        scheduleReconnect()
      },

      onMessage(_, event) {
        try {
          const msg = JSON.parse(
            typeof event.data === 'string' ? event.data : '',
          ) as {
            type: string
            changed?: Record<string, Record<string, string>>
          }

          if (msg.type === 'StateChange' && msg.changed) {
            // Find the accountId key and extract which types changed
            for (const [, typeStates] of Object.entries(msg.changed)) {
              // If Email changed, sync the current mailbox
              if ('Email' in typeStates || 'Mailbox' in typeStates) {
                syncAll()
              }
            }
          }
        }
        catch {
          // Malformed message
        }
      },
    })

    ws.open()
  }

  function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    ws?.close()
    wsStatus.value = 'disconnected'
  }

  function scheduleReconnect() {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (sessionStore.loggedIn) connect()
    }, reconnectDelay)
    // Exponential backoff: 2s → 4s → 8s → 16s → 30s max
    reconnectDelay = Math.min(reconnectDelay * 2, 30_000)
  }

  // ── Focus-based fallback polling ──────────────────────────────────────────
  function setupFocusSync() {
    if (!import.meta.client) return

    connect()

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        // If WS is down, try to reconnect; always do a manual sync
        if (wsStatus.value === 'disconnected') connect()
        syncAll()
      }
    }
    const onFocus = () => syncAll()

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    onUnmounted(() => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
      disconnect()
    })
  }

  return { wsStatus, syncAll, syncMailbox, setupFocusSync, connect, disconnect }
}
