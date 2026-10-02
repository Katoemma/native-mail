import { getQuery, createError } from 'h3'
import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { JmapClient } from '../../services/jmap/client'
import { getEmailList } from '../../services/jmap/email'
import type { ApiSearchResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiSearchResponse> => {
  const session = requireSession(event)
  const query = getQuery(event)
  const q = (query.q as string ?? '').trim()
  const limit = Math.min(Number(query.limit ?? 50), 100)

  if (!q) throw createError({ statusCode: 400, statusMessage: 'Query parameter q is required' })

  const jmapSession = await discoverJmapSession(session.basicAuth, session.username)
  const client = new JmapClient(jmapSession.apiUrl, session.basicAuth)

  const response = await client.request([
    [
      'Email/query',
      {
        accountId: jmapSession.accountId,
        filter: { text: q },
        sort: [{ property: 'receivedAt', isAscending: false }],
        position: 0,
        limit,
        calculateTotal: true,
      },
      'search',
    ],
  ])

  const args = client.getResponse<{ ids: string[]; total: number }>(response, 'search')
  const emails = await getEmailList(client, jmapSession.accountId, args.ids ?? [])

  return { emails, total: args.total ?? 0 }
})
