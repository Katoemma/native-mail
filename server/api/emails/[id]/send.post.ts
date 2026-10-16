import { requireSession } from '../../../utils/auth'
import { discoverJmapSession } from '../../../services/jmap/session'
import { createJmapClient } from '../../../services/jmap/client'
import { getIdentities } from '../../../services/jmap/identity'
import { getMailboxes } from '../../../services/jmap/mailbox'
import { submitEmail } from '../../../services/jmap/submission'
import type { ApiSendResponse } from '../../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiSendResponse> => {
  const session     = requireSession(event)
  const emailId     = getRouterParam(event, 'id')!
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username)
  const client      = await createJmapClient(session.tokens, jmapSession.apiUrl, event)

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
