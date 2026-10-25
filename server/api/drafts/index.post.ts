import { readBody, createError } from 'h3'
import { withJmap } from '../../utils/jmap-auth'
import { createDraft, getEmailFull } from '../../services/jmap/email'
import { getMailboxes } from '../../services/jmap/mailbox'
import { getIdentities } from '../../services/jmap/identity'
import type { DraftPayload } from '../../../shared/types'

export default defineEventHandler(async (event) => {
  const body = await readBody<DraftPayload>(event)
  if (!body) throw createError({ statusCode: 400, statusMessage: 'Body required' })

  return withJmap(event, async ({ client, jmapSession }) => {
    const identities = await getIdentities(client, jmapSession.accountId)
    if (!identities.length)
      throw createError({ statusCode: 500, statusMessage: 'No sending identity found' })
    const identity = identities[0]

    const mailboxes = await getMailboxes(client, jmapSession.accountId)
    const draftsMb  = mailboxes.find(m => m.role === 'drafts')
    if (!draftsMb) throw createError({ statusCode: 500, statusMessage: 'Drafts mailbox not found' })

    let inReplyTo: string | undefined
    let references: string | undefined

    if (body.inReplyToEmailId) {
      try {
        const original = await getEmailFull(client, jmapSession.accountId, body.inReplyToEmailId)
        const msgId = original.messageId

        if (msgId) {
          inReplyTo  = msgId
          const originalRefs = original.references ?? ''
          references = originalRefs ? `${originalRefs} ${msgId}` : msgId
        }
      }
      catch {
        // Non-fatal
      }
    }

    const emailId = await createDraft(client, jmapSession.accountId, draftsMb.id, {
      from:             { name: identity.name, email: identity.email },
      to:               body.to,
      cc:               body.cc,
      bcc:              body.bcc,
      subject:          body.subject,
      textBody:         body.textBody,
      htmlBody:         body.htmlBody,
      attachments:      body.attachments ?? [],
      inReplyToEmailId: body.inReplyToEmailId,
      inReplyTo,
      references,
    })

    return { emailId }
  })
})
