/**
 * Authenticated JMAP context for API routes.
 *
 * Always refreshes the OAuth access token *before* talking to Stalwart,
 * then discovers the JMAP session with a valid Bearer token.
 * Auth failures clear the Nuxt session cookie and return HTTP 401 so the
 * client can send the user back to login.
 */
import type { H3Event } from 'h3'
import type { JmapSession } from '../../shared/types'
import { requireSession, clearSessionCookie, type SessionData } from './auth'
import { discoverJmapSession } from '../services/jmap/session'
import { JmapClient, resolveAccessToken } from '../services/jmap/client'
import { JmapError, jmapErrorToStatus } from './jmap-error'

export interface JmapContext {
  session: SessionData
  jmapSession: JmapSession
  client: JmapClient
  accessToken: string
}

export async function useJmap(event: H3Event): Promise<JmapContext> {
  const session = requireSession(event)

  try {
    // 1. Refresh access token if needed (and persist into the session cookie)
    const accessToken = await resolveAccessToken(session.tokens, event)

    // 2. Discover JMAP endpoints with a *valid* token (not the stale one)
    const jmapSession = await discoverJmapSession(accessToken, session.username)

    // 3. Client ready for JMAP method calls
    const client = new JmapClient(jmapSession.apiUrl, accessToken)

    return { session, jmapSession, client, accessToken }
  }
  catch (err: unknown) {
    throw handleJmapAuthError(event, err)
  }
}

/** Run a JMAP-backed handler; maps auth failures to 401 + cleared cookie. */
export async function withJmap<T>(
  event: H3Event,
  fn: (ctx: JmapContext) => Promise<T>,
): Promise<T> {
  const ctx = await useJmap(event)
  try {
    return await fn(ctx)
  }
  catch (err: unknown) {
    throw handleJmapAuthError(event, err)
  }
}

/** Convert JmapError / refresh failures into H3 errors; clear cookie on auth loss. */
export function handleJmapAuthError(event: H3Event, err: unknown): never {
  // Already an H3 error (e.g. createError 404 from a route) — pass through
  if (isH3Error(err)) throw err

  if (err instanceof JmapError) {
    if (err.type === 'authenticationFailed' || err.status === 401) {
      clearSessionCookie(event)
      throw createError({
        statusCode: 401,
        statusMessage: 'Session expired — please sign in again',
      })
    }
    throw createError({
      statusCode: err.status ?? jmapErrorToStatus(err.type),
      statusMessage: err.description ?? err.type,
    })
  }

  // Fetch/ofetch errors from token refresh
  const status = (err as { statusCode?: number; status?: number; response?: { status?: number } })
  const code = status.statusCode ?? status.status ?? status.response?.status
  if (code === 401 || code === 400) {
    clearSessionCookie(event)
    throw createError({
      statusCode: 401,
      statusMessage: 'Session expired — please sign in again',
    })
  }

  throw err instanceof Error
    ? createError({ statusCode: 502, statusMessage: err.message })
    : createError({ statusCode: 502, statusMessage: 'Upstream mail server error' })
}

function isH3Error(err: unknown): boolean {
  return !!err
    && typeof err === 'object'
    && 'statusCode' in err
    && typeof (err as { statusCode: unknown }).statusCode === 'number'
}
