import { readBody } from 'h3'
import { withJmap } from '../../utils/jmap-auth'
import {
  getIdentities,
  updateIdentitySignatures,
  SIGNATURE_MAX_CHARS,
} from '../../services/jmap/identity'
import type { Identity } from '../../../shared/types'

interface PatchBody {
  identityId?: string
  textSignature?: string
  logoUrl?: string | null
}

export default defineEventHandler(async (event): Promise<{ identity: Identity }> => {
  const body = await readBody<PatchBody>(event)
  const textSignature = typeof body.textSignature === 'string' ? body.textSignature : null

  if (textSignature === null) {
    throw createError({
      statusCode: 400,
      statusMessage: 'textSignature is required',
    })
  }

  if (textSignature.length > SIGNATURE_MAX_CHARS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Signature must be at most ${SIGNATURE_MAX_CHARS} characters`,
    })
  }

  const logoUrl = typeof body.logoUrl === 'string' ? body.logoUrl : (body.logoUrl ?? '')

  return withJmap(event, async ({ client, jmapSession }) => {
    let identityId = body.identityId?.trim()
    if (!identityId) {
      const list = await getIdentities(client, jmapSession.accountId)
      identityId = list[0]?.id
    }
    if (!identityId) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No sending identity found',
      })
    }

    const identity = await updateIdentitySignatures(
      client,
      jmapSession.accountId,
      identityId,
      textSignature,
      logoUrl,
    )
    return { identity }
  })
})
