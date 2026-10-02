import { getSession, clearSessionCookie } from '../../utils/auth'
import { revokeToken } from '../../services/stalwart/oauth'
import { invalidateJmapSession } from '../../services/jmap/session'

export default defineEventHandler(async (event) => {
  const config  = useRuntimeConfig()
  const session = getSession(event)

  if (session) {
    // Revoke both access and refresh tokens with Stalwart
    if (session.tokens.accessToken) {
      await revokeToken({
        baseUrl:      config.jmapBaseUrl,
        clientId:     config.oauthClientId,
        clientSecret: config.oauthClientSecret,
        token:        session.tokens.accessToken,
      })
    }
    if (session.tokens.refreshToken) {
      await revokeToken({
        baseUrl:      config.jmapBaseUrl,
        clientId:     config.oauthClientId,
        clientSecret: config.oauthClientSecret,
        token:        session.tokens.refreshToken,
      })
    }
    // Evict cached JMAP session
    await invalidateJmapSession(session.username)
  }

  clearSessionCookie(event)
  return { ok: true }
})
