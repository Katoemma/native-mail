/**
 * Stalwart OAuth 2.0 service
 *
 * Implements Authorization Code flow + PKCE (RFC 7636).
 *
 * Endpoints are discovered dynamically from:
 *   GET /.well-known/oauth-authorization-server  (RFC 8414)
 *
 * This means we never hard-code internal Stalwart paths.
 * Confirmed endpoints from official Stalwart docs:
 *   Token endpoint:        /auth/token
 *   Authorization endpoint: discovered via metadata
 *
 * Revocation: Stalwart does NOT expose a revocation endpoint.
 * Tokens expire naturally (default: access 1h, refresh 30d).
 * Logout simply clears the session cookie server-side.
 *
 * Docs: https://stalw.art/docs/auth/oauth/
 */

import { randomBytes, createHash } from 'node:crypto'
import type { OAuthTokens } from '../../../shared/types'

// ---------------------------------------------------------------------------
// OAuth Authorization Server Metadata (RFC 8414)
// ---------------------------------------------------------------------------

export interface OAuthServerMetadata {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  device_authorization_endpoint?: string
  introspection_endpoint?: string
  scopes_supported?: string[]
  response_types_supported?: string[]
  grant_types_supported?: string[]
  code_challenge_methods_supported?: string[]
}

/**
 * Discovers OAuth server metadata from /.well-known/oauth-authorization-server.
 * Results are cached in Nitro storage so we only fetch once per server process.
 */
export async function discoverOAuthMetadata(baseUrl: string): Promise<OAuthServerMetadata> {
  const storage  = useStorage('session-cache')
  const cacheKey = `oauth-metadata:${baseUrl}`

  const cached = await storage.getItem<OAuthServerMetadata>(cacheKey)
  if (cached) return cached

  const discoveryUrl = `${baseUrl}/.well-known/oauth-authorization-server`

  let raw: unknown
  try {
    raw = await $fetch<unknown>(discoveryUrl)
  }
  catch (err) {
    // If discovery fails, fall back to the documented default endpoints
    const fallback: OAuthServerMetadata = {
      issuer:                  baseUrl,
      authorization_endpoint:  `${baseUrl}/auth/authorize`,
      token_endpoint:          `${baseUrl}/auth/token`,
      device_authorization_endpoint: `${baseUrl}/auth/device`,
      introspection_endpoint:  `${baseUrl}/auth/introspect`,
      code_challenge_methods_supported: ['S256'],
    }
    await storage.setItem(cacheKey, fallback)
    return fallback
  }

  const metadata = raw as OAuthServerMetadata
  await storage.setItem(cacheKey, metadata)
  return metadata
}

/** Invalidates the cached OAuth metadata (e.g. after a config change). */
export async function invalidateOAuthMetadata(baseUrl: string): Promise<void> {
  const storage = useStorage('session-cache')
  await storage.removeItem(`oauth-metadata:${baseUrl}`)
}

// ---------------------------------------------------------------------------
// PKCE helpers (RFC 7636)
// ---------------------------------------------------------------------------

export interface PkceChallenge {
  verifier:  string
  challenge: string
  method:    'S256'
}

/** Generates a cryptographically random PKCE code_verifier + SHA-256 challenge. */
export function generatePkceChallenge(): PkceChallenge {
  const verifier  = randomBytes(48).toString('base64url')  // 64 url-safe chars
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge, method: 'S256' }
}

/** Generates a random state parameter to prevent CSRF. */
export function generateState(): string {
  return randomBytes(24).toString('base64url')
}

// ---------------------------------------------------------------------------
// Authorization URL builder — uses discovered authorization_endpoint
// ---------------------------------------------------------------------------

export function buildAuthorizationUrl(params: {
  authorizationEndpoint: string
  clientId:      string
  redirectUri:   string
  scope:         string
  state:         string
  codeChallenge: string
}): string {
  const url = new URL(params.authorizationEndpoint)
  url.searchParams.set('response_type',          'code')
  url.searchParams.set('client_id',              params.clientId)
  url.searchParams.set('redirect_uri',           params.redirectUri)
  url.searchParams.set('scope',                  params.scope)
  url.searchParams.set('state',                  params.state)
  url.searchParams.set('code_challenge',         params.codeChallenge)
  url.searchParams.set('code_challenge_method',  'S256')
  return url.toString()
}

// ---------------------------------------------------------------------------
// Token exchange — authorization code → access_token + refresh_token
// Uses the discovered token_endpoint (/auth/token per Stalwart docs)
// ---------------------------------------------------------------------------

export async function exchangeCodeForTokens(params: {
  tokenEndpoint: string
  clientId:      string
  clientSecret:  string
  redirectUri:   string
  code:          string
  codeVerifier:  string
}): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     params.clientId,
    redirect_uri:  params.redirectUri,
    code:          params.code,
    code_verifier: params.codeVerifier,
  })

  // Only include client_secret if one is configured.
  // Public clients (no secret) rely on PKCE alone — both are valid per docs.
  if (params.clientSecret) {
    body.set('client_secret', params.clientSecret)
  }

  const raw = await $fetch<{
    access_token:  string
    refresh_token?: string
    token_type:    string
    expires_in:    number
    scope?:        string
  }>(params.tokenEndpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })

  return normaliseTokenResponse(raw)
}

// ---------------------------------------------------------------------------
// Token refresh — uses the discovered token_endpoint
// Stalwart may rotate the refresh token when remaining lifetime < refreshTokenRenewal (default 4d)
// ---------------------------------------------------------------------------

export async function refreshAccessToken(params: {
  tokenEndpoint: string
  clientId:      string
  clientSecret:  string
  refreshToken:  string
}): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     params.clientId,
    refresh_token: params.refreshToken,
  })

  if (params.clientSecret) {
    body.set('client_secret', params.clientSecret)
  }

  const raw = await $fetch<{
    access_token:  string
    refresh_token?: string
    token_type:    string
    expires_in:    number
    scope?:        string
  }>(params.tokenEndpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })

  const tokens = normaliseTokenResponse(raw)
  // Stalwart often omits refresh_token on refresh unless rotating —
  // keep the previous one so the next expiry doesn't strand the session.
  if (!tokens.refreshToken) {
    tokens.refreshToken = params.refreshToken
  }
  return tokens
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normaliseTokenResponse(raw: {
  access_token:  string
  refresh_token?: string
  token_type:    string
  expires_in:    number
  scope?:        string
}): OAuthTokens {
  return {
    accessToken:  raw.access_token,
    refreshToken: raw.refresh_token ?? null,
    tokenType:    raw.token_type ?? 'Bearer',
    expiresAt:    Date.now() + (raw.expires_in ?? 3600) * 1000,
    scope:        raw.scope ?? '',
  }
}

/** Returns true if the access token has expired (with a 60 s safety buffer). */
export function isTokenExpired(tokens: OAuthTokens): boolean {
  return Date.now() > tokens.expiresAt - 60_000
}
