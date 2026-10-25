import { requireSession, setSessionCookie, clearSessionCookie } from '../utils/auth'
import { resolveAccessToken } from '../services/jmap/client'
import { discoverJmapSession } from '../services/jmap/session'
import { JmapClient } from '../services/jmap/client'
import { getIdentities } from '../services/jmap/identity'
import { JmapError } from '../utils/jmap-error'
import type { ApiSessionResponse } from '../../shared/types'

/**
 * Returns safe user info for the browser.
 *
 * Proactively refreshes the Stalwart access token when expired.
 * Auth failures clear the cookie and return 401.
 * Transient Stalwart outages still return the Nuxt session (soft).
 */
export default defineEventHandler(async (event): Promise<ApiSessionResponse> => {
  const session = requireSession(event)
  const config  = useRuntimeConfig()

  let { username, displayName, email } = session

  // Keep Stalwart token fresh — hard fail only on auth rejection
  try {
    await resolveAccessToken(session.tokens, event)
  }
  catch (err: unknown) {
    if (err instanceof JmapError && (err.type === 'authenticationFailed' || err.status === 401)) {
      clearSessionCookie(event)
      throw createError({
        statusCode: 401,
        statusMessage: 'Session expired — please sign in again',
      })
    }
    // Network / upstream blip — continue with existing Nuxt session
  }

  const needsHeal = !displayName?.trim() || !email?.trim() || username === 'unknown'

  if (needsHeal) {
    try {
      const accessToken = await resolveAccessToken(session.tokens, event)
      const jmapSession = await discoverJmapSession(accessToken, username)
      const client      = new JmapClient(jmapSession.apiUrl, accessToken)
      const identities  = await getIdentities(client, jmapSession.accountId)
      const identity    = identities[0]

      if (identity) {
        username    = identity.email || username
        displayName = (identity.name || identity.email || username).trim()
        email       = identity.email || email

        const fresh = requireSession(event)
        setSessionCookie(event, {
          ...fresh,
          username,
          displayName,
          email,
        }, config.sessionSecret)
      }
    }
    catch {
      // Non-fatal
    }
  }

  return {
    username:    username || 'user',
    displayName: (displayName || username || 'User').trim(),
    email:       (email || username || '').trim(),
  }
})
