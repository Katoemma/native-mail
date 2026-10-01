import { readBody, createError } from 'h3'
import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { JmapClient } from '../../services/jmap/client'
import { updateDraft } from '../../services/jmap/email'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody<Record<string, unknown>>(event)

  if (!body) throw createError({ statusCode: 400, statusMessage: 'Body required' })

  const jmapSession = await discoverJmapSession(session.basicAuth, session.username)
  const client = new JmapClient(jmapSession.apiUrl, session.basicAuth)

  await updateDraft(client, jmapSession.accountId, id, body)
  return { ok: true }
})
