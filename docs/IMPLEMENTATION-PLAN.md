# Native Mail — Implementation Plan

**Version:** 1.0  
**Stack:** Nuxt 4 / Vue 3 / TypeScript  
**Protocol:** JMAP (RFC 8621)  
**Backend:** Stalwart Mail Server  
**Architecture:** BFF (Backend For Frontend)  
**Reference:** [JMAP-documentation.md](./JMAP-documentation.md)

---

## Overview

The application uses a **BFF (Backend For Frontend)** pattern.

The browser never speaks directly to Stalwart. All JMAP calls are made server-side inside Nuxt's `server/` layer. The browser only ever talks to Nuxt's own API routes using session cookies.

```text
┌────────────────────────────────────────────┐
│                  Browser                   │
│                                            │
│   Vue 3 + Pinia                            │
│   Pages, Components, Composables           │
└────────────────────┬───────────────────────┘
                     │  HTTP  (session cookie)
                     │  /api/*
                     ▼
┌────────────────────────────────────────────┐
│            Nuxt BFF  (server/)             │
│                                            │
│   server/api/*          ← REST-like routes │
│   server/services/jmap/ ← JMAP client      │
│   server/utils/auth.ts  ← session guard    │
└────────────────────┬───────────────────────┘
                     │  HTTPS  (Basic Auth)
                     │  JMAP JSON
                     ▼
┌────────────────────────────────────────────┐
│           Stalwart Mail Server             │
│                                            │
│   JMAP API  — mail.katoemma.website/jmap/  │
│   WebSocket — wss://…/jmap/ws              │
└────────────────────────────────────────────┘
```

### Why BFF?

- Credentials (`STALWART_USER`, `STALWART_PASSWORD`) never leave the server.
- Session cookies + CSRF protection happen in one place.
- The client API is mail-app-shaped, not JMAP-shaped.
- Future changes to auth (e.g. OAuth) only affect the BFF, not the Vue components.

---

## Project Structure

```text
native-mail/
│
├── app/                          ← Nuxt 4 client root
│   ├── app.vue
│   ├── assets/
│   │   └── css/main.css
│   ├── components/
│   │   ├── ui/                   ← shadcn-nuxt UI primitives (existing)
│   │   ├── AppSidebar.vue        (existing)
│   │   ├── NavUser.vue           (existing)
│   │   ├── mail/                 ← mail-specific components (new)
│   │   │   ├── MailList.vue
│   │   │   ├── MailListItem.vue
│   │   │   ├── MailThread.vue
│   │   │   ├── MailCompose.vue
│   │   │   ├── MailViewer.vue
│   │   │   └── MailSidebar.vue
│   │   └── layout/
│   │       └── AppLayout.vue
│   ├── composables/              ← thin Vue composables wrapping stores
│   │   ├── useMailboxes.ts
│   │   ├── useEmails.ts
│   │   ├── useThread.ts
│   │   ├── useCompose.ts
│   │   └── useSearch.ts
│   ├── pages/
│   │   ├── index.vue             ← redirect to /mail/inbox
│   │   ├── login.vue
│   │   └── mail/
│   │       ├── [mailbox].vue     ← inbox / sent / drafts / trash / junk
│   │       └── [mailbox]/[id].vue ← single email / thread view
│   ├── plugins/
│   └── stores/                  ← Pinia stores
│       ├── session.ts
│       ├── mailboxes.ts
│       ├── mail.ts
│       ├── thread.ts
│       └── composer.ts
│
├── server/                       ← Nuxt server / BFF
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.post.ts
│   │   │   └── logout.post.ts
│   │   ├── session.get.ts
│   │   ├── mailboxes/
│   │   │   └── index.get.ts
│   │   ├── emails/
│   │   │   ├── index.get.ts       ← query emails for a mailbox
│   │   │   ├── [id].get.ts        ← full email with body
│   │   │   ├── [id].patch.ts      ← read/star/move
│   │   │   └── [id]/
│   │   │       ├── send.post.ts
│   │   │       └── attachment.post.ts
│   │   ├── threads/
│   │   │   └── [id].get.ts
│   │   ├── drafts/
│   │   │   ├── index.post.ts      ← create draft
│   │   │   └── [id].patch.ts      ← update draft
│   │   ├── search.get.ts
│   │   └── attachments/
│   │       └── upload.post.ts
│   ├── services/
│   │   └── jmap/
│   │       ├── client.ts          ← core JMAP HTTP transport
│   │       ├── session.ts         ← discover + cache JMAP session
│   │       ├── mailbox.ts
│   │       ├── email.ts
│   │       ├── thread.ts
│   │       ├── identity.ts
│   │       ├── submission.ts
│   │       └── attachment.ts
│   └── utils/
│       ├── auth.ts                ← session cookie guard
│       └── jmap-error.ts         ← error normalisation
│
├── docs/
│   ├── JMAP-documentation.md
│   └── IMPLEMENTATION-PLAN.md    ← this file
│
├── nuxt.config.ts
├── package.json
└── tsconfig.json
```

---

## Shared TypeScript Interfaces

These live in `server/services/jmap/` and are also imported by the client via auto-imports or `shared/types.ts`.

```ts
// Discovered from /.well-known/jmap — never hard-coded
interface JmapSession {
  apiUrl: string
  uploadUrl: string         // template with {accountId}
  downloadUrl: string       // template with {accountId}/{blobId}/{name}
  eventSourceUrl: string
  accountId: string         // primaryAccounts['urn:ietf:params:jmap:mail']
  capabilities: Record<string, unknown>
}

interface MailAddress {
  name?: string
  email: string
}

interface Mailbox {
  id: string
  name: string
  role: 'inbox' | 'sent' | 'drafts' | 'trash' | 'junk' | 'archive' | null
  totalEmails: number
  unreadEmails: number
  totalThreads: number
  unreadThreads: number
  parentId: string | null
  sortOrder: number
}

// Normalised client-facing email model
interface MailMessage {
  id: string
  threadId: string
  subject: string
  from: MailAddress[]
  to: MailAddress[]
  cc: MailAddress[]
  preview: string
  receivedAt: string | null
  sentAt: string | null
  mailboxIds: Record<string, boolean>
  keywords: Record<string, boolean>
  hasAttachment: boolean
  isRead: boolean      // derived: '$seen' in keywords
  isStarred: boolean   // derived: '$flagged' in keywords
}

interface MailThread {
  id: string
  emailIds: string[]
}

interface Identity {
  id: string
  name: string
  email: string
}
```

---

## BFF API Routes

The browser only ever calls these. The JMAP internals are invisible to the client.

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/auth/login` | Authenticate; set session cookie |
| `POST` | `/api/auth/logout` | Destroy session cookie |
| `GET` | `/api/session` | Return decoded session info (no credentials) |
| `GET` | `/api/mailboxes` | List all mailboxes |
| `GET` | `/api/emails?mailbox=inbox&page=0&limit=50` | Email list for a mailbox |
| `GET` | `/api/emails/:id` | Full email body + headers |
| `PATCH` | `/api/emails/:id` | Set read/starred/mailbox |
| `POST` | `/api/emails` | Create draft |
| `PATCH` | `/api/emails/:id` | Update draft |
| `POST` | `/api/emails/:id/send` | Submit email for delivery |
| `GET` | `/api/threads/:id` | Thread with all email IDs |
| `GET` | `/api/search?q=…&limit=50` | Full-text search |
| `POST` | `/api/attachments` | Upload attachment; return blobId |
| `GET` | `/api/attachments/:blobId` | Proxy download through BFF |

All routes return standard JSON. All routes except `login` require a valid session cookie (enforced by `server/utils/auth.ts`).

---

## JMAP Service Layer

### `server/services/jmap/client.ts`

Core transport. One method: `request(methodCalls)`. Adds `Authorization` header, constructs `using` array, sends a single batched JMAP POST.

```ts
// Conceptual shape
class JmapClient {
  constructor(private apiUrl: string, private auth: string) {}

  async request(methodCalls: unknown[][]): Promise<JmapResponse>
}
```

The client is created per-request using the user's stored credentials from the session. It is never instantiated on the client-side.

### `server/services/jmap/session.ts`

- Calls `GET /.well-known/jmap` to discover JMAP endpoints.
- Extracts `accountId` from `primaryAccounts['urn:ietf:params:jmap:mail']`.
- Caches the session object in Nitro's `useStorage()` keyed by username.
- All other services receive the resolved `JmapSession`.

### `server/services/jmap/email.ts`

Key methods:

| Method | JMAP call |
|--------|-----------|
| `query(accountId, mailboxId, position, limit)` | `Email/query` |
| `get(accountId, ids, properties)` | `Email/get` |
| `getFull(accountId, id)` | `Email/get` with body + bodyValues |
| `set(accountId, update)` | `Email/set` |
| `changes(accountId, sinceState)` | `Email/changes` |
| `create(accountId, draft)` | `Email/set` (create) |
| `destroy(accountId, ids)` | `Email/set` (destroy) |

The initial inbox load uses a **batched single JMAP request**:

```text
POST /jmap/

[ Mailbox/get, Email/query, Email/get, Identity/get ]

→ one HTTP round-trip for the full inbox load
```

---

## Authentication Flow

```text
POST /api/auth/login
  body: { username, password }
       │
       ▼
  Attempt JMAP discovery + first request
  using Basic Auth credentials
       │
  Success → store credentials in encrypted
  httpOnly session cookie (no localStorage)
       │
       ▼
  Client receives session cookie
  → redirect to /mail/inbox
```

Environment variables on the server side:

```text
JMAP_BASE_URL=https://mail.katoemma.website
SESSION_SECRET=<random 32-byte secret>
```

The user's mail password is held only in the server-side session store, never in the browser.

---

## Pinia Stores (Client)

### `stores/session.ts`

```ts
interface SessionState {
  username: string | null
  displayName: string | null
  email: string | null
  loggedIn: boolean
}
```

Populated from `GET /api/session`. No passwords or tokens stored.

### `stores/mailboxes.ts`

```ts
interface MailboxState {
  list: Mailbox[]
  selectedId: string | null
  loading: boolean
}
```

Actions: `fetch()`, `select(id)`.

### `stores/mail.ts`

```ts
interface MailState {
  emails: Record<string, MailMessage>  // keyed by id
  idsByMailbox: Record<string, string[]>
  selectedId: string | null
  loading: boolean
  syncing: boolean
  stateTokens: Record<string, string>  // mailboxId → JMAP state token
}
```

Actions: `fetchList(mailboxId)`, `fetchOne(id)`, `markRead(id)`, `markStarred(id)`, `move(id, mailboxId)`, `trash(id)`, `applyChanges(changes)`.

### `stores/thread.ts`

```ts
interface ThreadState {
  threads: Record<string, MailThread>
  loading: boolean
}
```

Actions: `fetch(threadId)`.

### `stores/composer.ts`

```ts
interface ComposerState {
  draftId: string | null
  to: MailAddress[]
  cc: MailAddress[]
  subject: string
  body: string
  attachments: AttachmentDraft[]
  saving: boolean
  sending: boolean
}
```

Actions: `saveDraft()`, `send()`, `addAttachment(file)`.

---

## Synchronisation Strategy

On initial load: full `Email/query` + `Email/get` + store the JMAP `state` token.

On subsequent visits / reconnect:

```text
Email/changes(sinceState: storedToken)
     ↓
{ created, updated, destroyed, newState }
     ↓
Email/get(created + updated)
     ↓
Patch Pinia store
     ↓
store newState token
```

This means the browser never re-downloads the full inbox when returning to a tab.

---

## Realtime (Phase 10)

Nuxt's server creates a WebSocket proxy to Stalwart's JMAP WebSocket (`wss://mail.katoemma.website/jmap/ws`). The browser connects to `/api/mail/ws` (Nuxt-managed), preserving the BFF boundary — the browser still does not connect to Stalwart directly.

On receiving a `StateChange` push notification:

```text
WebSocket message
     ↓
Parse changed types (Email, Mailbox, …)
     ↓
Dispatch Email/changes or Mailbox/changes
     ↓
Update Pinia store
     ↓
Vue UI reacts automatically
```

---

## Implementation Phases

### Phase 1 — Project scaffolding + BFF skeleton

- [ ] Add `server/` folder with placeholder API routes
- [ ] Add `.env` support to `nuxt.config.ts`
- [ ] Implement `JmapClient` + JMAP session discovery
- [ ] Implement `server/utils/auth.ts` session guard

### Phase 2 — Authentication

- [ ] `POST /api/auth/login` — validate against Stalwart via JMAP, set cookie
- [ ] `POST /api/auth/logout` — clear cookie
- [ ] `GET /api/session` — return safe user info
- [ ] `pages/login.vue` — login form
- [ ] `stores/session.ts`

### Phase 3 — Mailboxes

- [ ] `server/services/jmap/mailbox.ts` — `Mailbox/get`
- [ ] `GET /api/mailboxes`
- [ ] `stores/mailboxes.ts`
- [ ] `MailSidebar.vue` — renders mailbox list from store

### Phase 4 — Inbox list

- [ ] `server/services/jmap/email.ts` — `Email/query` + `Email/get`
- [ ] `GET /api/emails?mailbox=…&page=…`
- [ ] `stores/mail.ts` — `fetchList()`
- [ ] `MailList.vue` + `MailListItem.vue`
- [ ] Infinite scroll / load-more pagination

### Phase 5 — Reading an email

- [ ] `GET /api/emails/:id` — full body fetch
- [ ] `stores/mail.ts` — `fetchOne()`
- [ ] `MailViewer.vue` — HTML + plain text rendering, headers
- [ ] Auto mark-as-read on open (`Email/set` via `PATCH /api/emails/:id`)

### Phase 6 — Message state actions

- [ ] `PATCH /api/emails/:id` — accepts `{ read, starred, mailboxId }`
- [ ] `stores/mail.ts` — `markRead()`, `markStarred()`, `move()`, `trash()`
- [ ] Toolbar actions in `MailViewer.vue`

### Phase 7 — Compose + drafts

- [ ] `server/services/jmap/submission.ts`
- [ ] `server/services/jmap/identity.ts` — `Identity/get`
- [ ] `POST /api/emails` — create draft
- [ ] `PATCH /api/emails/:id` — update draft
- [ ] `POST /api/emails/:id/send` — `EmailSubmission/set`
- [ ] `stores/composer.ts`
- [ ] `MailCompose.vue` — full compose UI with auto-save

### Phase 8 — Attachments

- [ ] `server/services/jmap/attachment.ts` — upload to JMAP upload URL
- [ ] `POST /api/attachments` — proxy upload, return blobId
- [ ] `GET /api/attachments/:blobId` — proxy download
- [ ] File picker in `MailCompose.vue`
- [ ] Attachment display in `MailViewer.vue`

### Phase 9 — Threads + conversations

- [ ] `server/services/jmap/thread.ts` — `Thread/get`
- [ ] `GET /api/threads/:id`
- [ ] `stores/thread.ts`
- [ ] `MailThread.vue` — conversation view
- [ ] Reply / Reply-all / Forward in `MailViewer.vue`

### Phase 10 — Search

- [ ] `GET /api/search?q=…`
- [ ] `Email/query` with `filter.text`
- [ ] Search input in `AppSidebar.vue` / top bar
- [ ] Results page

### Phase 11 — Synchronisation

- [ ] Store JMAP `state` tokens in `stores/mail.ts`
- [ ] `Email/changes` polling on tab focus / return
- [ ] `Mailbox/changes` for unread counts

### Phase 12 — Realtime WebSocket

- [ ] Nuxt WebSocket proxy route (`server/api/mail/ws.ts`)
- [ ] JMAP push subscription
- [ ] Drive `Email/changes` from push notifications
- [ ] Connection status indicator in UI

---

## Security Rules

These rules are non-negotiable.

1. `STALWART_PASSWORD` / user mail passwords are **never** sent to the browser.
2. `Authorization: Basic …` headers are **never** constructed client-side.
3. All JMAP calls happen inside `server/` only.
4. Session cookies are `httpOnly`, `sameSite: strict`, and `secure` in production.
5. The webmail operates with **mail-user permissions** only. Stalwart admin credentials are never used.
6. CSRF protection is applied to all state-changing API routes.

---

## Environment Variables

```text
# .env (server-side only, never exposed to the client)

JMAP_BASE_URL=https://mail.katoemma.website
SESSION_SECRET=<random-32-bytes>
NODE_ENV=production
```

`JMAP_BASE_URL` is the only Stalwart-specific value needed in `.env`. User credentials come in at login time and are held in the encrypted server-side session.

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Client ↔ server transport | Session cookie | Credentials stay server-side |
| JMAP call location | `server/` only | BFF boundary |
| Mail state storage | Stalwart is authoritative | No duplicate mail DB |
| Sync strategy | `Email/changes` with state tokens | Efficient, no full reloads |
| Realtime | WebSocket proxied through BFF | Maintains security boundary |
| Pagination | position + limit (50) | Avoids loading whole mailbox |
| Batching | Multi-method JMAP calls on initial load | Fewer round-trips |
| Error handling | `JmapError` class in `server/utils/jmap-error.ts` | Consistent client error shape |

---

## Reference

- [JMAP-documentation.md](./JMAP-documentation.md) — Full JMAP/Stalwart integration notes
- [RFC 8621](https://jmap.io/spec/rfc8621/) — JMAP for Mail
- [Stalwart JMAP docs](https://www.stalwart.email/docs/http/jmap/)
- [Stalwart Permissions](https://www.stalwart.email/docs/auth/authorization/permissions/)
