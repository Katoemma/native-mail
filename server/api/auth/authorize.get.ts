/**
 * GET /api/auth/authorize
 *
 * Step 1 of the OAuth flow.
 *
 * 1. Discovers the Stalwart authorization endpoint via
 *    /.well-known/oauth-authorization-server  (RFC 8414)
 * 2. Generates a PKCE challenge + random state
 * 3. Stores the verifier + state in short-lived httpOnly cookies
 * 4. Redirects the browser to the discovered authorization_endpoint
 *
 * The client_secret and tokens never reach the browser.
 */
import {
  discoverOAuthMetadata,
  generatePkceChallenge,
  generateState,
  buildAuthorizationUrl,
} from '../../services/stalwart/oauth'

const PKCE_COOKIE  = 'nm_pkce'
const STATE_COOKIE = 'nm_state'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // ── Discover OAuth server metadata ───────────────────────────────────────
  // Stalwart exposes /.well-known/oauth-authorization-server (RFC 8414).
  // This gives us the real authorization_endpoint without hard-coding paths.
  const metadata = await discoverOAuthMetadata(config.jmapBaseUrl)

  // ── PKCE + state ─────────────────────────────────────────────────────────
  const pkce  = generatePkceChallenge()
  const state = generateState()

  // Store verifier + state in short-lived httpOnly cookies (5 min TTL).
  // sameSite must be 'lax' so they survive the redirect round-trip to Stalwart.
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 300,
  }
  setCookie(event, PKCE_COOKIE,  pkce.verifier, cookieOptions)
  setCookie(event, STATE_COOKIE, state,          cookieOptions)

  // ── Build the authorization URL and redirect ──────────────────────────────
  const authUrl = buildAuthorizationUrl({
    authorizationEndpoint: metadata.authorization_endpoint,
    clientId:              config.oauthClientId,
    redirectUri:           config.oauthRedirectUri,
    scope:                 config.oauthScope,
    state,
    codeChallenge:         pkce.challenge,
  })

  return sendRedirect(event, authUrl, 302)
})
