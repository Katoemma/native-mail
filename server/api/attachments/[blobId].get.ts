import { getQuery, getRouterParam, setHeader, createError } from 'h3'
import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { resolveAccessToken } from '../../services/jmap/client'
import { downloadAttachment } from '../../services/jmap/attachment'

/**
 * Proxy attachment downloads through the BFF.
 * Browser uses the session cookie — no extra Stalwart login prompt.
 */
export default defineEventHandler(async (event) => {
  const session = requireSession(event)
  const blobId  = getRouterParam(event, 'blobId')
  if (!blobId) throw createError({ statusCode: 400, statusMessage: 'blobId required' })

  const query = getQuery(event)
  const name  = typeof query.name === 'string' && query.name ? query.name : 'attachment'

  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username)
  const accessToken = await resolveAccessToken(session.tokens, event)

  const { data, contentType } = await downloadAttachment(
    accessToken,
    jmapSession,
    decodeURIComponent(blobId),
    name,
  )

  // Safe filename for Content-Disposition (ASCII fallback + UTF-8 filename*)
  const asciiName = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  setHeader(event, 'Content-Type', contentType)
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
  )
  setHeader(event, 'Content-Length', String(data.length))
  setHeader(event, 'Cache-Control', 'private, no-store')

  return data
})
