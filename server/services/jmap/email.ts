import type { MailMessage, MailMessageFull, MailAttachment } from '../../../shared/types'
import { JmapClient } from './client'
import { buildClientDownloadUrl } from './attachment'

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
  language?: string[]
  location?: string
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

function normaliseFull(raw: JmapEmailFull): MailMessageFull {
  const base = normaliseList(raw)

  // --- Body extraction ---
  // JMAP body parts reference bodyValues via partId.
  // Strategy:
  //   1. Use textBody[0].partId / htmlBody[0].partId if present
  //   2. Fall back to scanning all bodyValues for text/html content
  //   3. Fall back to bodyStructure traversal

  let textBody: string | null = null
  let htmlBody: string | null = null

  const bodyValues = raw.bodyValues ?? {}

  // Primary: use the partId references from textBody / htmlBody arrays
  const textPartId = raw.textBody?.[0]?.partId
  const htmlPartId = raw.htmlBody?.[0]?.partId

  if (textPartId && bodyValues[textPartId]?.value) {
    textBody = bodyValues[textPartId].value
  }
  if (htmlPartId && bodyValues[htmlPartId]?.value) {
    htmlBody = bodyValues[htmlPartId].value
  }

  // Fallback: scan all bodyValues — pick first text/plain and text/html
  if (!textBody || !htmlBody) {
    // Also check the body part types from textBody/htmlBody arrays
    for (const part of [...(raw.textBody ?? []), ...(raw.htmlBody ?? [])]) {
      const val = part.partId ? bodyValues[part.partId] : null
      if (val?.value) {
        if (!htmlBody && part.type === 'text/html') htmlBody = val.value
        if (!textBody && part.type === 'text/plain') textBody = val.value
      }
    }
  }

  // Last resort: just grab whatever is in bodyValues
  if (!textBody && !htmlBody) {
    for (const [, val] of Object.entries(bodyValues)) {
      if (val?.value && !textBody) textBody = val.value
    }
  }

  // --- Attachments ---
  const attachments: MailAttachment[] = (raw.attachments ?? [])
    .filter(p => p.blobId && p.disposition !== 'inline')
    .map(p => ({
      blobId: p.blobId!,
      name: p.name ?? 'attachment',
      type: p.type ?? 'application/octet-stream',
      size: p.size ?? 0,
      downloadUrl: buildClientDownloadUrl(p.blobId!, p.name ?? 'attachment'),
    }))

  // --- Headers ---
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
    inReplyTo:  headers['in-reply-to']  ?? null,
    messageId:  headers['message-id']   ?? null,
    references: headers['references']   ?? null,
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
): Promise<{ emails: MailMessage[]; state: string }> {
  // Always call Email/get (even with empty ids) so we get the account-wide
  // `state` token needed for Email/changes push sync.
  const response = await client.request([
    [
      'Email/get',
      { accountId, ids, properties: LIST_PROPERTIES },
      'email-list',
    ],
  ])
  const args = client.getResponse<{ list: JmapEmailList[]; state: string }>(response, 'email-list')
  return {
    emails: (args.list ?? []).map(normaliseList),
    state:  args.state ?? '',
  }
}

export async function getEmailFull(
  client: JmapClient,
  accountId: string,
  id: string,
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

  // Temporary debug — log the raw JMAP body parts from Stalwart
  console.log('[getEmailFull] raw.textBody:', JSON.stringify(raw.textBody))
  console.log('[getEmailFull] raw.htmlBody:', JSON.stringify(raw.htmlBody))
  console.log('[getEmailFull] raw.bodyStructure type:', raw.bodyStructure?.type)
  console.log('[getEmailFull] raw.bodyValues keys:', Object.keys(raw.bodyValues ?? {}))
  console.log('[getEmailFull] raw.attachments count:', raw.attachments?.length ?? 0)

  return normaliseFull(raw)
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
    from: JmapAddress                 // required — must be the user's real identity email
    to: JmapAddress[]
    cc?: JmapAddress[]
    bcc?: JmapAddress[]
    subject: string
    textBody?: string
    htmlBody?: string
    attachments?: Array<{ blobId: string; name: string; type: string; size?: number }>
    inReplyToEmailId?: string
    references?: string
    inReplyTo?: string
  },
): Promise<string> {
  // Build bodyValues and bodyStructure correctly.
  //
  // Rules:
  //  - Plain text only  → bodyStructure type = "text/plain", partId = "1"
  //  - HTML only        → bodyStructure type = "text/html",  partId = "1"
  //  - Both             → multipart/alternative with two subParts
  //  - With attachments → wrap the above in multipart/mixed
  //
  // Attachment parts MUST include type + name + disposition (RFC 8621).
  // Without type, servers may emit the blob as raw body text (garbled JFIF).

  const bodyValues: Record<string, { value: string; charset?: string }> = {}
  let innerStructure: JmapBodyPart

  if (draft.htmlBody && draft.textBody) {
    bodyValues['1'] = { value: draft.textBody, charset: 'utf-8' }
    bodyValues['2'] = { value: draft.htmlBody, charset: 'utf-8' }
    innerStructure = {
      type: 'multipart/alternative',
      subParts: [
        { partId: '1', type: 'text/plain' },
        { partId: '2', type: 'text/html' },
      ],
    }
  }
  else if (draft.htmlBody) {
    bodyValues['1'] = { value: draft.htmlBody, charset: 'utf-8' }
    innerStructure = { partId: '1', type: 'text/html' }
  }
  else {
    // Plain text (default) — always populate even if body is empty
    const text = draft.textBody ?? ''
    bodyValues['1'] = { value: text, charset: 'utf-8' }
    innerStructure = { partId: '1', type: 'text/plain' }
  }

  // Wrap in multipart/mixed if there are attachments
  const attachmentParts: JmapBodyPart[] = (draft.attachments ?? []).map(att => ({
    blobId: att.blobId,
    type: att.type || 'application/octet-stream',
    name: att.name,
    disposition: 'attachment',
    ...(typeof att.size === 'number' ? { size: att.size } : {}),
  }))

  const bodyStructure: JmapBodyPart = attachmentParts.length
    ? {
        type: 'multipart/mixed',
        subParts: [innerStructure, ...attachmentParts],
      }
    : innerStructure

  const emailCreate: Record<string, unknown> = {
    mailboxIds: { [draftsMailboxId]: true },
    keywords:   { $draft: true },
    from:       [{ name: draft.from.name, email: draft.from.email }],
    to:         draft.to,
    cc:         draft.cc ?? [],
    bcc:        draft.bcc ?? [],
    subject:    draft.subject,
    bodyValues,
    bodyStructure,
  }

  if (draft.references) emailCreate['header:References:asText'] = draft.references
  if (draft.inReplyTo)  emailCreate['header:In-Reply-To:asText'] = draft.inReplyTo
  // NOTE: do NOT set emailCreate.threadId — it is read-only in JMAP.
  // Stalwart assigns the thread automatically by matching In-Reply-To / References headers.

  const response = await client.request([
    [
      'Email/set',
      { accountId, create: { draft: emailCreate } },
      'create-draft',
    ],
  ])
  const args = client.getResponse<{
    created: Record<string, { id: string }>
    notCreated?: Record<string, { type: string; description?: string }>
  }>(response, 'create-draft')

  // Surface JMAP creation errors explicitly
  if (args.notCreated?.draft) {
    const err = args.notCreated.draft
    throw new Error(`Draft creation failed: ${err.type} — ${err.description ?? ''}`)
  }

  const created = args.created?.draft
  if (!created?.id) throw new Error('Draft creation failed: no id returned')
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
  oldState: string
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
    oldState: string
    created: string[]
    updated: string[]
    destroyed: string[]
    newState: string
    hasMoreChanges: boolean
  }>(response, 'email-changes')
  return args
}
