import { JmapError, extractJmapError } from '../../utils/jmap-error'

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
 * One instance is created per BFF request using the user's basicAuth
 * string from their server-side session. It never reaches the browser.
 */
export class JmapClient {
  constructor(
    private readonly apiUrl: string,
    /** base64-encoded "username:password" */
    private readonly basicAuth: string,
  ) {}

  /**
   * Execute one or more JMAP method calls in a single HTTP request.
   * Returns the full methodResponses array.
   */
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
          'Authorization': `Basic ${this.basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    }
    catch (err: unknown) {
      // $fetch throws on non-2xx; extract status if available
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        throw new JmapError('authenticationFailed', 'Invalid credentials', undefined, 401)
      }
      throw new JmapError('serverFail', `JMAP request failed: ${String(err)}`, undefined, 500)
    }

    const response = raw as JmapResponse

    // Scan method responses for embedded JMAP errors
    const jmapErr = extractJmapError(response.methodResponses)
    if (jmapErr) throw jmapErr

    return response
  }

  /**
   * Convenience: returns the args of the first response matching callId.
   */
  getResponse<T = Record<string, unknown>>(
    response: JmapResponse,
    callId: string,
  ): T {
    const found = response.methodResponses.find(r => r[2] === callId)
    if (!found) {
      throw new JmapError('notFound', `No response for callId "${callId}"`)
    }
    return found[1] as T
  }
}

/** Factory — builds a JmapClient from a basicAuth string and the configured base URL. */
export function createJmapClient(basicAuth: string): JmapClient {
  const config = useRuntimeConfig()
  // apiUrl is filled in after session discovery; at construction time we use
  // the base URL — discoverJmapSession() will return the real apiUrl.
  return new JmapClient(
    `${config.jmapBaseUrl}/jmap/`,
    basicAuth,
  )
}
