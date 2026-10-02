import type { JmapSession } from '../../../shared/types'
import { JmapError } from '../../utils/jmap-error'

/**
 * Discovers the JMAP session from /.well-known/jmap using a Bearer token.
 *
 * Results are cached in Nitro's in-memory storage keyed by username.
 */
export async function discoverJmapSession(
  accessToken: string,
  username: string,
): Promise<JmapSession> {
  const storage    = useStorage('session-cache')
  const cacheKey   = `jmap-session:${username}`
  const cached     = await storage.getItem<JmapSession>(cacheKey)
  if (cached) return cached

  const config         = useRuntimeConfig()
  const discoveryUrl   = `${config.jmapBaseUrl}/.well-known/jmap`

  let raw: unknown
  try {
    raw = await $fetch<unknown>(discoveryUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
  }
  catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 401) {
      throw new JmapError('authenticationFailed', 'Bearer token rejected by Stalwart', undefined, 401)
    }
    throw new JmapError('serverFail', `JMAP discovery failed: ${String(err)}`, undefined, 503)
  }

  const data = raw as {
    apiUrl?: string
    uploadUrl?: string
    downloadUrl?: string
    eventSourceUrl?: string
    primaryAccounts?: Record<string, string>
    capabilities?: Record<string, unknown>
  }

  const accountId = data.primaryAccounts?.['urn:ietf:params:jmap:mail']
  if (!accountId) {
    throw new JmapError('accountNotFound', 'Could not determine JMAP account ID from session')
  }

  const session: JmapSession = {
    apiUrl:         data.apiUrl         ?? `${config.jmapBaseUrl}/jmap/`,
    uploadUrl:      data.uploadUrl      ?? `${config.jmapBaseUrl}/jmap/upload/{accountId}/`,
    downloadUrl:    data.downloadUrl    ?? `${config.jmapBaseUrl}/jmap/download/{accountId}/{blobId}/{name}`,
    eventSourceUrl: data.eventSourceUrl ?? `${config.jmapBaseUrl}/jmap/eventsource/`,
    accountId,
    capabilities: data.capabilities ?? {},
  }

  await storage.setItem(cacheKey, session)
  return session
}

export async function invalidateJmapSession(username: string): Promise<void> {
  const storage = useStorage('session-cache')
  await storage.removeItem(`jmap-session:${username}`)
}

export function buildDownloadUrl(session: JmapSession, blobId: string, name: string): string {
  return session.downloadUrl
    .replace('{accountId}', session.accountId)
    .replace('{blobId}',    encodeURIComponent(blobId))
    .replace('{name}',      encodeURIComponent(name))
}

export function buildUploadUrl(session: JmapSession): string {
  return session.uploadUrl.replace('{accountId}', session.accountId)
}
