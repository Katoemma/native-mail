import { readBody, createError } from 'h3'
import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { createJmapClient } from '../../services/jmap/client'
import { updateDraft } from '../../services/jmap/email'

export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const id      = getRouterParam(event, 'id')!
  const body    = await readBody<Record<string, unknown>>(event)
  if (!body) throw createError({ statusCode: 400, statusMessage: 'Body required' })

  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username)
  const client      = await createJmapClient(session.tokens, jmapSession.apiUrl, event)
  await updateDraft(client, jmapSession.accountId, id, body)
  return { ok: true }
})
