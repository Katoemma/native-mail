import { getQuery, createError } from 'h3'
import { withJmap } from '../../utils/jmap-auth'
import { queryEmails, getEmailList } from '../../services/jmap/email'
import { getMailboxes } from '../../services/jmap/mailbox'
import type { ApiEmailsResponse } from '../../../shared/types'

/** Virtual views that are not real JMAP mailboxes */
const VIRTUAL_VIEWS = new Set(['starred'])

export default defineEventHandler(async (event): Promise<ApiEmailsResponse> => {
  const query       = getQuery(event)
  const mailboxRole = (query.mailbox as string) ?? 'inbox'
  const position    = Number(query.position ?? 0)
  const limit       = Math.min(Number(query.limit ?? 20), 100)

  return withJmap(event, async ({ client, jmapSession }) => {
    let ids: string[]
    let total: number
    let queryState: string

    if (VIRTUAL_VIEWS.has(mailboxRole) || mailboxRole === 'starred') {
      ;({ ids, total, queryState } = await queryEmails(
        client,
        jmapSession.accountId,
        { hasKeyword: '$flagged' },
        position,
        limit,
      ))
    }
    else {
      const mailboxes = await getMailboxes(client, jmapSession.accountId)
      const mb = mailboxes.find(m => m.role === mailboxRole || m.id === mailboxRole)
      if (!mb) throw createError({ statusCode: 404, statusMessage: `Mailbox "${mailboxRole}" not found` })

      ;({ ids, total, queryState } = await queryEmails(
        client, jmapSession.accountId, mb.id, position, limit,
      ))
    }

    const { emails, state: emailState } = await getEmailList(client, jmapSession.accountId, ids)
    return { emails, total, position, queryState, emailState }
  })
})
