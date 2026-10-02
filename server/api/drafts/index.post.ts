import { readBody, createError } from 'h3'
import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { createJmapClient } from '../../services/jmap/client'
import { createDraft, getEmailFull } from '../../services/jmap/email'
import { getMailboxes } from '../../services/jmap/mailbox'
import { getIdentities } from '../../services/jmap/identity'
import type { DraftPayload } from '../../../shared/types'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const body    = await readBody<DraftPayload>(event)
  if (!body) throw createError({ statusCode: 400, statusMessage: 'Body required' })

  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username)
  const client      = await createJmapClient(session.tokens, jmapSession.apiUrl, event)

  // Sending identity — sets the From: header
  const identities = await getIdentities(client, jmapSession.accountId)
  if (!identities.length)
    throw createError({ statusCode: 500, statusMessage: 'No sending identity found' })
  const identity = identities[0]

  // Drafts mailbox
  const mailboxes = await getMailboxes(client, jmapSession.accountId)
  const draftsMb  = mailboxes.find(m => m.role === 'drafts')
  if (!draftsMb) throw createError({ statusCode: 500, statusMessage: 'Drafts mailbox not found' })

  // --- Build In-Reply-To and References headers for replies ---
  // We need the RFC 2822 Message-ID of the original email, not its JMAP id.
  // Stalwart uses these headers to assign the reply to the correct thread.
  let inReplyTo: string | undefined
  let references: string | undefined

  if (body.inReplyToEmailId) {
    try {
      const original = await getEmailFull(client, jmapSession.accountId, body.inReplyToEmailId, jmapSession)
      const msgId = original.messageId  // e.g. "<abc123@mail.example.com>"

      if (msgId) {
        inReplyTo  = msgId
        // References = original References + original Message-ID
        const originalRefs = original.references ?? ''
        references = originalRefs ? `${originalRefs} ${msgId}` : msgId
      }
    }
    catch {
      // Non-fatal — send without threading headers if we can't fetch the original
    }
  }

  const emailId = await createDraft(client, jmapSession.accountId, draftsMb.id, {
    from:              { name: identity.name, email: identity.email },
    to:                body.to,
    cc:                body.cc,
    bcc:               body.bcc,
    subject:           body.subject,
    textBody:          body.textBody,
    htmlBody:          body.htmlBody,
    attachmentBlobIds: body.attachmentBlobIds,
    inReplyToEmailId:  body.inReplyToEmailId,
    inReplyTo,
    references,
  })

  return { emailId }
})
