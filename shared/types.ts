/**
 * Shared TypeScript interfaces used by both the BFF (server/) and
 * the client (app/stores, app/composables).
 *
 * JMAP internals (raw request/response shapes) stay in server/services/jmap/.
 * Everything here is the *normalised* client-facing model.
 */

// ---------------------------------------------------------------------------
// OAuth tokens — stored server-side in the session cookie, never in the browser
// ---------------------------------------------------------------------------
export interface OAuthTokens {
  accessToken: string
  refreshToken: string | null
  /** Unix ms timestamp */
  expiresAt: number
  tokenType: string
  scope: string
}

// ---------------------------------------------------------------------------
// JMAP session (server-side only, never sent to the browser wholesale)
// ---------------------------------------------------------------------------
export interface JmapSession {
  /** Full JMAP API URL, e.g. https://mail.example.com/jmap/ */
  apiUrl: string
  /** URL template: /jmap/upload/{accountId}/ */
  uploadUrl: string
  /** URL template: /jmap/download/{accountId}/{blobId}/{name} */
  downloadUrl: string
  /** URL for JMAP EventSource push */
  eventSourceUrl: string
  /** Resolved from primaryAccounts['urn:ietf:params:jmap:mail'] */
  accountId: string
  /**
   * Full capabilities map from /.well-known/jmap.
   * Includes 'urn:ietf:params:jmap:websocket': { url, supportsPush }
   */
  capabilities: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Mail domain types
// ---------------------------------------------------------------------------
export interface MailAddress {
  name?: string
  email: string
}

export type MailboxRole =
  | 'inbox'
  | 'sent'
  | 'drafts'
  | 'trash'
  | 'junk'
  | 'archive'
  | null

export interface Mailbox {
  id: string
  name: string
  role: MailboxRole
  totalEmails: number
  unreadEmails: number
  totalThreads: number
  unreadThreads: number
  parentId: string | null
  sortOrder: number
}

/** Normalised email — what the browser receives from /api/emails */
export interface MailMessage {
  id: string
  threadId: string
  subject: string
  from: MailAddress[]
  to: MailAddress[]
  cc: MailAddress[]
  replyTo: MailAddress[]
  preview: string
  /** ISO-8601 */
  receivedAt: string | null
  /** ISO-8601 */
  sentAt: string | null
  mailboxIds: Record<string, boolean>
  keywords: Record<string, boolean>
  hasAttachment: boolean
  size: number
  /** Derived from '$seen' in keywords */
  isRead: boolean
  /** Derived from '$flagged' in keywords */
  isStarred: boolean
}

/** Full email including rendered body — returned by GET /api/emails/:id */
export interface MailMessageFull extends MailMessage {
  htmlBody: string | null
  textBody: string | null
  attachments: MailAttachment[]
  /** Raw headers map */
  headers: Record<string, string>
  /** In-Reply-To header value (for threading) */
  inReplyTo: string | null
  /** Message-ID header value */
  messageId: string | null
  /** References header value */
  references: string | null
}

export interface MailAttachment {
  blobId: string
  name: string
  type: string
  size: number
  /** Constructed by the BFF using the download URL template */
  downloadUrl: string
}

export interface MailThread {
  id: string
  emailIds: string[]
}

export interface Identity {
  id: string
  name: string
  email: string
  replyTo: MailAddress[] | null
  bcc: MailAddress[] | null
}

// ---------------------------------------------------------------------------
// Compose / draft
// ---------------------------------------------------------------------------
export interface AttachmentDraft {
  /** Temporary client-side ID before upload */
  clientId: string
  /** Set after successful upload */
  blobId?: string
  name: string
  type: string
  size: number
  uploading: boolean
  error?: string
}

export interface DraftPayload {
  to: MailAddress[]
  cc: MailAddress[]
  bcc: MailAddress[]
  subject: string
  textBody: string
  htmlBody?: string
  attachmentBlobIds: string[]
  inReplyToEmailId?: string
}

// ---------------------------------------------------------------------------
// BFF API response shapes (what the browser actually receives)
// ---------------------------------------------------------------------------
export interface ApiMailboxesResponse {
  mailboxes: Mailbox[]
}

export interface ApiEmailsResponse {
  emails: MailMessage[]
  total: number
  position: number
  /** Email/query queryState — for Email/queryChanges (not Email/changes) */
  queryState: string
  /** Email/get state — account-wide, for Email/changes incremental sync */
  emailState: string
}

export interface ApiEmailResponse {
  email: MailMessageFull
}

export interface ApiThreadResponse {
  thread: MailThread
  emails: MailMessage[]
}

export interface ApiSearchResponse {
  emails: MailMessage[]
  total: number
}

export interface ApiUploadResponse {
  blobId: string
  name: string
  size: number
  type: string
}

export interface ApiSessionResponse {
  username: string
  displayName: string
  email: string
}

export interface ApiSendResponse {
  submissionId: string
  emailId: string
}

// ---------------------------------------------------------------------------
// Sync / changes
// ---------------------------------------------------------------------------
export interface EmailChangesResponse {
  oldState: string
  newState: string
  hasMoreChanges: boolean
  created: string[]
  updated: string[]
  destroyed: string[]
}
