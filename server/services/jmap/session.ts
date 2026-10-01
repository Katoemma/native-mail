import type { JmapSession } from '../../../shared/types'
import { JmapError } from '../../utils/jmap-error'

/**
 * Discovers the JMAP session from /.well-known/jmap.
 *
 * The discovery URL is always hard-coded to the base URL; only the
 * returned apiUrl / uploadUrl / downloadUrl / eventSourceUrl are used
 * going forward. This avoids hard-coding internal Stalwart paths.
 *
 * Results are cached in Nitro's in-memory storage keyed by username
 * so repeated requests within a server process don't re-discover.
 */
export async function discoverJmapSession(basicAuth: string, username: string): Promise<JmapSession> {
  const storage = useStorage('session-cache')
  const cacheKey = `jmap-session:${username}`

  const cached = await storage.getItem<JmapSession>(cacheKey)
  if (cached) return cached

  const config = useRuntimeConfig()
  const discoveryUrl = `${config.jmapBaseUrl}/.well-known/jmap`

  let raw: unknown
  try {
    raw = await $fetch<unknown>(discoveryUrl, {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
      },
    })
  }
  catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 401) {
      throw new JmapError('authenticationFailed', 'Invalid credentials', undefined, 401)
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
    throw new JmapError('accountNotFound', 'Could not determine JMAP account ID')
  }

  const session: JmapSession = {
    apiUrl: data.apiUrl ?? `${config.jmapBaseUrl}/jmap/`,
    uploadUrl: data.uploadUrl ?? `${config.jmapBaseUrl}/jmap/upload/{accountId}/`,
    downloadUrl: data.downloadUrl ?? `${config.jmapBaseUrl}/jmap/download/{accountId}/{blobId}/{name}`,
    eventSourceUrl: data.eventSourceUrl ?? `${config.jmapBaseUrl}/jmap/eventsource/`,
    accountId,
    capabilities: data.capabilities ?? {},
  }

  // Cache for 1 hour (Nitro in-memory default)
  await storage.setItem(cacheKey, session)

  return session
}

/** Invalidates the cached session for a user (e.g. on logout). */
export async function invalidateJmapSession(username: string): Promise<void> {
  const storage = useStorage('session-cache')
  await storage.removeItem(`jmap-session:${username}`)
}

/** Builds the attachment download URL from the session template. */
export function buildDownloadUrl(
  session: JmapSession,
  blobId: string,
  name: string,
): string {
  return session.downloadUrl
    .replace('{accountId}', session.accountId)
    .replace('{blobId}', encodeURIComponent(blobId))
    .replace('{name}', encodeURIComponent(name))
}

/** Builds the attachment upload URL from the session template. */
export function buildUploadUrl(session: JmapSession): string {
  return session.uploadUrl.replace('{accountId}', session.accountId)
}
