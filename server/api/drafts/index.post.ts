import { readBody, createError } from 'h3'
import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { JmapClient } from '../../services/jmap/client'
import { createDraft } from '../../services/jmap/email'
import { getMailboxes } from '../../services/jmap/mailbox'
import type { DraftPayload } from '../../../shared/types'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const body = await readBody<DraftPayload>(event)

  if (!body) throw createError({ statusCode: 400, statusMessage: 'Body required' })

  const jmapSession = await discoverJmapSession(session.basicAuth, session.username)
  const client = new JmapClient(jmapSession.apiUrl, session.basicAuth)

  // Resolve drafts mailbox ID
  const mailboxes = await getMailboxes(client, jmapSession.accountId)
  const draftsMb = mailboxes.find(m => m.role === 'drafts')
  if (!draftsMb) throw createError({ statusCode: 500, statusMessage: 'Drafts mailbox not found' })

  const emailId = await createDraft(client, jmapSession.accountId, draftsMb.id, {
    to: body.to,
    cc: body.cc,
    bcc: body.bcc,
    subject: body.subject,
    textBody: body.textBody,
    htmlBody: body.htmlBody,
    attachmentBlobIds: body.attachmentBlobIds,
    inReplyToEmailId: body.inReplyToEmailId,
    threadId: body.threadId,
    references: body.threadId ? undefined : undefined,
    inReplyTo: body.inReplyToEmailId ? `<${body.inReplyToEmailId}>` : undefined,
  })

  return { emailId }
})
