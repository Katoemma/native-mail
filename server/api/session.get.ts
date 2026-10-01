import { requireSession } from '../utils/auth'
import type { ApiSessionResponse } from '../../shared/types'

export default defineEventHandler((event): ApiSessionResponse => {
  const session = requireSession(event)
  // Return only safe user info — no basicAuth, no password
  return {
    username: session.username,
    displayName: session.displayName,
    email: session.email,
  }
})
