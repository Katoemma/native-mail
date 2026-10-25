import { readBody, createError } from 'h3'
import { withJmap } from '../../utils/jmap-auth'
import { updateDraft } from '../../services/jmap/email'

export default defineEventHandler(async (event) => {
  const id   = getRouterParam(event, 'id')!
  const body = await readBody<Record<string, unknown>>(event)
  if (!body) throw createError({ statusCode: 400, statusMessage: 'Body required' })

  return withJmap(event, async ({ client, jmapSession }) => {
    await updateDraft(client, jmapSession.accountId, id, body)
    return { ok: true }
  })
})
