import { JmapClient } from './client'
import { buildUploadUrl } from './session'
import type { JmapSession } from '../../../shared/types'

export interface UploadResult {
  blobId: string
  size: number
  type: string
  name: string
}

export async function uploadAttachment(
  basicAuth: string,
  session: JmapSession,
  data: Buffer | Uint8Array,
  contentType: string,
  name: string,
): Promise<UploadResult> {
  const uploadUrl = buildUploadUrl(session)

  const raw = await $fetch<{
    blobId: string
    size: number
    type: string
  }>(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': contentType,
      'X-JMAP-FileName': encodeURIComponent(name),
    },
    body: data,
  })

  return { blobId: raw.blobId, size: raw.size, type: raw.type ?? contentType, name }
}
