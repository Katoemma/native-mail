import { withJmap } from '../../utils/jmap-auth'
import { destroyEmail } from '../../services/jmap/email'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  return withJmap(event, async ({ client, jmapSession }) => {
    await destroyEmail(client, jmapSession.accountId, id)
    return { ok: true }
  })
})
