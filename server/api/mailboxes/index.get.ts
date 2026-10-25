import { withJmap } from '../../utils/jmap-auth'
import { getMailboxes } from '../../services/jmap/mailbox'
import type { ApiMailboxesResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiMailboxesResponse> => {
  return withJmap(event, async ({ client, jmapSession }) => {
    const mailboxes = await getMailboxes(client, jmapSession.accountId)
    return { mailboxes }
  })
})
