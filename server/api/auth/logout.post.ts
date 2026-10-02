import { clearSessionCookie, getSession } from '../../utils/auth'
import { invalidateJmapSession } from '../../services/jmap/session'

export default defineEventHandler(async (event) => {
  const session = getSession(event)
  if (session) {
    await invalidateJmapSession(session.username)
  }
  clearSessionCookie(event)
  return { ok: true }
})
