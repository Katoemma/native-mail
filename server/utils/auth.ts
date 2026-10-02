import type { H3Event } from 'h3'
import type { OAuthTokens } from '../../shared/types'
import { createHmac } from 'node:crypto'

// ---------------------------------------------------------------------------
// Session shape — stored in the httpOnly cookie, never sent to the browser
// ---------------------------------------------------------------------------
export interface SessionData {
  username: string
  displayName: string
  email: string
  /** OAuth tokens — no password is ever stored */
  tokens: OAuthTokens
}

const COOKIE_NAME = 'nm_session'

// ---------------------------------------------------------------------------
// Signing helpers (HMAC-SHA256, no extra deps)
// ---------------------------------------------------------------------------

function simpleHmac(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

export function encodeSession(data: SessionData, secret: string): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = simpleHmac(payload, secret)
  return `${payload}.${sig}`
}

export function decodeSession(token: string, secret: string): SessionData | null {
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (simpleHmac(payload, secret) !== sig) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionData
  }
  catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export function setSessionCookie(event: H3Event, data: SessionData, secret: string) {
  const token = encodeSession(data, secret)
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

/**
 * Reads and validates the session cookie.
 * Throws 401 if missing, invalid, or token expired with no refresh token.
 */
export function requireSession(event: H3Event): SessionData {
  const config = useRuntimeConfig()
  const raw = getCookie(event, COOKIE_NAME)
  if (!raw) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorised' })
  }
  const session = decodeSession(raw, config.sessionSecret)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }
  return session
}

/** Returns the session or null without throwing. */
export function getSession(event: H3Event): SessionData | null {
  const config = useRuntimeConfig()
  const raw = getCookie(event, COOKIE_NAME)
  if (!raw) return null
  return decodeSession(raw, config.sessionSecret)
}

/**
 * Updates just the token portion of an existing session cookie.
 * Called after a successful token refresh.
 */
export function refreshSessionTokens(event: H3Event, tokens: OAuthTokens): void {
  const config = useRuntimeConfig()
  const session = requireSession(event)
  setSessionCookie(event, { ...session, tokens }, config.sessionSecret)
}
