/**
 * Normalised JMAP error.
 * JMAP can return method-level errors embedded in methodResponses,
 * or HTTP-level errors. This class normalises both into one shape.
 */
export class JmapError extends Error {
  constructor(
    public readonly type: string,
    public readonly description?: string,
    public readonly properties?: string[],
    public readonly status?: number,
  ) {
    super(description ?? type)
    this.name = 'JmapError'
  }
}

/** Extracts the first error method response from a JMAP response body, if any. */
export function extractJmapError(methodResponses: unknown[][]): JmapError | null {
  for (const response of methodResponses) {
    const [name, args] = response as [string, Record<string, unknown>]
    if (name === 'error') {
      return new JmapError(
        (args.type as string) ?? 'unknownError',
        args.description as string | undefined,
      )
    }
  }
  return null
}

/** Maps common JMAP error types to HTTP status codes for BFF responses. */
export function jmapErrorToStatus(type: string): number {
  switch (type) {
    case 'authenticationFailed': return 401
    case 'notFound': return 404
    case 'forbidden': return 403
    case 'accountNotFound': return 404
    case 'invalidArguments': return 400
    case 'invalidPatch': return 400
    case 'stateMismatch': return 409
    case 'serverFail': return 500
    case 'serverUnavailable': return 503
    case 'overQuota': return 507
    case 'tooLarge': return 413
    case 'rateLimit': return 429
    default: return 500
  }
}
