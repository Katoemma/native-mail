/**
 * Stalwart OAuth 2.0 service
 *
 * Implements Authorization Code flow + PKCE (RFC 7636).
 * Reference: https://stalw.art/docs/auth/oauth/
 *
 * All functions run server-side only. The client_secret and tokens
 * never reach the browser.
 */

import { randomBytes, createHash } from 'node:crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OAuthTokens {
  accessToken: string
  refreshToken: string | null
  tokenType: string
  expiresAt: number   // Unix ms timestamp
  scope: string
}

export interface PkceChallenge {
  verifier: string
  challenge: string
  method: 'S256'
}

// ---------------------------------------------------------------------------
// PKCE helpers (RFC 7636)
// ---------------------------------------------------------------------------

/** Generate a cryptographically random PKCE code_verifier (43–128 chars). */
export function generatePkceChallenge(): PkceChallenge {
  const verifier = randomBytes(48).toString('base64url')  // 64 chars
  const challenge = createHash('sha256')
    .update(verifier)
    .digest('base64url')
  return { verifier, challenge, method: 'S256' }
}

/** Generate a random state parameter to prevent CSRF. */
export function generateState(): string {
  return randomBytes(24).toString('base64url')
}

// ---------------------------------------------------------------------------
// Authorization URL builder
// ---------------------------------------------------------------------------

/**
 * Builds the Stalwart OAuth authorization URL.
 * The browser is redirected here to authenticate.
 *
 * Stalwart endpoint: GET /auth/oauth/authorize
 * Docs: https://stalw.art/docs/development/api/
 */
export function buildAuthorizationUrl(params: {
  baseUrl: string
  clientId: string
  redirectUri: string
  scope: string
  state: string
  codeChallenge: string
}): string {
  const url = new URL(`${params.baseUrl}/auth/oauth/authorize`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('scope', params.scope)
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

// ---------------------------------------------------------------------------
// Token exchange — authorization code → access_token + refresh_token
// ---------------------------------------------------------------------------

/**
 * Exchange an authorization code for tokens.
 * Called server-side in the /auth/callback handler.
 *
 * Stalwart token endpoint: POST /auth/oauth/token
 */
export async function exchangeCodeForTokens(params: {
  baseUrl: string
  clientId: string
  clientSecret: string
  redirectUri: string
  code: string
  codeVerifier: string
}): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    code: params.code,
    code_verifier: params.codeVerifier,
  })

  const raw = await $fetch<{
    access_token: string
    refresh_token?: string
    token_type: string
    expires_in: number
    scope?: string
  }>(`${params.baseUrl}/auth/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  return normaliseTokenResponse(raw)
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

/**
 * Use a refresh_token to obtain a new access_token.
 * Called when a JMAP request returns 401.
 */
export async function refreshAccessToken(params: {
  baseUrl: string
  clientId: string
  clientSecret: string
  refreshToken: string
}): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: params.clientId,
    client_secret: params.clientSecret,
    refresh_token: params.refreshToken,
  })

  const raw = await $fetch<{
    access_token: string
    refresh_token?: string
    token_type: string
    expires_in: number
    scope?: string
  }>(`${params.baseUrl}/auth/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  return normaliseTokenResponse(raw)
}

// ---------------------------------------------------------------------------
// Token revocation
// ---------------------------------------------------------------------------

/**
 * Revoke a token on logout.
 * Stalwart endpoint: POST /auth/oauth/token/revoke
 */
export async function revokeToken(params: {
  baseUrl: string
  clientId: string
  clientSecret: string
  token: string
}): Promise<void> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    token: params.token,
  })

  await $fetch(`${params.baseUrl}/auth/oauth/token/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }).catch(() => {
    // Revocation failures are non-fatal — we clear the session regardless
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normaliseTokenResponse(raw: {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
  scope?: string
}): OAuthTokens {
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token ?? null,
    tokenType: raw.token_type ?? 'Bearer',
    expiresAt: Date.now() + (raw.expires_in ?? 3600) * 1000,
    scope: raw.scope ?? '',
  }
}

/** Returns true if the access token has expired (with a 60 s buffer). */
export function isTokenExpired(tokens: OAuthTokens): boolean {
  return Date.now() > tokens.expiresAt - 60_000
}
