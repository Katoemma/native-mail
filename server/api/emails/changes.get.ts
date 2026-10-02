import { getQuery, createError } from 'h3'
import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { createJmapClient } from '../../services/jmap/client'
import { getEmailChanges } from '../../services/jmap/email'
import type { EmailChangesResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<EmailChangesResponse> => {
  const session    = requireSession(event)
  const query      = getQuery(event)
  const sinceState = query.sinceState as string
  if (!sinceState) throw createError({ statusCode: 400, statusMessage: 'sinceState required' })

  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username)
  const client      = await createJmapClient(session.tokens, jmapSession.apiUrl, event)
  return await getEmailChanges(client, jmapSession.accountId, sinceState)
})
