/**
 * GET /api/auth/callback
 *
 * Step 2 of the OAuth flow.
 * Stalwart redirects the browser here after the user authenticates.
 *
 * This handler:
 *  1. Validates the state parameter (CSRF protection)
 *  2. Reads the PKCE verifier from the short-lived cookie
 *  3. Exchanges the authorization code for access + refresh tokens (server-side)
 *  4. Discovers the JMAP session to resolve accountId and display name
 *  5. Sets the session cookie (contains tokens — never sent to the browser as JSON)
 *  6. Redirects the browser to /mail/inbox
 */
import { getQuery } from 'h3'
import {
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

  const code           = query.code  as string | undefined
  const returnedState  = query.state as string | undefined
  const errorParam     = query.error as string | undefined

  // --- OAuth error from Stalwart (user denied, etc.) ---
  if (errorParam) {
    return sendRedirect(event, `/login?error=${encodeURIComponent(errorParam)}`, 302)
  }

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Missing authorization code' })
  }

  // --- CSRF: validate state ---
  const savedState = getCookie(event, STATE_COOKIE)
  if (!savedState || savedState !== returnedState) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid state parameter' })
  }

  // --- Read PKCE verifier ---
  const codeVerifier = getCookie(event, PKCE_COOKIE)
  if (!codeVerifier) {
    throw createError({ statusCode: 400, statusMessage: 'Missing PKCE verifier' })
  }

  // Clean up the short-lived cookies
  deleteCookie(event, PKCE_COOKIE, { path: '/' })
  deleteCookie(event, STATE_COOKIE, { path: '/' })

  // --- Exchange code for tokens (server-side only) ---
  let tokens
  try {
    tokens = await exchangeCodeForTokens({
      baseUrl:      config.jmapBaseUrl,
      clientId:     config.oauthClientId,
      clientSecret: config.oauthClientSecret,
      redirectUri:  config.oauthRedirectUri,
      code,
      codeVerifier,
    })
  }
  catch {
    throw createError({ statusCode: 401, statusMessage: 'Token exchange failed — invalid code or credentials' })
  }

  // --- Discover JMAP session to get accountId ---
  // We need a temporary username key for caching; extract from token if possible,
  // otherwise use a placeholder that gets updated after Identity/get.
  let username    = 'unknown'
  let displayName = ''
  let email       = ''

  try {
    const jmapSession = await discoverJmapSession(tokens.accessToken, username)
    const client      = new JmapClient(jmapSession.apiUrl, tokens.accessToken)

    const response = await client.request([
      ['Identity/get', { accountId: jmapSession.accountId, ids: null }, 'identities'],
    ])
    const args     = client.getResponse<{ list: Identity[] }>(response, 'identities')
    const identity = args.list?.[0]

    if (identity) {
      username    = identity.email
      displayName = identity.name  || identity.email
      email       = identity.email
    }
  }
  catch {
    // Non-fatal — proceed with minimal session data
  }

  // --- Set session cookie (httpOnly, signed, no tokens in browser) ---
  setSessionCookie(event, { username, displayName, email, tokens }, config.sessionSecret)

  return sendRedirect(event, '/mail/inbox', 302)
})
