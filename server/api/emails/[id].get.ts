import { withJmap } from '../../utils/jmap-auth'
import { getEmailFull } from '../../services/jmap/email'
import type { ApiEmailResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiEmailResponse> => {
  const id = getRouterParam(event, 'id')!

  return withJmap(event, async ({ client, jmapSession }) => {
    const email = await getEmailFull(client, jmapSession.accountId, id)
    return { email }
  })
})
