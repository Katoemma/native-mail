import { withJmap } from '../../../utils/jmap-auth'
import { getIdentities } from '../../../services/jmap/identity'
import { getMailboxes } from '../../../services/jmap/mailbox'
import { submitEmail } from '../../../services/jmap/submission'
import type { ApiSendResponse } from '../../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiSendResponse> => {
  const emailId = getRouterParam(event, 'id')!

  return withJmap(event, async ({ client, jmapSession }) => {
    const identities = await getIdentities(client, jmapSession.accountId)
    if (!identities.length)
      throw createError({ statusCode: 500, statusMessage: 'No sending identity found' })

    const mailboxes = await getMailboxes(client, jmapSession.accountId)
    const draftsMb  = mailboxes.find(m => m.role === 'drafts')
    const sentMb    = mailboxes.find(m => m.role === 'sent')
    if (!draftsMb) throw createError({ statusCode: 500, statusMessage: 'Drafts mailbox not found' })
    if (!sentMb)   throw createError({ statusCode: 500, statusMessage: 'Sent mailbox not found' })

    const submissionId = await submitEmail(
      client,
      jmapSession.accountId,
      emailId,
      identities[0].id,
      draftsMb.id,
      sentMb.id,
    )
    return { submissionId, emailId }
  })
})
