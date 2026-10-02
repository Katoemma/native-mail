import { readBody, createError } from 'h3'
import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { createJmapClient } from '../../services/jmap/client'
import { createDraft } from '../../services/jmap/email'
import { getMailboxes } from '../../services/jmap/mailbox'
import { getIdentities } from '../../services/jmap/identity'
import type { DraftPayload } from '../../../shared/types'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const body    = await readBody<DraftPayload>(event)
  if (!body) throw createError({ statusCode: 400, statusMessage: 'Body required' })

  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username)
  const client      = await createJmapClient(session.tokens, jmapSession.apiUrl, event)

  // Get the user's sending identity so From: is set correctly
  const identities = await getIdentities(client, jmapSession.accountId)
  if (!identities.length) {
    throw createError({ statusCode: 500, statusMessage: 'No sending identity found' })
  }
  const identity = identities[0]

  const mailboxes = await getMailboxes(client, jmapSession.accountId)
  const draftsMb  = mailboxes.find(m => m.role === 'drafts')
  if (!draftsMb) throw createError({ statusCode: 500, statusMessage: 'Drafts mailbox not found' })

  const emailId = await createDraft(client, jmapSession.accountId, draftsMb.id, {
    from:               { name: identity.name, email: identity.email },
    to:                 body.to,
    cc:                 body.cc,
    bcc:                body.bcc,
    subject:            body.subject,
    textBody:           body.textBody,
    htmlBody:           body.htmlBody,
    attachmentBlobIds:  body.attachmentBlobIds,
    inReplyToEmailId:   body.inReplyToEmailId,
    threadId:           body.threadId,
    inReplyTo:          body.inReplyToEmailId ? `<${body.inReplyToEmailId}>` : undefined,
  })

  return { emailId }
})
