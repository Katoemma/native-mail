import { buildDownloadUrl, buildUploadUrl } from './session'
import type { JmapSession } from '../../../shared/types'

export interface UploadResult {
  blobId: string
  size: number
  type: string
  name: string
}

export interface DownloadResult {
  data: Buffer
  contentType: string
  name: string
}

export async function uploadAttachment(
  accessToken: string,
  session: JmapSession,
  data: Buffer | Uint8Array,
  contentType: string,
  name: string,
): Promise<UploadResult> {
  const uploadUrl = buildUploadUrl(session)
  // Native fetch + Uint8Array — ofetch can coerce Buffers incorrectly
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': contentType,
      'X-JMAP-FileName': encodeURIComponent(name),
      'Content-Length': String(bytes.byteLength),
    },
    body: bytes,
  })

  if (!res.ok) {
    throw createError({
      statusCode: res.status === 401 || res.status === 403 ? 401 : 502,
      statusMessage: `Attachment upload failed (${res.status})`,
    })
  }

  const raw = await res.json() as { blobId: string; size: number; type?: string }
  return { blobId: raw.blobId, size: raw.size, type: raw.type ?? contentType, name }
}

/** Fetch a blob from Stalwart using the user's Bearer token (server-side only). */
export async function downloadAttachment(
  accessToken: string,
  session: JmapSession,
  blobId: string,
  name: string,
): Promise<DownloadResult> {
  const url = buildDownloadUrl(session, blobId, name)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw createError({
      statusCode: res.status === 401 || res.status === 403 ? 401 : 502,
      statusMessage: `Attachment download failed (${res.status})`,
    })
  }

  const data = Buffer.from(await res.arrayBuffer())
  return {
    data,
    contentType: res.headers.get('content-type') ?? 'application/octet-stream',
    name,
  }
}

/** Browser-facing download URL — goes through our BFF so the session cookie auth works. */
export function buildClientDownloadUrl(blobId: string, name: string): string {
  const params = new URLSearchParams({ name })
  return `/api/attachments/${encodeURIComponent(blobId)}?${params.toString()}`
}
