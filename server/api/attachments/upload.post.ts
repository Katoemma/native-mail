import { readRawBody, getHeader, createError } from 'h3'
import { requireSession } from '../../utils/auth'
import { discoverJmapSession } from '../../services/jmap/session'
import { uploadAttachment } from '../../services/jmap/attachment'
import type { ApiUploadResponse } from '../../../shared/types'

export default defineEventHandler(async (event): Promise<ApiUploadResponse> => {
  const session     = requireSession(event)
  const raw         = await readRawBody(event)
  if (!raw) throw createError({ statusCode: 400, statusMessage: 'No file data' })

  const contentType = getHeader(event, 'content-type') ?? 'application/octet-stream'
  const name        = decodeURIComponent(getHeader(event, 'x-file-name') ?? 'attachment')

  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username)
  const result      = await uploadAttachment(
    session.tokens.accessToken,
    jmapSession,
    Buffer.from(raw),
    contentType,
    name,
  )
  return { blobId: result.blobId, name: result.name, size: result.size, type: result.type }
})
