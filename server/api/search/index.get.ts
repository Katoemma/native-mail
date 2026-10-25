import { getQuery, createError } from 'h3'
import { withJmap } from '../../utils/jmap-auth'
import { getEmailList } from '../../services/jmap/email'
import type { ApiSearchResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiSearchResponse> => {
  const query = getQuery(event)
  const q     = (query.q as string ?? '').trim()
  const limit = Math.min(Number(query.limit ?? 50), 100)

  if (!q) throw createError({ statusCode: 400, statusMessage: 'Query parameter q is required' })

  return withJmap(event, async ({ client, jmapSession }) => {
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
    const { emails } = await getEmailList(client, jmapSession.accountId, args.ids ?? [])
    return { emails, total: args.total ?? 0 }
  })
})
