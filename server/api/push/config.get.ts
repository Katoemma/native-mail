import { withJmap } from '../../utils/jmap-auth'
import { getVapidPublicKey } from '../../services/jmap/push'

export default defineEventHandler(async (event) => {
  return withJmap(event, async ({ jmapSession }) => {
    const applicationServerKey = getVapidPublicKey(jmapSession)
    if (!applicationServerKey) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Server does not advertise Web Push VAPID',
      })
    }

    const emailPush = 'urn:ietf:params:jmap:emailpush' in (jmapSession.capabilities ?? {})

    return {
      applicationServerKey,
      emailPush,
    }
  })
})
