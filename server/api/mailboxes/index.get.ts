import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { createJmapClient } from '../../services/jmap/client'
import { getMailboxes } from '../../services/jmap/mailbox'
import type { ApiMailboxesResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiMailboxesResponse> => {
  const session    = requireSession(event)
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username)
  const client     = await createJmapClient(session.tokens, jmapSession.apiUrl, event)
  const mailboxes  = await getMailboxes(client, jmapSession.accountId)
  return { mailboxes }
})
