import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { JmapClient } from '../../services/jmap/client'
import { getThreads } from '../../services/jmap/thread'
import { getEmailList } from '../../services/jmap/email'
import type { ApiThreadResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiThreadResponse> => {
  const session = requireSession(event)
  const id = getRouterParam(event, 'id')!

  const jmapSession = await discoverJmapSession(session.basicAuth, session.username)
  const client = new JmapClient(jmapSession.apiUrl, session.basicAuth)

  const threads = await getThreads(client, jmapSession.accountId, [id])
  const thread = threads[0]
  if (!thread) throw createError({ statusCode: 404, statusMessage: 'Thread not found' })

  const emails = await getEmailList(client, jmapSession.accountId, thread.emailIds)
  return { thread, emails }
})
