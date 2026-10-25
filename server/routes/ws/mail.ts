/**
 * WebSocket BFF proxy — /ws/mail
 *
 * Browser connects here (authenticated via session cookie).
 * Server opens a connection to Stalwart's JMAP WebSocket using the
 * user's OAuth Bearer token, then relays StateChange push events
 * back to the browser.
 *
 * Security boundary: OAuth tokens never reach the browser.
 *
 * Confirmed Stalwart endpoint (from /.well-known/jmap):
 *   wss://mail.katoemma.website/jmap/ws
 *
 * JMAP WebSocket protocol (RFC 8887):
 *   - Send WebSocketPushEnable to subscribe to state changes
 *   - Receive StateChange objects when email/mailbox state changes
 */

import { decodeSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { isTokenExpired, refreshAccessToken, discoverOAuthMetadata } from '../../services/stalwart/oauth'

// Map of peer.id → Stalwart WebSocket
const stalwartConnections = new Map<string, import('ws').WebSocket>()

// ── Extract session from raw WebSocket upgrade request ────────────────────────
// peer.request is a standard Request object (not H3Event), so we read
// the Cookie header directly.
function getSessionFromRequest(request: Request) {
  const config     = useRuntimeConfig()
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match        = cookieHeader.match(/(?:^|;\s*)nm_session=([^;]+)/)
  if (!match) return null
  return decodeSession(decodeURIComponent(match[1]), config.sessionSecret)
}

export default defineWebSocketHandler({

  async open(peer) {
    // ── Auth ──────────────────────────────────────────────────────────────
    const session = getSessionFromRequest(peer.request as unknown as Request)
    if (!session) {
      peer.send(JSON.stringify({ type: 'error', message: 'Unauthorised' }))
      peer.close()
      return
    }

    const { username } = session
    let accessToken = session.tokens.accessToken

    // Refresh expired access token before opening Stalwart WS
    // (HTTP routes do this via createJmapClient; WS has no H3Event to persist).
    try {
      if (isTokenExpired(session.tokens)) {
        if (!session.tokens.refreshToken) {
          peer.send(JSON.stringify({ type: 'error', message: 'Session expired' }))
          peer.close()
          return
        }
        const config = useRuntimeConfig()
        const metadata = await discoverOAuthMetadata(config.jmapBaseUrl)
        const refreshed = await refreshAccessToken({
          tokenEndpoint: metadata.token_endpoint,
          clientId:      config.oauthClientId,
          clientSecret:  config.oauthClientSecret,
          refreshToken:  session.tokens.refreshToken,
        })
        accessToken = refreshed.accessToken
        // Note: WS upgrade can't easily rewrite the httpOnly cookie here.
        // HTTP routes refresh + persist; this keeps the live socket alive.
      }
    }
    catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      peer.send(JSON.stringify({ type: 'error', message: `Token refresh failed: ${msg}` }))
      peer.close()
      return
    }

    // ── Get the confirmed JMAP WebSocket URL from session discovery ────────
    let wsUrl: string
    try {
      const jmapSession = await discoverJmapSession(accessToken, username)

      // Read from capabilities if present, otherwise build from apiUrl
      const wsCap = jmapSession.capabilities?.['urn:ietf:params:jmap:websocket'] as
        | { url?: string }
        | undefined

      wsUrl = wsCap?.url
        ?? jmapSession.apiUrl
          .replace(/^https/, 'wss')
          .replace(/^http/, 'ws')
          .replace(/\/jmap\/?$/, '/jmap/ws')
    }
    catch {
      peer.send(JSON.stringify({ type: 'error', message: 'JMAP discovery failed' }))
      peer.close()
      return
    }

    // ── Connect to Stalwart JMAP WebSocket (server-side) ──────────────────
    // Use the 'ws' package which is available in Node.js / Nitro and
    // supports custom headers for Bearer auth.
    try {
      const { WebSocket: NodeWS } = await import('ws')

      const stalwartWs = new NodeWS(wsUrl, ['jmap'], {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      stalwartConnections.set(peer.id, stalwartWs)

      stalwartWs.on('open', () => {
        // Subscribe to Email + Mailbox state change notifications
        stalwartWs.send(JSON.stringify({
          '@type':    'WebSocketPushEnable',
          dataTypes:  null,   // null = all types; or ['Email','Mailbox','EmailSubmission']
          pushState:  null,
        }))
        peer.send(JSON.stringify({ type: 'connected' }))
      })

      stalwartWs.on('message', (data) => {
        try {
          const text = data.toString('utf8')
          const msg  = JSON.parse(text)

          if (msg['@type'] === 'StateChange') {
            // Only relay StateChange — not raw JMAP responses
            peer.send(JSON.stringify({
              type:    'StateChange',
              changed: msg.changed ?? {},
            }))
          }
        }
        catch {
          // Ignore malformed messages
        }
      })

      stalwartWs.on('error', (err) => {
        console.error(`[ws/mail] Stalwart WS error for ${username}:`, err.message)
        peer.send(JSON.stringify({ type: 'stalwart_error', message: err.message }))
      })

      stalwartWs.on('close', (code, reason) => {
        stalwartConnections.delete(peer.id)
        peer.send(JSON.stringify({
          type:   'stalwart_closed',
          code,
          reason: reason.toString(),
        }))
      })
    }
    catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[ws/mail] Failed to connect for ${username}:`, msg)
      peer.send(JSON.stringify({ type: 'error', message: `Connect failed: ${msg}` }))
      peer.close()
    }
  },

  close(peer) {
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
