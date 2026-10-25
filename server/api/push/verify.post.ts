import { readBody } from 'h3'
import { withJmap } from '../../utils/jmap-auth'
import { verifyPushSubscription } from '../../services/jmap/push'

interface VerifyBody {
  pushSubscriptionId?: string
  verificationCode?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<VerifyBody>(event)
  const pushSubscriptionId = body.pushSubscriptionId?.trim()
  const verificationCode = body.verificationCode?.trim()

  if (!pushSubscriptionId || !verificationCode) {
    throw createError({
      statusCode: 400,
      statusMessage: 'pushSubscriptionId and verificationCode are required',
    })
  }

  return withJmap(event, async ({ client }) => {
    await verifyPushSubscription(client, pushSubscriptionId, verificationCode)
    return { ok: true }
  })
})
