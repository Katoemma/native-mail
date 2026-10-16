import { getQuery, createError } from 'h3'
import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { createJmapClient } from '../../services/jmap/client'
import { getEmailChanges, getEmailList } from '../../services/jmap/email'
import type { EmailChangesResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<EmailChangesResponse> => {
  const session    = requireSession(event)
  const query      = getQuery(event)
  const sinceState = query.sinceState as string
  if (!sinceState) throw createError({ statusCode: 400, statusMessage: 'sinceState required' })

  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username)
  const client      = await createJmapClient(session.tokens, jmapSession.apiUrl, event)
  const changes     = await getEmailChanges(client, jmapSession.accountId, sinceState)

  // Fetch list-view data for new/updated emails so the client can patch
  // the UI without reloading the whole mailbox.
  const fetchIds = [...new Set([...changes.created, ...changes.updated])].slice(0, 50)
  const { emails } = fetchIds.length
    ? await getEmailList(client, jmapSession.accountId, fetchIds)
    : { emails: [] }

  return { ...changes, emails }
})
