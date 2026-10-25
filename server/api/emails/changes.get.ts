import { getQuery, createError } from 'h3'
import { withJmap } from '../../utils/jmap-auth'
import { getEmailChanges, getEmailList } from '../../services/jmap/email'
import type { EmailChangesResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<EmailChangesResponse> => {
  const query      = getQuery(event)
  const sinceState = query.sinceState as string
  if (!sinceState) throw createError({ statusCode: 400, statusMessage: 'sinceState required' })

  return withJmap(event, async ({ client, jmapSession }) => {
    const changes = await getEmailChanges(client, jmapSession.accountId, sinceState)

    const fetchIds = [...new Set([...changes.created, ...changes.updated])].slice(0, 50)
    const { emails } = fetchIds.length
      ? await getEmailList(client, jmapSession.accountId, fetchIds)
      : { emails: [] }

    return { ...changes, emails }
  })
})
