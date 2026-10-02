import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { createJmapClient } from '../../services/jmap/client'
import { destroyEmail } from '../../services/jmap/email'

export default defineEventHandler(async (event) => {
  const session     = requireSession(event)
  const id          = getRouterParam(event, 'id')!
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username)
  const client      = await createJmapClient(session.tokens, jmapSession.apiUrl, event)
  await destroyEmail(client, jmapSession.accountId, id)
  return { ok: true }
})
