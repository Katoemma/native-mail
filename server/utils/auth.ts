import { H3Event, getCookie, createError } from 'h3'

export interface SessionData {
  username: string
  displayName: string
  email: string
  /** base64-encoded "username:password" — stays server-side only */
  basicAuth: string
}

const COOKIE_NAME = 'nm_session'

/**
 * Encode a session payload as a simple signed token.
 * In production you'd use iron-session or similar; this is a
 * lightweight Base64+HMAC approach that avoids extra dependencies.
 */
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

/** Very lightweight HMAC-SHA256 substitute using Node's built-in crypto. */
function simpleHmac(data: string, secret: string): string {
  const { createHmac } = require('node:crypto')
  return createHmac('sha256', secret).update(data).digest('base64url')
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
 * Throws a 401 if missing or invalid.
 */
export function requireSession(event: H3Event): SessionData {
  const config = useRuntimeConfig()
  const token = getCookie(event, COOKIE_NAME)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorised' })
  }
  const session = decodeSession(token, config.sessionSecret)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }
  return session
}

/**
 * Returns the session or null without throwing.
 * Useful for optional auth checks.
 */
export function getSession(event: H3Event): SessionData | null {
  const config = useRuntimeConfig()
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null
  return decodeSession(token, config.sessionSecret)
}
