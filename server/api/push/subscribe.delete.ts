import { getQuery } from 'h3'
import { withJmap } from '../../utils/jmap-auth'
import { destroyPushSubscription } from '../../services/jmap/push'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = typeof query.id === 'string' ? query.id.trim() : ''

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'id is required',
    })
  }

  return withJmap(event, async ({ client }) => {
    await destroyPushSubscription(client, id)
    return { ok: true }
  })
})
