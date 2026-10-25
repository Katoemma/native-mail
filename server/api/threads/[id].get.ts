import { withJmap } from '../../utils/jmap-auth'
import { getThreads } from '../../services/jmap/thread'
import { getEmailList } from '../../services/jmap/email'
import type { ApiThreadResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiThreadResponse> => {
  const id = getRouterParam(event, 'id')!

  return withJmap(event, async ({ client, jmapSession }) => {
    const threads = await getThreads(client, jmapSession.accountId, [id])
    const thread  = threads[0]
    if (!thread) throw createError({ statusCode: 404, statusMessage: 'Thread not found' })

    const { emails } = await getEmailList(client, jmapSession.accountId, thread.emailIds)
    return { thread, emails }
  })
})
