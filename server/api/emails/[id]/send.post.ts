import { requireSession } from '../../../utils/auth'
import { discoverJmapSession } from '../../../services/jmap/session'
import { JmapClient } from '../../../services/jmap/client'
import { getIdentities } from '../../../services/jmap/identity'
import { submitEmail } from '../../../services/jmap/submission'
import type { ApiSendResponse } from '../../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiSendResponse> => {
  const session = requireSession(event)
  const emailId = getRouterParam(event, 'id')!

  const jmapSession = await discoverJmapSession(session.basicAuth, session.username)
  const client = new JmapClient(jmapSession.apiUrl, session.basicAuth)

  // Get the user's primary identity
  const identities = await getIdentities(client, jmapSession.accountId)
  if (!identities.length) {
    throw createError({ statusCode: 500, statusMessage: 'No sending identity found' })
  }
  const identity = identities[0]

  const submissionId = await submitEmail(client, jmapSession.accountId, emailId, identity.id)
  return { submissionId, emailId }
})
