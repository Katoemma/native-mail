import { getSession, clearSessionCookie } from '../../utils/auth'
import { invalidateJmapSession } from '../../services/jmap/session'

/**
 * POST /api/auth/logout
 *
 * Stalwart does not expose a token revocation endpoint.
 * Tokens expire naturally (access: 1h default, refresh: 30d default).
 * Logout simply clears the server-side session cookie and evicts
 * the cached JMAP session so the next login starts fresh.
 */
export default defineEventHandler(async (event) => {
  const session = getSession(event)

  if (session) {
    // Evict the cached JMAP session for this user
    await invalidateJmapSession(session.username)
  }

  clearSessionCookie(event)
  return { ok: true }
})
