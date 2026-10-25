import { withJmap } from '../../utils/jmap-auth'
import { getIdentities } from '../../services/jmap/identity'
import type { Identity } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<{ identities: Identity[] }> => {
  return withJmap(event, async ({ client, jmapSession }) => {
    const identities = await getIdentities(client, jmapSession.accountId)
    return { identities }
  })
})
