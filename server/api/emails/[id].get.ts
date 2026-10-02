import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { createJmapClient } from '../../services/jmap/client'
import { getEmailFull } from '../../services/jmap/email'
import type { ApiEmailResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiEmailResponse> => {
  const session     = requireSession(event)
  const id          = getRouterParam(event, 'id')!
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username)
  const client      = await createJmapClient(session.tokens, jmapSession.apiUrl, event)
  const email       = await getEmailFull(client, jmapSession.accountId, id, jmapSession)
  return { email }
})
