import { getQuery, createError } from 'h3'
import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { JmapClient } from '../../services/jmap/client'
import { queryEmails, getEmailList } from '../../services/jmap/email'
import { getMailboxes } from '../../services/jmap/mailbox'
import type { ApiEmailsResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiEmailsResponse> => {
  const session = requireSession(event)
  const query = getQuery(event)

  const mailboxRole = (query.mailbox as string) ?? 'inbox'
  const position = Number(query.position ?? 0)
  const limit = Math.min(Number(query.limit ?? 50), 100)

  const jmapSession = await discoverJmapSession(session.basicAuth, session.username)
  const client = new JmapClient(jmapSession.apiUrl, session.basicAuth)

  // Resolve mailbox ID from role or raw ID
  let mailboxId = mailboxRole
  if (!mailboxRole.match(/^[a-z0-9_-]{1,32}$/) || mailboxRole.length < 10) {
    // Looks like a role name — resolve to ID
    const mailboxes = await getMailboxes(client, jmapSession.accountId)
    const mb = mailboxes.find(m => m.role === mailboxRole || m.id === mailboxRole)
    if (!mb) throw createError({ statusCode: 404, statusMessage: `Mailbox "${mailboxRole}" not found` })
    mailboxId = mb.id
  }

  const { ids, total, queryState } = await queryEmails(
    client, jmapSession.accountId, mailboxId, position, limit,
  )

  const emails = await getEmailList(client, jmapSession.accountId, ids)

  return { emails, total, position, queryState }
})
