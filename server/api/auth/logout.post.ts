import { clearSessionCookie } from '../../utils/auth'
import { invalidateJmapSession } from '../../services/jmap/session'
import { getSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const session = getSession(event)
  if (session) {
    await invalidateJmapSession(session.username)
  }
  clearSessionCookie(event)
  return { ok: true }
})
