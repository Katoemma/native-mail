import { requireSession, setSessionCookie } from '../utils/auth'
import { discoverJmapSession } from '../services/jmap/session'
import { createJmapClient } from '../services/jmap/client'
import { getIdentities } from '../services/jmap/identity'
import type { ApiSessionResponse } from '../../shared/types'

/**
 * Returns safe user info for the browser.
 * If the session was created without identity details (Identity/get failed
 * during OAuth callback), heal it here so the UI isn't blank forever.
 */
export default defineEventHandler(async (event): Promise<ApiSessionResponse> => {
  const session = requireSession(event)
  const config  = useRuntimeConfig()

  let { username, displayName, email } = session

  const needsHeal = !displayName?.trim() || !email?.trim() || username === 'unknown'

  if (needsHeal) {
    try {
      const jmapSession = await discoverJmapSession(session.tokens.accessToken, username)
      const client      = await createJmapClient(session.tokens, jmapSession.apiUrl, event)
      const identities  = await getIdentities(client, jmapSession.accountId)
      const identity    = identities[0]

      if (identity) {
        username    = identity.email || username
        displayName = (identity.name || identity.email || username).trim()
        email       = identity.email || email

        setSessionCookie(event, {
          ...session,
          username,
          displayName,
          email,
          tokens: session.tokens,
        }, config.sessionSecret)
      }
    }
    catch {
      // Non-fatal — return whatever we have
    }
  }

  return {
    username:    username || 'user',
    displayName: (displayName || username || 'User').trim(),
    email:       (email || username || '').trim(),
  }
})
