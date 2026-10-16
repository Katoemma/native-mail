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
  const email       = await getEmailFull(client, jmapSession.accountId, id)

  // Temporary debug — remove after confirming body arrives
  console.log('[email/get] id:', id)
  console.log('[email/get] htmlBody length:', email.htmlBody?.length ?? 'null')
  console.log('[email/get] textBody length:', email.textBody?.length ?? 'null')
  console.log('[email/get] attachments:', email.attachments.length)

  return { email }
})
