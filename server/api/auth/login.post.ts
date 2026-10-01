import { readBody, createError } from 'h3'
import { discoverJmapSession } from '../../services/jmap/session'
import { JmapClient } from '../../services/jmap/client'
import { JmapError } from '../../utils/jmap-error'
import { setSessionCookie } from '../../utils/auth'
import type { Identity } from '../../../shared/types'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username: string; password: string }>(event)

  if (!body?.username || !body?.password) {
    throw createError({ statusCode: 400, statusMessage: 'username and password are required' })
  }

  const basicAuth = Buffer.from(`${body.username}:${body.password}`).toString('base64')

  // Attempt JMAP discovery — this validates credentials against Stalwart
  let session
  try {
    session = await discoverJmapSession(basicAuth, body.username)
  }
  catch (err) {
    if (err instanceof JmapError && err.type === 'authenticationFailed') {
      throw createError({ statusCode: 401, statusMessage: 'Invalid username or password' })
    }
    throw createError({ statusCode: 503, statusMessage: 'Mail server unreachable' })
  }

  // Fetch identity to get display name
  const client = new JmapClient(session.apiUrl, basicAuth)
  let displayName = body.username
  let email = body.username

  try {
    const response = await client.request([
      ['Identity/get', { accountId: session.accountId, ids: null }, 'identities'],
    ])
    const args = client.getResponse<{ list: Identity[] }>(response, 'identities')
    const identity = args.list?.[0]
    if (identity) {
      displayName = identity.name || body.username
      email = identity.email || body.username
    }
  }
  catch {
    // Non-fatal — fall back to username
  }

  const config = useRuntimeConfig()
  setSessionCookie(
    event,
    { username: body.username, displayName, email, basicAuth },
    config.sessionSecret,
  )

  return { ok: true, displayName, email }
})
