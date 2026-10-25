import { getQuery, getRouterParam, setHeader, createError } from 'h3'
import { withJmap } from '../../utils/jmap-auth'
import { downloadAttachment } from '../../services/jmap/attachment'

/**
 * Proxy attachment downloads through the BFF.
 * Browser uses the session cookie — no extra Stalwart login prompt.
 */
export default defineEventHandler(async (event) => {
  const blobId = getRouterParam(event, 'blobId')
  if (!blobId) throw createError({ statusCode: 400, statusMessage: 'blobId required' })

  const query  = getQuery(event)
  const name   = typeof query.name === 'string' && query.name ? query.name : 'attachment'
  const inline = query.inline === '1' || query.inline === 'true'

  return withJmap(event, async ({ jmapSession, accessToken }) => {
    const { data, contentType } = await downloadAttachment(
      accessToken,
      jmapSession,
      decodeURIComponent(blobId),
      name,
    )

    const asciiName = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
    const disposition = inline || contentType.startsWith('image/') ? 'inline' : 'attachment'
    setHeader(event, 'Content-Type', contentType)
    setHeader(
      event,
      'Content-Disposition',
      `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    )
    setHeader(event, 'Content-Length', String(data.length))
    setHeader(event, 'Cache-Control', 'private, no-store')

    return data
  })
})
