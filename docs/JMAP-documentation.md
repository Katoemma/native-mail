Yes. Since you're building the **Nuxt webmail yourself**, I would document JMAP as an **application integration contract**, not as a generic JMAP specification.

Your Nuxt application should treat Stalwart as the mail backend and keep almost all mail state in Stalwart. JMAP is designed specifically for synchronizing mail clients efficiently and supports push updates. ([Stalwart][1])

# Native Webmail — Stalwart JMAP API Integration

**Version:** 1.0
**Frontend:** Nuxt 4 / Vue 3
**Mail backend:** Stalwart Mail Server
**Protocol:** JMAP
**Transport:** HTTPS + WebSocket
**Primary endpoint:** `https://mail.katoemma.website/jmap/`

---

# 1. Architecture

The application should follow:

```text
┌─────────────────────────────────────┐
│           Nuxt Webmail              │
│                                     │
│  Pages                              │
│  ├── Inbox                          │
│  ├── Sent                            │
│  ├── Drafts                          │
│  ├── Trash                           │
│  ├── Spam                            │
│  ├── Compose                         │
│  └── Settings                        │
│                                     │
│  Composables / Stores                │
│  ├── useJmap()                       │
│  ├── useMailboxes()                  │
│  ├── useEmails()                     │
│  ├── useThreads()                    │
│  └── useComposer()                   │
└──────────────────┬──────────────────┘
                   │
                   │ HTTPS / JMAP
                   ▼
┌─────────────────────────────────────┐
│        Stalwart Mail Server         │
│                                     │
│  JMAP                               │
│  SMTP                               │
│  IMAP                               │
│  Mail Storage                       │
│  DKIM / SPF / DMARC                 │
└─────────────────────────────────────┘
```

The Nuxt application should **not directly access RocksDB, mail files, SMTP, or IMAP**.

Everything should go through JMAP.

---

# 2. JMAP Endpoint Discovery

Do not hard-code every JMAP URL.

Start with:

```http
GET https://mail.katoemma.website/.well-known/jmap
```

Stalwart exposes this discovery endpoint and then provides the actual JMAP API URL through the returned session information. ([Stalwart][1])

Typical response:

```json
{
  "capabilities": {
    "urn:ietf:params:jmap:core": {},
    "urn:ietf:params:jmap:mail": {},
    "urn:ietf:params:jmap:submission": {}
  },
  "apiUrl": "https://mail.katoemma.website/jmap/",
  "downloadUrl": "https://mail.katoemma.website/jmap/download/{accountId}/{blobId}/{name}",
  "uploadUrl": "https://mail.katoemma.website/jmap/upload/{accountId}/",
  "eventSourceUrl": "https://mail.katoemma.website/jmap/eventsource/"
}
```

Your application should store these URLs in a JMAP session object.

---

# 3. Authentication

For the webmail application, authentication should happen through HTTPS.

Conceptually:

```text
User
 │
 │ username + password
 ▼
Nuxt
 │
 │ authenticated JMAP request
 ▼
Stalwart
```

For your initial implementation, you can use HTTP Basic Authentication:

```http
Authorization: Basic base64(username:password)
```

For example:

```text
kato@katoemma.website
```

However, **do not put the Stalwart password into Nuxt's public/client-side environment**.

This is extremely important.

### Recommended production architecture

I recommend:

```text
Browser
   │
   │ session cookie
   ▼
Nuxt server
   │
   │ JMAP authentication
   ▼
Stalwart
```

rather than:

```text
Browser
   │
   │ Stalwart username/password
   ▼
Stalwart
```

That gives you a place to implement:

* login sessions
* logout
* CSRF protection
* rate limiting
* session expiration
* account security
* audit logging

If you eventually implement OAuth/OIDC or another authentication layer, the JMAP layer can remain behind the same application abstraction.

---

# 4. JMAP Request Structure

JMAP uses a single JSON request containing one or more method calls.

General structure:

```json
{
  "using": [
    "urn:ietf:params:jmap:core",
    "urn:ietf:params:jmap:mail",
    "urn:ietf:params:jmap:submission"
  ],
  "methodCalls": [
    [
      "Mailbox/get",
      {
        "accountId": "c"
      },
      "call-1"
    ]
  ]
}
```

The three elements are:

```text
[methodName, arguments, clientCallId]
```

The third value lets you correlate responses.

---

# 5. Account ID

Your current Stalwart account ID is:

```text
c
```

But **do not hard-code this**.

After authentication, obtain the JMAP session and use:

```json
{
  "primaryAccounts": {
    "urn:ietf:params:jmap:mail": "c"
  }
}
```

Then:

```ts
const accountId =
  session.primaryAccounts['urn:ietf:params:jmap:mail']
```

This matters because Stalwart could assign a different account ID in another installation/account.

---

# 6. Recommended Nuxt JMAP Client

Create:

```text
server/
└── services/
    └── jmap/
        ├── client.ts
        ├── session.ts
        ├── mailbox.ts
        ├── email.ts
        ├── thread.ts
        ├── submission.ts
        └── identity.ts
```

And expose your own application-level API:

```text
/api/mail/session
/api/mail/mailboxes
/api/mail/emails
/api/mail/threads
/api/mail/send
/api/mail/drafts
/api/mail/attachments
```

The browser talks to **your Nuxt API**, and your Nuxt server talks to JMAP.

---

# 7. Core JMAP Client

Conceptually:

```ts
export class JmapClient {
  constructor(
    private apiUrl: string,
    private auth: string,
  ) {}

  async request(
    methodCalls: unknown[][],
  ) {
    const response = await $fetch(this.apiUrl, {
      method: 'POST',

      headers: {
        Authorization: this.auth,
        'Content-Type': 'application/json',
      },

      body: {
        using: [
          'urn:ietf:params:jmap:core',
          'urn:ietf:params:jmap:mail',
          'urn:ietf:params:jmap:submission',
        ],

        methodCalls,
      },
    })

    return response
  }
}
```

The important design decision is:

> **Your application should have one generic JMAP transport layer, while mail features sit above it.**

---

# 8. Mailboxes

JMAP's `Mailbox` represents folders such as:

```text
Inbox
Sent
Drafts
Trash
Junk
Archive
```

JMAP treats a mailbox as a collection of emails, similar to folders/labels in traditional mail systems. ([JMAP][2])

Your current Stalwart installation has:

```text
a → Inbox
b → Deleted Items
c → Junk Mail
d → Drafts
e → Sent
```

But again, **do not hard-code those IDs**.

Retrieve them:

```json
{
  "using": [
    "urn:ietf:params:jmap:core",
    "urn:ietf:params:jmap:mail"
  ],
  "methodCalls": [
    [
      "Mailbox/get",
      {
        "accountId": "c"
      },
      "mailboxes"
    ]
  ]
}
```

Response will contain:

```json
{
  "methodResponses": [
    [
      "Mailbox/get",
      {
        "accountId": "c",
        "list": [
          {
            "id": "a",
            "name": "Inbox",
            "role": "inbox",
            "totalEmails": 10,
            "unreadEmails": 3,
            "totalThreads": 8,
            "unreadThreads": 2
          }
        ]
      },
      "mailboxes"
    ]
  ]
}
```

Build your UI from `role`, not from IDs.

For example:

```ts
const inbox = mailboxes.find(
  mailbox => mailbox.role === 'inbox'
)
```

This is much safer.

---

# 9. Fetching Emails

There are two major operations:

```text
Email/query
Email/get
```

Think of them as:

```text
Email/query
    ↓
Which emails should I display?

Email/get
    ↓
Give me the actual email data.
```

---

# 10. Inbox Query

For example:

```json
{
  "using": [
    "urn:ietf:params:jmap:core",
    "urn:ietf:params:jmap:mail"
  ],
  "methodCalls": [
    [
      "Email/query",
      {
        "accountId": "c",
        "filter": {
          "inMailbox": "a"
        },
        "sort": [
          {
            "property": "receivedAt",
            "isAscending": false
          }
        ],
        "position": 0,
        "limit": 50
      },
      "inbox-query"
    ]
  ]
}
```

The query gives you IDs.

For example:

```json
{
  "ids": [
    "e123",
    "e124",
    "e125"
  ],
  "total": 3
}
```

Then fetch the emails.

---

# 11. Email/get

Use:

```json
[
  "Email/get",
  {
    "accountId": "c",
    "ids": ["e123", "e124", "e125"],
    "properties": [
      "id",
      "threadId",
      "mailboxIds",
      "keywords",
      "receivedAt",
      "sentAt",
      "size",
      "from",
      "to",
      "cc",
      "bcc",
      "replyTo",
      "subject",
      "preview",
      "hasAttachment",
      "bodyStructure",
      "bodyValues"
    ],
    "fetchTextBodyValues": true,
    "fetchHTMLBodyValues": true
  },
  "inbox-emails"
]
```

This gives your UI the actual messages.

---

# 12. Don't Fetch Everything

For an inbox list, don't fetch:

* complete HTML
* attachments
* large body parts
* full headers

for every email.

Instead:

```text
Inbox
  ↓
Email/query
  ↓
Email/get
  ↓
List properties only
```

When the user opens an email:

```text
Open email
    ↓
Email/get
    ↓
Full body
    ↓
Attachments
```

This will make your application substantially faster.

---

# 13. Email List Model

Your Nuxt application can normalize JMAP data into:

```ts
export interface MailMessage {
  id: string
  threadId: string

  subject: string

  from: MailAddress[]
  to: MailAddress[]

  preview: string

  receivedAt: string | null
  sentAt: string | null

  mailboxIds: Record<string, boolean>

  keywords: Record<string, boolean>

  hasAttachment: boolean

  isRead: boolean
  isStarred: boolean
}
```

Then the UI doesn't need to understand every JMAP detail.

---

# 14. Read / Unread

JMAP uses keywords.

An unread message generally lacks:

```text
$seen
```

So your UI can derive:

```ts
const isRead = '$seen' in email.keywords
```

To mark an email read, update its keywords.

Conceptually:

```json
[
  "Email/set",
  {
    "accountId": "c",
    "update": {
      "e123": {
        "keywords/$seen": true
      }
    }
  },
  "mark-read"
]
```

And unread:

```json
{
  "keywords/$seen": null
}
```

This is preferable to inventing a separate `is_read` state in your own database.

---

# 15. Star / Flag

Use the `$flagged` keyword.

```json
{
  "update": {
    "e123": {
      "keywords/$flagged": true
    }
  }
}
```

Your UI:

```text
⭐ Starred
```

maps directly to:

```text
$flagged
```

---

# 16. Move Email

Moving an email means changing its `mailboxIds`.

For example:

```json
[
  "Email/set",
  {
    "accountId": "c",
    "update": {
      "e123": {
        "mailboxIds": {
          "b": true
        }
      }
    }
  },
  "move-to-trash"
]
```

But for your application, I'd create a higher-level function:

```ts
moveEmail(emailId, mailboxId)
```

so your components never construct JMAP payloads themselves.

---

# 17. Delete Email

For your UI:

```text
Delete
```

should initially mean:

```text
Move to Trash
```

rather than permanently destroying the message.

Permanent deletion should be a separate operation.

---

# 18. Threads

JMAP has a dedicated `Thread` object.

A thread is essentially a group of related emails. JMAP exposes the email IDs belonging to a thread in chronological order. ([JMAP][2])

Fetch:

```json
[
  "Thread/get",
  {
    "accountId": "c",
    "ids": ["b"]
  },
  "thread"
]
```

Response:

```json
{
  "id": "b",
  "emailIds": [
    "e123",
    "e124",
    "e125"
  ]
}
```

Your conversation UI becomes:

```text
Conversation
────────────────────────

John
Re: Project update
Yesterday

You
Re: Project update
Yesterday

John
Re: Project update
Today
```

---

# 19. Compose

This is where JMAP becomes particularly useful.

The workflow should be:

```text
Compose
   │
   ▼
Upload attachments
   │
   ▼
Create Email
   │
   ▼
Create EmailSubmission
   │
   ▼
Stalwart SMTP
```

---

# 20. Identity

Before sending, retrieve the user's identities:

```json
[
  "Identity/get",
  {
    "accountId": "c"
  },
  "identities"
]
```

Your current identity is:

```text
id: b
name: Kato Emmanuel
email: kato@katoemma.website
```

Do not hard-code `b`.

Your compose UI should use the returned identity.

---

# 21. Creating an Email

An email needs a mailbox.

Your earlier test demonstrated an important point:

```text
mailboxIds
```

is required for your stored outgoing message.

Your Sent mailbox currently happens to be:

```text
e
```

So conceptually:

```json
[
  "Email/set",
  {
    "accountId": "c",
    "create": {
      "draft": {
        "mailboxIds": {
          "d": true
        },
        "to": [
          {
            "email": "recipient@example.com"
          }
        ],
        "subject": "Hello",
        "bodyStructure": {
          "type": "text/plain"
        }
      }
    }
  },
  "create-email"
]
```

For a real application, you'll normally create the message as a **draft** first.

---

# 22. Attachments

Use the JMAP upload endpoint discovered from the session:

```text
/upload/{accountId}/
```

Upload:

```http
POST /jmap/upload/{accountId}/
Content-Type: application/octet-stream
```

The response gives you a blob ID.

Then reference that blob in the email body structure.

Your application architecture should therefore be:

```text
File picker
    ↓
Nuxt server
    ↓
JMAP upload
    ↓
blobId
    ↓
Email/set
    ↓
attachment
```

Do not send the entire attachment through your normal JSON JMAP method call.

---

# 23. Sending

Once the email exists:

```text
EmailSubmission/set
```

Example:

```json
[
  "EmailSubmission/set",
  {
    "accountId": "c",
    "create": {
      "submission": {
        "emailId": "e123",
        "identityId": "b"
      }
    }
  },
  "send"
]
```

Your actual identity ID must come from `Identity/get`.

The JMAP specification defines `EmailSubmission` as the object representing submission of an email for delivery to recipients. ([JMAP][2])

---

# 24. Drafts

Your draft system should be entirely JMAP-backed.

```text
New message
     ↓
Email/set
     ↓
Drafts mailbox
```

As the user types:

```text
Auto-save
    ↓
Email/set
    ↓
Draft updated
```

Your Nuxt app doesn't need a separate `drafts` database table.

---

# 25. Reply

For Reply:

```text
Original Email
       ↓
Extract:
- from
- replyTo
- threadId
- Message-ID
- References
       ↓
Create new Email
       ↓
EmailSubmission
```

The new email should belong to the same conversation/thread according to the normal JMAP message/thread semantics.

Your UI can expose:

```text
Reply
Reply all
Forward
```

as separate operations.

---

# 26. Forward

Forward is similar:

```text
Email
  ↓
Create new Email
  ↓
new recipients
  ↓
quoted/forwarded content
  ↓
attachments if required
  ↓
EmailSubmission
```

---

# 27. Search

Use:

```text
Email/query
```

rather than downloading your whole mailbox and searching in JavaScript.

For example:

```json
{
  "accountId": "c",
  "filter": {
    "text": "invoice"
  },
  "sort": [
    {
      "property": "receivedAt",
      "isAscending": false
    }
  ],
  "limit": 50
}
```

This allows Stalwart to perform the mail search.

---

# 28. Pagination

Never load thousands of emails at once.

Use:

```json
{
  "position": 0,
  "limit": 50
}
```

Then:

```text
0 → 50
50 → 100
100 → 150
```

For the UI, I'd use:

```text
Infinite scrolling
```

or:

```text
Load more
```

rather than traditional numbered pagination.

---

# 29. Changes / Synchronization

This is one of the most important parts of your application.

Do **not** repeatedly reload the entire inbox.

JMAP provides `/changes` methods specifically for synchronization. Stalwart exposes permissions for email changes, mailbox changes, query changes, submission changes, etc. ([Stalwart][3])

The general pattern is:

```text
Initial load
     ↓
Email/query
     ↓
Email/get
     ↓
Store state
     ↓
Get state token
     ↓
Email/changes
     ↓
Apply changes
     ↓
Repeat
```

For example:

```json
[
  "Email/changes",
  {
    "accountId": "c",
    "sinceState": "previous-state"
  },
  "changes"
]
```

Response conceptually contains:

```json
{
  "oldState": "abc",
  "newState": "def",
  "hasMoreChanges": false,
  "created": [],
  "updated": ["e123"],
  "destroyed": ["e456"]
}
```

Your store then updates only the affected messages.

---

# 30. Realtime WebSocket

Stalwart also advertises a JMAP WebSocket endpoint in the JMAP session.

Your architecture should eventually be:

```text
Nuxt
 │
 ├── HTTPS JMAP
 │      └── initial state
 │
 └── WebSocket
        └── change notifications
```

When Stalwart tells you something changed:

```text
WebSocket
    ↓
notification
    ↓
Email/changes
    ↓
update Pinia store
    ↓
Vue UI reacts
```

Don't treat the WebSocket notification itself as the complete message data. Use it as a trigger to synchronize state.

---

# 31. Recommended Pinia State

I'd use something like:

```text
stores/
├── mail.ts
├── mailboxes.ts
├── threads.ts
├── composer.ts
└── session.ts
```

### Mail store

```ts
interface MailState {
  emails: Record<string, MailMessage>
  selectedEmailId: string | null

  loading: boolean
  error: string | null

  state: string | null
}
```

### Mailbox store

```ts
interface MailboxState {
  mailboxes: Mailbox[]
  selectedMailboxId: string | null
}
```

### Session

```ts
interface JmapSession {
  apiUrl: string
  uploadUrl: string
  downloadUrl: string
  eventSourceUrl: string

  accountId: string

  capabilities: Record<string, unknown>
}
```

---

# 32. Application Service Layer

I recommend this structure:

```text
server/
└── services/
    └── jmap/
        ├── client.ts
        │
        ├── session.ts
        │
        ├── mailbox.ts
        │   ├── get()
        │   ├── query()
        │   ├── create()
        │   ├── update()
        │   └── destroy()
        │
        ├── email.ts
        │   ├── get()
        │   ├── query()
        │   ├── changes()
        │   ├── create()
        │   ├── update()
        │   └── destroy()
        │
        ├── thread.ts
        │   └── get()
        │
        ├── identity.ts
        │   └── get()
        │
        ├── submission.ts
        │   ├── create()
        │   ├── get()
        │   └── changes()
        │
        └── attachment.ts
            └── upload()
```

This is much cleaner than having JMAP JSON scattered across Vue components.

---

# 33. Nuxt API Layer

Your browser should ideally call:

```text
GET    /api/mail/session

GET    /api/mailboxes
GET    /api/mailboxes/:id/emails

GET    /api/emails/:id
PATCH  /api/emails/:id

POST   /api/emails
POST   /api/emails/:id/send

POST   /api/emails/:id/read
POST   /api/emails/:id/star
POST   /api/emails/:id/move

POST   /api/attachments

GET    /api/threads/:id
```

The API implementation translates those operations into JMAP.

That gives you a **Native Webmail API** independent of Stalwart's internal protocol details.

---

# 34. Important: Don't Create Your Own Mail Database

I would **not** create tables such as:

```text
emails
mailboxes
threads
attachments
```

in your Nuxt application's database just to duplicate Stalwart.

Stalwart is already the authoritative mail store.

Your application should maintain only temporary/session/UI state.

For example:

```text
Stalwart
    ↓
Authoritative mail data

Nuxt
    ↓
Cached UI state
```

If you eventually need application-specific data:

```text
user_preferences
mail_ui_settings
contacts_metadata
audit_events
```

that's different.

---

# 35. Error Handling

JMAP errors should be normalized.

For example:

```ts
export class JmapError extends Error {
  constructor(
    public type: string,
    public description?: string,
    public properties?: string[],
  ) {
    super(description ?? type)
  }
}
```

Then your UI can distinguish:

```text
invalidArguments
notFound
serverFail
accountNotFound
invalidPatch
forbidden
stateMismatch
```

instead of displaying raw JMAP responses.

---

# 36. State Mismatch

This is particularly important when two devices modify the same message.

JMAP uses state tokens to protect synchronization.

Your implementation should handle:

```text
stateMismatch
```

by:

```text
1. Stop local mutation
2. Fetch changes
3. Update local state
4. Retry operation if appropriate
```

Don't blindly overwrite the server state.

---

# 37. Batch Requests

One of JMAP's major advantages is that you can put multiple method calls into one request.

For example:

```text
Mailbox/get
Email/query
Email/get
Identity/get
```

can be sent together.

Your inbox initial load can therefore conceptually be:

```text
POST /jmap/

├── Mailbox/get
├── Email/query
├── Email/get
└── Identity/get
```

rather than four separate HTTP requests.

Stalwart's JMAP configuration supports multiple method calls per request; its current default maximum is 16. ([Stalwart][4])

---

# 38. JMAP Dependencies

JMAP also supports references between method calls.

This allows patterns such as:

```text
Email/query
     ↓
Email/get results
```

without your client necessarily making separate HTTP requests.

For the first version of your webmail, however, I'd keep this simple and use explicit calls until the basic application is stable.

---

# 39. Downloading Attachments

Your session gives you a download template:

```text
/jmap/download/{accountId}/{blobId}/{name}
```

Your application should construct download URLs from the discovered session URL rather than hard-coding them.

For example:

```ts
const url = session.downloadUrl
  .replace('{accountId}', accountId)
  .replace('{blobId}', blobId)
  .replace('{name}', filename)
```

---

# 40. Security Rules

For Native Webmail, I would enforce these rules:

### Never expose:

```text
STALWART_PASSWORD
```

to client-side JavaScript.

### Never put:

```text
Authorization: Basic ...
```

in browser localStorage.

### Don't store:

```text
mail passwords
```

in Pinia.

### Don't expose:

```text
STALWART_ADMIN credentials
```

to the webmail application.

The webmail should operate with the **mail user's permissions**, not Stalwart administrator permissions.

Stalwart has granular JMAP permissions for operations such as email get/set/query, mailbox operations, identity operations and submission operations. ([Stalwart][3])

---

# 41. Recommended First Version

Don't implement all of JMAP immediately.

Build the application in this order:

### Phase 1 — Authentication

```text
Login
   ↓
JMAP session
   ↓
Account ID
```

### Phase 2 — Mailboxes

```text
Inbox
Sent
Drafts
Trash
Junk
```

### Phase 3 — Inbox

```text
Email/query
Email/get
```

### Phase 4 — Reading

```text
HTML
Plain text
Attachments
Headers
```

### Phase 5 — Message state

```text
Read/unread
Star
Archive
Trash
Move
```

### Phase 6 — Compose

```text
Create draft
Auto-save
Attachments
Send
```

### Phase 7 — Conversations

```text
Thread/get
Reply
Reply all
Forward
```

### Phase 8 — Search

```text
Email/query
text filter
```

### Phase 9 — Synchronization

```text
Email/changes
Mailbox/changes
```

### Phase 10 — Realtime

```text
WebSocket
   ↓
changes
   ↓
Pinia
   ↓
UI
```

That gives you a proper webmail client rather than simply a Nuxt frontend that happens to call Stalwart.

---

# 42. The Core JMAP Operations You Need

For the first production version, this is your essential API surface:

| Feature               | JMAP                      |
| --------------------- | ------------------------- |
| Session               | `/.well-known/jmap`       |
| Mailboxes             | `Mailbox/get`             |
| Mailbox changes       | `Mailbox/changes`         |
| Inbox listing         | `Email/query`             |
| Email data            | `Email/get`               |
| Email synchronization | `Email/changes`           |
| Modify email          | `Email/set`               |
| Threads               | `Thread/get`              |
| Identity              | `Identity/get`            |
| Upload attachment     | JMAP upload URL           |
| Download attachment   | JMAP download URL         |
| Create draft          | `Email/set`               |
| Send                  | `EmailSubmission/set`     |
| Submission status     | `EmailSubmission/get`     |
| Submission changes    | `EmailSubmission/changes` |
| Search                | `Email/query`             |
| Realtime              | JMAP WebSocket            |

This covers the overwhelming majority of what your Nuxt webmail needs. JMAP's mail specification defines Mailbox, Thread, Email, SearchSnippet and EmailSubmission as the core mail data types. ([JMAP][2])

---

# 43. Your Actual Stalwart Configuration

Based on the Stalwart instance we've been working with, your current values are:

```text
JMAP discovery:
https://mail.katoemma.website/.well-known/jmap

JMAP API:
https://mail.katoemma.website/jmap/

WebSocket:
wss://mail.katoemma.website/jmap/ws

Account:
kato@katoemma.website

Mail account ID:
c

Inbox:
a

Trash:
b

Junk:
c

Drafts:
d

Sent:
e

Identity:
b
```

**The IDs above are for your current installation only.** Your Nuxt code should discover them dynamically.

---

## 44. The Most Important Architectural Decision

I would build your application around this abstraction:

```text
                    ┌─────────────────┐
                    │   Vue Components │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Pinia Stores  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Mail Services   │
                    │                 │
                    │ MailService     │
                    │ ThreadService   │
                    │ DraftService    │
                    │ SearchService   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   JmapClient    │
                    └────────┬────────┘
                             │
                         HTTPS
                             │
                    ┌────────▼────────┐
                    │    Stalwart    │
                    │      JMAP      │
                    └─────────────────┘
```

The Vue components should **never contain raw JMAP calls**.

For example, this is what you want:

```ts
await mailStore.markAsRead(emailId)
```

not:

```ts
await $fetch('/jmap', {
  body: {
    using: [...],
    methodCalls: [...]
  }
})
```

That separation will make the Native webmail codebase much easier to maintain.

---

### Official references

The current Stalwart JMAP documentation confirms JMAP discovery at `/.well-known/jmap`, the `/jmap` API endpoint, and JMAP's push/synchronization capabilities. ([Stalwart][1])

[Stalwart JMAP documentation](https://www.stalwart.email/docs/http/jmap/?utm_source=chatgpt.com)

[JMAP Mail RFC 8621](https://jmap.io/spec/rfc8621/?utm_source=chatgpt.com)

[Stalwart JMAP protocol configuration](https://www.stalwart.email/docs/http/jmap/protocol/?utm_source=chatgpt.com)

**One correction from our earlier experimentation:** `x:Domain/get`, `x:Email/get`, etc. are **Stalwart administrative/system objects**, not what your normal webmail should use. The normal user mail client should use the standard `Mailbox/*`, `Email/*`, `Thread/*`, `Identity/*`, and `EmailSubmission/*` APIs. Stalwart documents the `x:*` objects as requiring system permissions such as `sysDomainGet`, whereas the ordinary mail permissions are separately defined. ([Stalwart][5])

For **Native**, I'd make the next document the actual **JMAP API contract for your Nuxt codebase**, with TypeScript interfaces, request/response examples, `JmapClient`, server routes, Pinia stores, and the exact implementation of **Inbox → read email → compose → attachment → send → realtime sync**.

[1]: https://www.stalwart.email/docs/http/jmap/?utm_source=chatgpt.com "Overview | Stalwart"
[2]: https://jmap.io/spec/rfc8621/?utm_source=chatgpt.com "RFC 8621 – The JSON Meta Application Protocol (JMAP) for Mail"
[3]: https://www.stalwart.email/docs/auth/authorization/permissions/?utm_source=chatgpt.com "Permissions | Stalwart"
[4]: https://www.stalwart.email/docs/http/jmap/protocol/?utm_source=chatgpt.com "Protocol | Stalwart"
[5]: https://www.stalwart.email/docs/ref/object/domain/?utm_source=chatgpt.com "Domain | Stalwart"
