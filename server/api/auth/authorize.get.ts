/**
 * GET /api/auth/authorize
 *
 * Step 1 of the OAuth flow.
 * Generates PKCE challenge + state, stores them in a short-lived cookie,
 * then redirects the browser to the Stalwart authorization endpoint.
 *
 * The browser never sees the client_secret or any tokens here.
 */
import { generatePkceChallenge, generateState, buildAuthorizationUrl } from '../../services/stalwart/oauth'

const PKCE_COOKIE = 'nm_pkce'
const STATE_COOKIE = 'nm_state'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const pkce  = generatePkceChallenge()
  const state = generateState()

  // Store verifier + state in short-lived httpOnly cookies (5 min TTL).
  // These are only needed until the callback arrives.
  setCookie(event, PKCE_COOKIE, pkce.verifier, {
    httpOnly: true,
    sameSite: 'lax',   // lax — must survive the redirect round-trip
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 300,
  })
  setCookie(event, STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 300,
  })

  const authUrl = buildAuthorizationUrl({
    baseUrl:       config.jmapBaseUrl,
    clientId:      config.oauthClientId,
    redirectUri:   config.oauthRedirectUri,
    scope:         config.oauthScope,
    state,
    codeChallenge: pkce.challenge,
  })

  return sendRedirect(event, authUrl, 302)
})
