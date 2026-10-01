import type { MailMessage, MailMessageFull, MailAttachment } from '../../../shared/types'
import type { JmapSession } from '../../../shared/types'
import { JmapClient } from './client'
import { buildDownloadUrl } from './session'

// ---------------------------------------------------------------------------
// Internal JMAP shapes
// ---------------------------------------------------------------------------
interface JmapAddress { name?: string; email: string }

interface JmapEmailList {
  id: string
  threadId: string
  mailboxIds: Record<string, boolean>
  keywords: Record<string, boolean>
  receivedAt: string | null
  sentAt: string | null
  size: number
  from: JmapAddress[] | null
  to: JmapAddress[] | null
  cc: JmapAddress[] | null
  replyTo: JmapAddress[] | null
  subject: string | null
  preview: string | null
  hasAttachment: boolean
}

interface JmapBodyPart {
  partId?: string
  blobId?: string
  size?: number
  name?: string
  type?: string
  charset?: string
  disposition?: string
  cid?: string
  subParts?: JmapBodyPart[]
}

interface JmapEmailFull extends JmapEmailList {
  bodyStructure: JmapBodyPart | null
  bodyValues: Record<string, { value: string; isEncodingProblem?: boolean; isTruncated?: boolean }>
  htmlBody: JmapBodyPart[] | null
  textBody: JmapBodyPart[] | null
  attachments: JmapBodyPart[] | null
  headers: Array<{ name: string; value: string }> | null
}

// ---------------------------------------------------------------------------
// Properties used for list view (lightweight)
// ---------------------------------------------------------------------------
const LIST_PROPERTIES = [
  'id', 'threadId', 'mailboxIds', 'keywords',
  'receivedAt', 'sentAt', 'size',
  'from', 'to', 'cc', 'replyTo',
  'subject', 'preview', 'hasAttachment',
]

// ---------------------------------------------------------------------------
// Normalise helpers
// ---------------------------------------------------------------------------
function normaliseAddress(a: JmapAddress) {
  return { name: a.name, email: a.email }
}

function normaliseList(raw: JmapEmailList): MailMessage {
  return {
    id: raw.id,
    threadId: raw.threadId,
    mailboxIds: raw.mailboxIds ?? {},
    keywords: raw.keywords ?? {},
    receivedAt: raw.receivedAt ?? null,
    sentAt: raw.sentAt ?? null,
    size: raw.size ?? 0,
    from: (raw.from ?? []).map(normaliseAddress),
    to: (raw.to ?? []).map(normaliseAddress),
    cc: (raw.cc ?? []).map(normaliseAddress),
    replyTo: (raw.replyTo ?? []).map(normaliseAddress),
    subject: raw.subject ?? '(no subject)',
    preview: raw.preview ?? '',
    hasAttachment: raw.hasAttachment ?? false,
    isRead: '$seen' in (raw.keywords ?? {}),
    isStarred: '$flagged' in (raw.keywords ?? {}),
  }
}

function normaliseFull(
  raw: JmapEmailFull,
  session: JmapSession,
  accountId: string,
): MailMessageFull {
  const base = normaliseList(raw)

  // Collect inline body values
  const textPartId = raw.textBody?.[0]?.partId
  const htmlPartId = raw.htmlBody?.[0]?.partId
  const textBody = textPartId ? (raw.bodyValues?.[textPartId]?.value ?? null) : null
  const htmlBody = htmlPartId ? (raw.bodyValues?.[htmlPartId]?.value ?? null) : null

  // Attachments
  const attachments: MailAttachment[] = (raw.attachments ?? [])
    .filter(p => p.blobId)
    .map(p => ({
      blobId: p.blobId!,
      name: p.name ?? 'attachment',
      type: p.type ?? 'application/octet-stream',
      size: p.size ?? 0,
      downloadUrl: buildDownloadUrl(session, p.blobId!, p.name ?? 'attachment'),
    }))

  // Header map
  const headers: Record<string, string> = {}
  for (const h of raw.headers ?? []) {
    headers[h.name.toLowerCase()] = h.value.trim()
  }

  return {
    ...base,
    htmlBody,
    textBody,
    attachments,
    headers,
    inReplyTo: headers['in-reply-to'] ?? null,
    messageId: headers['message-id'] ?? null,
    references: headers['references'] ?? null,
  }
}

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

export async function queryEmails(
  client: JmapClient,
  accountId: string,
  mailboxId: string,
  position = 0,
  limit = 50,
): Promise<{ ids: string[]; total: number; queryState: string }> {
  const response = await client.request([
    [
      'Email/query',
      {
        accountId,
        filter: { inMailbox: mailboxId },
        sort: [{ property: 'receivedAt', isAscending: false }],
        position,
        limit,
        calculateTotal: true,
      },
      'email-query',
    ],
  ])
  const args = client.getResponse<{ ids: string[]; total: number; queryState: string }>(
    response, 'email-query',
  )
  return { ids: args.ids ?? [], total: args.total ?? 0, queryState: args.queryState ?? '' }
}

export async function getEmailList(
  client: JmapClient,
  accountId: string,
  ids: string[],
): Promise<MailMessage[]> {
  if (!ids.length) return []
  const response = await client.request([
    [
      'Email/get',
      { accountId, ids, properties: LIST_PROPERTIES },
      'email-list',
    ],
  ])
  const args = client.getResponse<{ list: JmapEmailList[]; state: string }>(response, 'email-list')
  return (args.list ?? []).map(normaliseList)
}

export async function getEmailFull(
  client: JmapClient,
  accountId: string,
  id: string,
  session: JmapSession,
): Promise<MailMessageFull> {
  const response = await client.request([
    [
      'Email/get',
      {
        accountId,
        ids: [id],
        properties: [
          ...LIST_PROPERTIES,
          'bodyStructure', 'bodyValues', 'htmlBody', 'textBody', 'attachments', 'headers',
        ],
        fetchTextBodyValues: true,
        fetchHTMLBodyValues: true,
        maxBodyValueBytes: 256 * 1024,
      },
      'email-full',
    ],
  ])
  const args = client.getResponse<{ list: JmapEmailFull[] }>(response, 'email-full')
  const raw = args.list?.[0]
  if (!raw) throw new Error(`Email ${id} not found`)
  return normaliseFull(raw, session, accountId)
}

export async function setEmailKeyword(
  client: JmapClient,
  accountId: string,
  id: string,
  keyword: string,
  value: boolean | null,
): Promise<void> {
  await client.request([
    [
      'Email/set',
      {
        accountId,
        update: { [id]: { [`keywords/${keyword}`]: value } },
      },
      'kw-set',
    ],
  ])
}

export async function moveEmail(
  client: JmapClient,
  accountId: string,
  id: string,
  mailboxId: string,
): Promise<void> {
  await client.request([
    [
      'Email/set',
      {
        accountId,
        update: { [id]: { mailboxIds: { [mailboxId]: true } } },
      },
      'move',
    ],
  ])
}

export async function destroyEmail(
  client: JmapClient,
  accountId: string,
  id: string,
): Promise<void> {
  await client.request([
    ['Email/set', { accountId, destroy: [id] }, 'destroy'],
  ])
}

export async function createDraft(
  client: JmapClient,
  accountId: string,
  draftsMailboxId: string,
  draft: {
    to: JmapAddress[]
    cc?: JmapAddress[]
    bcc?: JmapAddress[]
    subject: string
    textBody?: string
    htmlBody?: string
    attachmentBlobIds?: string[]
    inReplyToEmailId?: string
    threadId?: string
    references?: string
    inReplyTo?: string
  },
): Promise<string> {
  const bodyParts: JmapBodyPart[] = []

  if (draft.htmlBody) {
    bodyParts.push({ partId: 'html', type: 'text/html' })
  }
  else if (draft.textBody) {
    bodyParts.push({ partId: 'text', type: 'text/plain' })
  }

  const bodyValues: Record<string, { value: string }> = {}
  if (draft.htmlBody) bodyValues['html'] = { value: draft.htmlBody }
  if (draft.textBody) bodyValues['text'] = { value: draft.textBody }

  const attachmentParts = (draft.attachmentBlobIds ?? []).map(blobId => ({
    blobId,
    disposition: 'attachment',
  }))

  const emailCreate: Record<string, unknown> = {
    mailboxIds: { [draftsMailboxId]: true },
    keywords: { $draft: true },
    from: [{ email: '' }], // Will be set by identity at send time
    to: draft.to,
    cc: draft.cc ?? [],
    bcc: draft.bcc ?? [],
    subject: draft.subject,
    bodyValues,
    bodyStructure: {
      type: 'multipart/mixed',
      subParts: [...bodyParts, ...attachmentParts],
    },
  }

  if (draft.references) emailCreate['header:References:asText'] = draft.references
  if (draft.inReplyTo) emailCreate['header:In-Reply-To:asText'] = draft.inReplyTo
  if (draft.threadId) emailCreate.threadId = draft.threadId

  const response = await client.request([
    [
      'Email/set',
      {
        accountId,
        create: { draft: emailCreate },
      },
      'create-draft',
    ],
  ])
  const args = client.getResponse<{ created: Record<string, { id: string }> }>(
    response, 'create-draft',
  )
  const created = args.created?.draft
  if (!created?.id) throw new Error('Draft creation failed')
  return created.id
}

export async function updateDraft(
  client: JmapClient,
  accountId: string,
  emailId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await client.request([
    ['Email/set', { accountId, update: { [emailId]: patch } }, 'update-draft'],
  ])
}

export async function getEmailChanges(
  client: JmapClient,
  accountId: string,
  sinceState: string,
): Promise<{
  created: string[]
  updated: string[]
  destroyed: string[]
  newState: string
  hasMoreChanges: boolean
}> {
  const response = await client.request([
    ['Email/changes', { accountId, sinceState, maxChanges: 100 }, 'email-changes'],
  ])
  const args = client.getResponse<{
    created: string[]
    updated: string[]
    destroyed: string[]
    newState: string
    hasMoreChanges: boolean
  }>(response, 'email-changes')
  return args
}
