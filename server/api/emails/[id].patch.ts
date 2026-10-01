import { readBody, createError } from 'h3'
import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { JmapClient } from '../../services/jmap/client'
import { setEmailKeyword, moveEmail } from '../../services/jmap/email'

interface PatchBody {
  read?: boolean
  starred?: boolean
  /** mailbox id to move into */
  mailboxId?: string
}

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody<PatchBody>(event)

  if (!body || Object.keys(body).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })
  }

  const jmapSession = await discoverJmapSession(session.basicAuth, session.username)
  const client = new JmapClient(jmapSession.apiUrl, session.basicAuth)
  const accountId = jmapSession.accountId

  if (body.read !== undefined) {
    await setEmailKeyword(client, accountId, id, '$seen', body.read)
  }
  if (body.starred !== undefined) {
    await setEmailKeyword(client, accountId, id, '$flagged', body.starred)
  }
  if (body.mailboxId !== undefined) {
    await moveEmail(client, accountId, id, body.mailboxId)
  }

  return { ok: true }
})
