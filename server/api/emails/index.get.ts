import { getQuery, createError } from 'h3'
import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { createJmapClient } from '../../services/jmap/client'
import { queryEmails, getEmailList } from '../../services/jmap/email'
import { getMailboxes } from '../../services/jmap/mailbox'
import type { ApiEmailsResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiEmailsResponse> => {
  const session  = requireSession(event)
  const query    = getQuery(event)
  const mailboxRole = (query.mailbox as string) ?? 'inbox'
  const position    = Number(query.position ?? 0)
  const limit       = Math.min(Number(query.limit ?? 50), 100)

  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username)
  const client      = await createJmapClient(session.tokens, jmapSession.apiUrl, event)

  // Resolve mailbox role → id
  const mailboxes = await getMailboxes(client, jmapSession.accountId)
  const mb = mailboxes.find(m => m.role === mailboxRole || m.id === mailboxRole)
  if (!mb) throw createError({ statusCode: 404, statusMessage: `Mailbox "${mailboxRole}" not found` })

  const { ids, total, queryState } = await queryEmails(
    client, jmapSession.accountId, mb.id, position, limit,
  )
  const emails = await getEmailList(client, jmapSession.accountId, ids)
  return { emails, total, position, queryState }
})
