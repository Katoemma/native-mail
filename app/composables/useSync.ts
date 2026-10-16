import type { EmailChangesResponse } from '../../shared/types'

/**
 * Real-time sync via WebSocket + fallback polling.
 *
 * Flow:
 *  1. Connect to /ws/mail (Nuxt BFF)
 *  2. BFF proxies to Stalwart JMAP WebSocket using OAuth token
 *  3. On StateChange → Email/changes + patch Pinia (no full list reload)
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
  let disposed = false

  // ── Sync logic ───────────────────────────────────────────────────────────
  let syncing = false
  let pendingSync = false

  async function syncIncremental() {
    if (syncing) {
      pendingSync = true
      return
    }

    syncing = true
    try {
      const sinceState = mailStore.emailState

      if (sinceState) {
        try {
          const changes = await $fetch<EmailChangesResponse>('/api/emails/changes', {
            query: { sinceState },
          })

          if (changes.newState) {
            mailStore.emailState = changes.newState
          }

          const hasDiff = changes.created.length
            || changes.updated.length
            || changes.destroyed.length

          if (hasDiff) {
            mailStore.applyIncremental({
              emails:    changes.emails ?? [],
              created:   changes.created,
              updated:   changes.updated,
              destroyed: changes.destroyed,
            })
            // Refresh folder badges (unread counts) only — not the message list
            await mailboxesStore.fetch()
          }
          return
        }
        catch {
          // Invalid/expired state token — fall through to full refetch
        }
      }

      // No state yet, or Email/changes failed → full list refresh for current mailbox
      const selectedId = mailboxesStore.selectedId
      if (selectedId) await mailStore.fetchList(selectedId, true)
      await mailboxesStore.fetch()
    }
    catch {
      // Silent — don't surface sync errors
    }
    finally {
      syncing = false
      if (pendingSync) {
        pendingSync = false
        void syncIncremental()
      }
    }
  }

  /** @deprecated alias — prefer syncIncremental */
  async function syncMailbox(_mailboxId: string) {
    await syncIncremental()
  }

  async function syncAll() {
    await syncIncremental()
  }

  // ── WebSocket connection ──────────────────────────────────────────────────
  function connect() {
    if (!import.meta.client || disposed) return
    if (!sessionStore.loggedIn) return

    // Drop any previous socket before opening a new one
    if (ws) {
      ws.close()
      ws = null
    }

    wsStatus.value = 'connecting'

    ws = useWebSocket('/ws/mail', {
      immediate: false,

      onConnected() {
        wsStatus.value  = 'connected'
        reconnectDelay  = 2000   // reset backoff on successful connect
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
      },

      onDisconnected() {
        if (disposed) return
        wsStatus.value = 'disconnected'
        scheduleReconnect()
      },

      onError() {
        if (disposed) return
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
            message?: string
          }

          if (msg.type === 'connected') {
            wsStatus.value = 'connected'
            return
          }

          // Stalwart side died — close our side and reconnect cleanly
          if (msg.type === 'error' || msg.type === 'stalwart_error' || msg.type === 'stalwart_closed') {
            wsStatus.value = 'disconnected'
            ws?.close()
            ws = null
            scheduleReconnect()
            return
          }

          if (msg.type === 'StateChange' && msg.changed) {
            for (const [, typeStates] of Object.entries(msg.changed)) {
              if ('Email' in typeStates || 'Mailbox' in typeStates) {
                syncIncremental()
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
    disposed = true
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    ws?.close()
    ws = null
    wsStatus.value = 'disconnected'
  }

  function scheduleReconnect() {
    if (disposed || reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (!disposed && sessionStore.loggedIn) connect()
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
        if (wsStatus.value === 'disconnected') connect()
        syncIncremental()
      }
    }
    const onFocus = () => syncIncremental()

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    onUnmounted(() => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
      disconnect()
    })
  }

  return { wsStatus, syncAll, syncMailbox, syncIncremental, setupFocusSync, connect, disconnect }
}
