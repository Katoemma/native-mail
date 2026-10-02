/**
 * WebSocket BFF proxy — /ws/mail
 *
 * The browser connects here (session cookie auth).
 * This handler connects to Stalwart's JMAP WebSocket on the server side
 * using the user's OAuth token, then relays StateChange push events
 * back to the browser.
 *
 * Security boundary: credentials never leave the server.
 * The browser only receives normalised JSON events.
 *
 * Stalwart JMAP push spec:
 *   https://www.stalwart.email/docs/http/jmap/
 *
 * JMAP StateChange object (RFC 8620 §7.1):
 * {
 *   "@type": "StateChange",
 *   "changed": {
 *     "<accountId>": {
 *       "Email": "<newState>",
 *       "Mailbox": "<newState>",
 *       "EmailSubmission": "<newState>"
 *     }
 *   }
 * }
 */

import { getSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'

// Map of peer id → Stalwart WebSocket connection
const stalwartConnections = new Map<string, WebSocket>()

export default defineWebSocketHandler({

  async open(peer) {
    // ── Authenticate via session cookie ───────────────────────────────────
    const event = peer.request as unknown as Parameters<typeof getSession>[0]
    const session = getSession(event)

    if (!session) {
      peer.send(JSON.stringify({ type: 'error', message: 'Unauthorised' }))
      peer.close()
      return
    }

    const { tokens, username } = session

    // ── Discover the JMAP WebSocket URL ───────────────────────────────────
    let wsUrl: string
    try {
      const config      = useRuntimeConfig()
      const jmapSession = await discoverJmapSession(tokens.accessToken, username)

      // Stalwart exposes a WebSocket at the same base URL + /jmap/ws
      // We derive it from the discovered apiUrl
      wsUrl = jmapSession.apiUrl
        .replace(/^https?:\/\//, (match) => match.startsWith('https') ? 'wss://' : 'ws://')
        .replace(/\/jmap\/?$/, '/jmap/ws')
    }
    catch {
      peer.send(JSON.stringify({ type: 'error', message: 'JMAP session discovery failed' }))
      peer.close()
      return
    }

    // ── Open a server-side connection to Stalwart JMAP WebSocket ──────────
    try {
      const stalwartWs = new WebSocket(wsUrl, ['jmap'], {
        // @ts-ignore — Node WebSocket headers
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      } as unknown as string[])

      stalwartConnections.set(peer.id, stalwartWs)

      // Subscribe to push notifications for Email + Mailbox changes
      stalwartWs.addEventListener('open', () => {
        stalwartWs.send(JSON.stringify({
          '@type': 'WebSocketPushEnable',
          dataTypes: ['Email', 'Mailbox', 'EmailSubmission'],
          pushState: null,
        }))
        peer.send(JSON.stringify({ type: 'connected' }))
      })

      // Relay Stalwart push events to the browser
      stalwartWs.addEventListener('message', (evt) => {
        try {
          const data = typeof evt.data === 'string' ? evt.data : String(evt.data)
          const msg  = JSON.parse(data)

          // Only relay StateChange events — ignore API responses
          if (msg['@type'] === 'StateChange') {
            peer.send(JSON.stringify({
              type:    'StateChange',
              changed: msg.changed ?? {},
            }))
          }
        }
        catch {
          // Malformed message — ignore
        }
      })

      stalwartWs.addEventListener('error', () => {
        peer.send(JSON.stringify({ type: 'stalwart_error' }))
      })

      stalwartWs.addEventListener('close', () => {
        stalwartConnections.delete(peer.id)
        peer.send(JSON.stringify({ type: 'stalwart_closed' }))
      })
    }
    catch (err) {
      peer.send(JSON.stringify({ type: 'error', message: `WebSocket connect failed: ${String(err)}` }))
      peer.close()
    }
  },

  close(peer) {
    // Clean up the Stalwart connection when the browser disconnects
    const stalwartWs = stalwartConnections.get(peer.id)
    if (stalwartWs) {
      stalwartWs.close()
      stalwartConnections.delete(peer.id)
    }
  },

  error(peer) {
    const stalwartWs = stalwartConnections.get(peer.id)
    if (stalwartWs) {
      stalwartWs.close()
      stalwartConnections.delete(peer.id)
    }
  },
})
