/**
 * GET /api/auth/callback
 *
 * Step 2 of the OAuth flow.
 * Stalwart redirects the browser here after the user authenticates.
 *
 * 1. Validates the state parameter (CSRF protection)
 * 2. Reads the PKCE verifier from the short-lived cookie
 * 3. Discovers the Stalwart token endpoint via /.well-known/oauth-authorization-server
 * 4. Exchanges the authorization code for tokens (server-side, never in browser)
 * 5. Discovers the JMAP session → resolves accountId + display name via Identity/get
 * 6. Sets the signed httpOnly session cookie
 * 7. Redirects the browser to /mail/inbox
 */
import {
  discoverOAuthMetadata,
  exchangeCodeForTokens,
} from '../../services/stalwart/oauth'
import { discoverJmapSession } from '../../services/jmap/session'
import { JmapClient } from '../../services/jmap/client'
import { setSessionCookie } from '../../utils/auth'
import type { Identity } from '../../../shared/types'

const PKCE_COOKIE  = 'nm_pkce'
const STATE_COOKIE = 'nm_state'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query  = getQuery(event)

  const code          = query.code  as string | undefined
  const returnedState = query.state as string | undefined
  const errorParam    = query.error as string | undefined

  // ── OAuth error returned by Stalwart (user denied, etc.) ─────────────────
  if (errorParam) {
    return sendRedirect(event, `/login?error=${encodeURIComponent(errorParam)}`, 302)
  }

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Missing authorization code' })
  }

  // ── CSRF: validate state ──────────────────────────────────────────────────
  const savedState   = getCookie(event, STATE_COOKIE)
  const pkceVerifier = getCookie(event, PKCE_COOKIE)

  // Debug: log all cookies received (remove after confirming flow works)
  console.log('[callback] cookies received:', event.headers.get('cookie'))
  console.log('[callback] savedState:', savedState, '| returnedState:', returnedState)
  console.log('[callback] pkceVerifier present:', !!pkceVerifier)

  if (!savedState || savedState !== returnedState) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid state parameter — possible CSRF attempt' })
  }

  // ── PKCE verifier ─────────────────────────────────────────────────────────
  const codeVerifier = pkceVerifier
  if (!codeVerifier) {
    throw createError({ statusCode: 400, statusMessage: 'Missing PKCE verifier' })
  }

  // Clean up the short-lived cookies immediately
  deleteCookie(event, PKCE_COOKIE,  { path: '/' })
  deleteCookie(event, STATE_COOKIE, { path: '/' })

  // ── Discover token endpoint ───────────────────────────────────────────────
  // Stalwart token endpoint is /auth/token — we discover it rather than hard-code it.
  const metadata = await discoverOAuthMetadata(config.jmapBaseUrl)

  // ── Exchange code for tokens (server-side only) ───────────────────────────
  let tokens
  try {
    tokens = await exchangeCodeForTokens({
      tokenEndpoint: metadata.token_endpoint,
      clientId:      config.oauthClientId,
      clientSecret:  config.oauthClientSecret,
      redirectUri:   config.oauthRedirectUri,
      code,
      codeVerifier,
    })
  }
  catch (err) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Token exchange failed — invalid code or client credentials',
    })
  }

  // ── Resolve user identity via JMAP ────────────────────────────────────────
  let username    = 'unknown'
  let displayName = ''
  let email       = ''

  try {
    // Use the access token for JMAP session discovery
    const jmapSession = await discoverJmapSession(tokens.accessToken, '_callback_')
    const client      = new JmapClient(jmapSession.apiUrl, tokens.accessToken)

    const response = await client.request([
      ['Identity/get', { accountId: jmapSession.accountId, ids: null }, 'identities'],
    ])
    const args     = client.getResponse<{ list: Identity[] }>(response, 'identities')
    const identity = args.list?.[0]

    if (identity) {
      username    = identity.email
      displayName = identity.name || identity.email
      email       = identity.email

      // Now that we have the real username, move the cached session to the right key
      await discoverJmapSession(tokens.accessToken, username)
    }
  }
  catch {
    // Non-fatal — the user is authenticated, we just lack display info
  }

  // ── Set session cookie ────────────────────────────────────────────────────
  // httpOnly + signed — tokens never appear in browser JS
  setSessionCookie(event, { username, displayName, email, tokens }, config.sessionSecret)

  return sendRedirect(event, '/mail/inbox', 302)
})
