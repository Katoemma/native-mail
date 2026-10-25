import { readBody } from 'h3'
import { withJmap } from '../../utils/jmap-auth'
import { createPushSubscription } from '../../services/jmap/push'

interface SubscribeBody {
  deviceClientId?: string
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
  expires?: string | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SubscribeBody>(event)

  const deviceClientId = body.deviceClientId?.trim()
  const endpoint = body.endpoint?.trim()
  const p256dh = body.keys?.p256dh?.trim()
  const auth = body.keys?.auth?.trim()

  if (!deviceClientId || !endpoint || !p256dh || !auth) {
    throw createError({
      statusCode: 400,
      statusMessage: 'deviceClientId, endpoint, and keys (p256dh, auth) are required',
    })
  }

  if (!endpoint.startsWith('https://')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Push endpoint must be https',
    })
  }

  return withJmap(event, async ({ client, jmapSession }) => {
    const { id } = await createPushSubscription(client, jmapSession, {
      deviceClientId,
      url: endpoint,
      keys: { p256dh, auth },
      expires: body.expires ?? null,
    })
    return { id }
  })
})
