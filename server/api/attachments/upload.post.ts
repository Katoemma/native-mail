import { readRawBody, getHeader, createError } from 'h3'
import { withJmap } from '../../utils/jmap-auth'
import { uploadAttachment } from '../../services/jmap/attachment'
import type { ApiUploadResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiUploadResponse> => {
  // encoding=false keeps raw bytes — default utf8 corrupts JPEG/PDF/etc.
  const raw = await readRawBody(event, false)
  if (!raw?.length) throw createError({ statusCode: 400, statusMessage: 'No file data' })

  const contentType = getHeader(event, 'content-type') ?? 'application/octet-stream'
  const name        = decodeURIComponent(getHeader(event, 'x-file-name') ?? 'attachment')

  return withJmap(event, async ({ jmapSession, accessToken }) => {
    const result = await uploadAttachment(
      accessToken,
      jmapSession,
      Buffer.isBuffer(raw) ? raw : Buffer.from(raw),
      contentType,
      name,
    )
    return { blobId: result.blobId, name: result.name, size: result.size, type: result.type }
  })
})
