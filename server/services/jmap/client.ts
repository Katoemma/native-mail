import { JmapError, extractJmapError } from '../../utils/jmap-error'
import type { H3Event } from 'h3'
import type { OAuthTokens } from '../../../shared/types'
import { isTokenExpired, refreshAccessToken } from '../stalwart/oauth'
import { refreshSessionTokens } from '../../utils/auth'

const JMAP_USING = [
  'urn:ietf:params:jmap:core',
  'urn:ietf:params:jmap:mail',
  'urn:ietf:params:jmap:submission',
]

export interface JmapResponse {
  methodResponses: [string, Record<string, unknown>, string][]
  sessionState: string
}

/**
 * Core JMAP HTTP transport layer.
 *
 * Uses Bearer token auth (OAuth 2.0) — never Basic Auth.
 * Automatically refreshes an expired access token and updates
 * the session cookie before retrying.
 */
export class JmapClient {
  constructor(
    private readonly apiUrl: string,
    /** The OAuth access token for this user */
    private accessToken: string,
  ) {}

  async request(methodCalls: unknown[][]): Promise<JmapResponse> {
    const body = {
      using: JMAP_USING,
      methodCalls,
    }

    let raw: unknown
    try {
      raw = await $fetch<unknown>(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    }
    catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        throw new JmapError('authenticationFailed', 'Token invalid or expired', undefined, 401)
      }
      throw new JmapError('serverFail', `JMAP request failed: ${String(err)}`, undefined, 500)
    }

    const response = raw as JmapResponse
    const jmapErr  = extractJmapError(response.methodResponses)
    if (jmapErr) throw jmapErr

    return response
  }

  getResponse<T = Record<string, unknown>>(response: JmapResponse, callId: string): T {
    const found = response.methodResponses.find(r => r[2] === callId)
    if (!found) {
      throw new JmapError('notFound', `No response for callId "${callId}"`)
    }
    return found[1] as T
  }
}

/**
 * Factory — builds a JmapClient from the session's OAuth tokens.
 * If the access token is expired it refreshes it first and updates
 * the session cookie in-place so the new token persists.
 */
export async function createJmapClient(
  tokens: OAuthTokens,
  apiUrl: string,
  event?: H3Event,
): Promise<JmapClient> {
  const config = useRuntimeConfig()
  let activeToken = tokens.accessToken

  if (isTokenExpired(tokens)) {
    if (!tokens.refreshToken) {
      throw new JmapError('authenticationFailed', 'Access token expired and no refresh token available', undefined, 401)
    }

    const refreshed = await refreshAccessToken({
      baseUrl:      config.jmapBaseUrl,
      clientId:     config.oauthClientId,
      clientSecret: config.oauthClientSecret,
      refreshToken: tokens.refreshToken,
    })

    activeToken = refreshed.accessToken

    // Persist the new tokens into the session cookie if we have an event context
    if (event) {
      refreshSessionTokens(event, refreshed)
    }
  }

  return new JmapClient(apiUrl, activeToken)
}
