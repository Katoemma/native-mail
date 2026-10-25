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

/** App-hosted Native logo (path under /public) */
export const DEFAULT_SIGNATURE_LOGO_PATH = '/native-logo.png'

function mapIdentity(i: JmapIdentity): Identity {
  const htmlSignature = i.htmlSignature ?? ''
  return {
    id: i.id,
    name: i.name,
    email: i.email,
    replyTo: i.replyTo ?? null,
    bcc: i.bcc ?? null,
    textSignature: i.textSignature ?? '',
    htmlSignature,
    logoUrl: extractLogoUrl(htmlSignature),
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

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** First <img src="..."> in stored htmlSignature (our logo). */
export function extractLogoUrl(html: string): string {
  if (!html) return ''
  const m = html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)
  return m?.[1]?.trim() ?? ''
}

function normalizeLogoUrl(raw: string): string {
  const url = raw.trim()
  if (!url) return ''
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return ''
    return u.toString()
  }
  catch {
    return ''
  }
}

/**
 * Resolve logo for email HTML. Empty → Native default.
 * Relative paths are joined to requestOrigin (must be absolute for mail clients).
 */
export function resolveSignatureLogoUrl(
  logoUrl: string | null | undefined,
  requestOrigin: string,
  defaultPath = DEFAULT_SIGNATURE_LOGO_PATH,
): string {
  const origin = requestOrigin.replace(/\/$/, '')
  const raw = (logoUrl ?? '').trim()
  if (!raw) {
    return `${origin}${defaultPath.startsWith('/') ? defaultPath : `/${defaultPath}`}`
  }
  if (raw.startsWith('/')) {
    return `${origin}${raw}`
  }
  return normalizeLogoUrl(raw) || `${origin}${DEFAULT_SIGNATURE_LOGO_PATH}`
}

/** Build Identity htmlSignature from plain text + logo URL (logo below text). */
export function buildHtmlSignature(text: string, absoluteLogoUrl: string): string {
  const parts: string[] = []
  const trimmed = text.trimEnd()
  if (trimmed) {
    parts.push(escapeHtml(trimmed).replace(/\r\n|\r|\n/g, '<br>'))
  }
  const logo = normalizeLogoUrl(absoluteLogoUrl)
  if (logo) {
    if (parts.length) parts.push('<br><br>')
    parts.push(
      `<img src="${escapeHtml(logo)}" alt="Native" width="120" style="max-width:120px;height:auto;display:block;border:0;">`,
    )
  }
  return parts.join('')
}

export async function updateIdentitySignatures(
  client: JmapClient,
  accountId: string,
  identityId: string,
  textSignature: string,
  absoluteLogoUrl: string,
): Promise<Identity> {
  if (textSignature.length > SIGNATURE_MAX_CHARS) {
    throw new JmapError(
      'invalidArguments',
      `Signature must be at most ${SIGNATURE_MAX_CHARS} characters`,
      ['textSignature'],
      400,
    )
  }

  const htmlSignature = buildHtmlSignature(textSignature, absoluteLogoUrl)
  if (htmlSignature.length > SIGNATURE_MAX_CHARS) {
    throw new JmapError(
      'invalidArguments',
      `HTML signature is too long (${htmlSignature.length}/${SIGNATURE_MAX_CHARS}). Use a shorter logo URL or less text.`,
      ['htmlSignature'],
      400,
    )
  }

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
