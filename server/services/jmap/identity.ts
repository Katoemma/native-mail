import type { Identity } from '../../../shared/types'
import { JmapClient } from './client'
import { JmapError } from '../../utils/jmap-error'

interface JmapIdentity {
  id: string
  name: string
  email: string
  replyTo: { name?: string; email: string }[] | null
  bcc: { name?: string; email: string }[] | null
  textSignature?: string | null
  htmlSignature?: string | null
}

const IDENTITY_PROPS = [
  'id',
  'name',
  'email',
  'replyTo',
  'bcc',
  'textSignature',
  'htmlSignature',
] as const

/** Stalwart rejects signatures ≥ 2048 chars */
export const SIGNATURE_MAX_CHARS = 2047

function mapIdentity(i: JmapIdentity): Identity {
  return {
    id: i.id,
    name: i.name,
    email: i.email,
    replyTo: i.replyTo ?? null,
    bcc: i.bcc ?? null,
    textSignature: i.textSignature ?? '',
    htmlSignature: i.htmlSignature ?? '',
  }
}

export async function getIdentities(
  client: JmapClient,
  accountId: string,
): Promise<Identity[]> {
  const response = await client.request([
    [
      'Identity/get',
      {
        accountId,
        ids: null,
        properties: [...IDENTITY_PROPS],
      },
      'identities',
    ],
  ])
  const args = client.getResponse<{ list: JmapIdentity[] }>(response, 'identities')
  return (args.list ?? []).map(mapIdentity)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Plain signature → simple HTML for Identity.htmlSignature */
export function textToHtmlSignature(text: string): string {
  const trimmed = text.trimEnd()
  if (!trimmed) return ''
  return escapeHtml(trimmed).replace(/\r\n|\r|\n/g, '<br>')
}

export async function updateIdentitySignatures(
  client: JmapClient,
  accountId: string,
  identityId: string,
  textSignature: string,
): Promise<Identity> {
  if (textSignature.length > SIGNATURE_MAX_CHARS) {
    throw new JmapError(
      'invalidArguments',
      `Signature must be at most ${SIGNATURE_MAX_CHARS} characters`,
      ['textSignature'],
      400,
    )
  }

  const htmlSignature = textToHtmlSignature(textSignature)

  const response = await client.request([
    [
      'Identity/set',
      {
        accountId,
        update: {
          [identityId]: {
            textSignature,
            htmlSignature,
          },
        },
      },
      'idset',
    ],
  ])

  const args = client.getResponse<{
    updated?: Record<string, unknown> | string[]
    notUpdated?: Record<string, { type?: string; description?: string; properties?: string[] }>
  }>(response, 'idset')

  const notUpdated = args.notUpdated?.[identityId]
  if (notUpdated) {
    throw new JmapError(
      notUpdated.type ?? 'invalidPatch',
      notUpdated.description ?? 'Failed to update signature',
      notUpdated.properties,
      400,
    )
  }

  const identities = await getIdentities(client, accountId)
  const updated = identities.find(i => i.id === identityId)
  if (!updated) {
    throw new JmapError('notFound', 'Identity not found after update', undefined, 404)
  }
  return updated
}
