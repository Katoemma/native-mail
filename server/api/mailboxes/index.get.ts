import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { JmapClient } from '../../services/jmap/client'
import { getMailboxes } from '../../services/jmap/mailbox'
import type { ApiMailboxesResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiMailboxesResponse> => {
  const session = requireSession(event)
  const jmapSession = await discoverJmapSession(session.basicAuth, session.username)
  const client = new JmapClient(jmapSession.apiUrl, session.basicAuth)
  const mailboxes = await getMailboxes(client, jmapSession.accountId)
  return { mailboxes }
})
