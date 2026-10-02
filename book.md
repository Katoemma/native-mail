from 
https://mail.katoemma.website/.well-known/jmap

{
    "capabilities": {
        "urn:ietf:params:jmap:core": {
            "maxSizeUpload": 50000000,
            "maxConcurrentUpload": 4,
            "maxSizeRequest": 10000000,
            "maxConcurrentRequests": 4,
            "maxCallsInRequest": 16,
            "maxObjectsInGet": 500,
            "maxObjectsInSet": 500,
            "collationAlgorithms": [
                "i;ascii-numeric",
                "i;ascii-casemap",
                "i;unicode-casemap"
            ]
        },
        "urn:ietf:params:jmap:mail": {},
        "urn:ietf:params:jmap:calendars": {},
        "urn:ietf:params:jmap:calendars:parse": {},
        "urn:ietf:params:jmap:contacts": {},
        "urn:ietf:params:jmap:contacts:parse": {},
        "urn:ietf:params:jmap:filenode": {},
        "urn:ietf:params:jmap:principals": {},
        "urn:ietf:params:jmap:principals:availability": {},
        "urn:ietf:params:jmap:submission": {},
        "urn:ietf:params:jmap:vacationresponse": {},
        "urn:ietf:params:jmap:sieve": {
            "implementation": "Stalwart v1.0.0"
        },
        "urn:ietf:params:jmap:blob": {},
        "urn:ietf:params:jmap:quota": {},
        "urn:ietf:params:jmap:emailpush": {},
        "urn:ietf:params:jmap:webpush-vapid": {
            "applicationServerKey": "BO4VOBL6JKVGznr_tkeD4bBqvEemGQqBH-HZhnjLF4_pvGf-mMopVaZBrOoL1ztP85hsheS6ogf-U55U7r0WYSI"
        },
        "urn:ietf:params:jmap:websocket": {
            "url": "wss://mail.katoemma.website/jmap/ws",
            "supportsPush": true
        }
    },
    "accounts": {},
    "primaryAccounts": {},
    "username": "",
    "apiUrl": "https://mail.katoemma.website/jmap/",
    "downloadUrl": "https://mail.katoemma.website/jmap/download/{accountId}/{blobId}/{name}?accept={type}",
    "uploadUrl": "https://mail.katoemma.website/jmap/upload/{accountId}/",
    "eventSourceUrl": "https://mail.katoemma.website/jmap/eventsource/?types={types}&closeafter={closeafter}&ping={ping}",
    "state": "0"
}


more info from research

Exactly. **This response gives us the important information we needed.** Your Stalwart installation explicitly advertises JMAP WebSocket support:

```json
"urn:ietf:params:jmap:websocket": {
  "url": "wss://mail.katoemma.website/jmap/ws",
  "supportsPush": true
}
```

So for your Nuxt mail application, you can connect directly to:

```text
wss://mail.katoemma.website/jmap/ws
```

The key point is that **this is Stalwart's WebSocket, not Nitro's WebSocket server**.

## Your architecture

I would now build it like this:

```text
                    Nuxt Mail
                       │
          ┌────────────┴────────────┐
          │                         │
       HTTP/JMAP                WebSocket
          │                         │
          ▼                         ▼
https://mail.../jmap       wss://mail.../jmap/ws
          │                         │
          └────────────┬────────────┘
                       ▼
                    Stalwart
```

HTTP handles your actual mail operations:

```text
Mailbox/get
Email/query
Email/get
Email/set
EmailSubmission/set
```

WebSocket handles realtime notifications.

---

# 1. Your JMAP session is telling us everything

From your response:

```json
"apiUrl": "https://mail.katoemma.website/jmap/"
```

So your JMAP API is:

```text
https://mail.katoemma.website/jmap/
```

Your WebSocket is:

```text
wss://mail.katoemma.website/jmap/ws
```

And Stalwart says:

```json
"supportsPush": true
```

That's exactly what we want for your Gmail-like application.

You also have:

```json
"urn:ietf:params:jmap:emailpush": {}
```

which means your server supports the JMAP email push capability as well.

---

# 2. But notice something important

Your response has:

```json
"accounts": {},
"primaryAccounts": {},
"username": ""
```

That means **this JMAP session is currently unauthenticated**.

After your user authenticates, you should get something more like:

```json
"accounts": {
    "u123456": {
        "name": "John Doe",
        "isPersonal": true,
        "isReadOnly": false,
        "accountCapabilities": {
            "urn:ietf:params:jmap:mail": {}
        }
    }
},
"primaryAccounts": {
    "urn:ietf:params:jmap:mail": "u123456"
},
"username": "john@example.com"
```

The actual values will be different.

Your Nuxt application should **not hard-code the account ID**.

Get it from the authenticated JMAP session.

---

# 3. How your Nuxt application should work

I'd create a JMAP client:

```text
composables/
    useJmap.ts

services/
    jmap/
        client.ts
        mailbox.ts
        email.ts
        submission.ts
        websocket.ts
```

The responsibilities are:

```text
useJmap()
    │
    ├── session
    ├── account
    ├── mailboxes
    ├── emails
    └── realtime
```

---

# 4. First: get the authenticated JMAP session

After the user logs in, request:

```text
GET https://mail.katoemma.website/.well-known/jmap
```

with the user's authentication.

You should then get:

```json
{
    "capabilities": {},
    "accounts": {
        "ACCOUNT_ID": {}
    },
    "primaryAccounts": {
        "urn:ietf:params:jmap:mail": "ACCOUNT_ID"
    },
    "username": "user@example.com",
    "apiUrl": "...",
    "downloadUrl": "...",
    "uploadUrl": "...",
    "eventSourceUrl": "...",
    "state": "..."
}
```

Store the session information in your Nuxt server-side session.

---

# 5. Then connect to the WebSocket

Your client needs:

```ts
const websocketUrl = 'wss://mail.katoemma.website/jmap/ws'

const socket = new WebSocket(websocketUrl)
```

However, **don't immediately start sending arbitrary JSON to it**.

JMAP WebSocket has its own protocol.

The connection needs to be initialized according to the JMAP WebSocket specification.

The important distinction is:

```text
Nuxt WebSocket API
        ↓
WebSocket transport

JMAP WebSocket protocol
        ↓
What you actually send/receive
```

The Nuxt documentation you pasted only explains the first part.

---

# 6. The WebSocket should be a realtime channel

Your application shouldn't do:

```text
WebSocket → send entire inbox
```

Instead:

```text
Stalwart
   │
   │ state changed
   ▼
WebSocket
   │
   ▼
Nuxt
   │
   │ JMAP request
   ▼
/jmap/
   │
   ▼
Get changed emails
```

This is important.

Suppose your inbox currently has:

```text
state = 100
```

A new email arrives.

Stalwart changes the state:

```text
state = 101
```

The WebSocket tells your application that something changed.

Your Nuxt application then synchronizes the relevant data.

---

# 7. This gives you Gmail-like behaviour

Your page starts with:

```text
Inbox

John       Project proposal
Sarah      Invoice #102
David      Meeting
```

Then another person sends an email.

You don't refresh.

You don't poll every five seconds.

Instead:

```text
                    Stalwart
                       │
                   new email
                       │
                       ▼
                  JMAP WebSocket
                       │
                       ▼
                   Nuxt client
                       │
                 state changed
                       │
                       ▼
                  JMAP /jmap
                       │
                       ▼
                   Email/query
                       │
                       ▼
                   Vue state
                       │
                       ▼
              Inbox updates
```

That's the architecture you want.

---

# 8. Your `useJmapRealtime()` composable

I would eventually have something along these lines:

```ts
// composables/useJmapRealtime.ts

export function useJmapRealtime() {
    const connected = ref(false)

    let socket: WebSocket | null = null

    function connect(url: string) {
        if (socket) {
            return
        }

        socket = new WebSocket(url)

        socket.onopen = () => {
            connected.value = true

            console.log('JMAP WebSocket connected')
        }

        socket.onmessage = (event) => {
            handleJmapMessage(event.data)
        }

        socket.onclose = () => {
            connected.value = false
            socket = null

            console.log('JMAP WebSocket disconnected')
        }

        socket.onerror = (error) => {
            console.error('JMAP WebSocket error', error)
        }
    }

    function disconnect() {
        socket?.close()
        socket = null
    }

    function handleJmapMessage(data: string) {
        console.log('JMAP message:', data)
    }

    return {
        connected,
        connect,
        disconnect,
    }
}
```

That's just the transport layer.

**We should not yet treat that as the complete JMAP implementation.**

---

# 9. You don't need Nitro WebSocket

This is the biggest takeaway from the Nuxt documentation you posted.

You don't need:

```ts
// server/routes/ws/jmap.ts
```

for this.

That would create:

```text
Browser
   │
   ▼
Nuxt WebSocket
   │
   ▼
Stalwart
```

Instead you want:

```text
Browser
   │
   ├──────── HTTPS ────────► Stalwart JMAP
   │
   └──────── WSS ──────────► Stalwart JMAP WebSocket
```

Your Nuxt server can still handle OAuth and sensitive operations, but **the JMAP WebSocket itself can be a browser → Stalwart connection** if the authentication setup supports the browser client.

---

# 10. Your other JMAP endpoints are also useful

You have:

### Download

```text
https://mail.katoemma.website/jmap/download/{accountId}/{blobId}/{name}
```

Useful for:

```text
attachments
inline images
downloads
```

### Upload

```text
https://mail.katoemma.website/jmap/upload/{accountId}/
```

Useful for:

```text
email attachments
```

### EventSource

```text
https://mail.katoemma.website/jmap/eventsource/
```

This is another realtime mechanism available from your Stalwart configuration.

### WebSocket

```text
wss://mail.katoemma.website/jmap/ws
```

This is what we're interested in for your realtime JMAP client.

---

# 11. One thing I want you to verify before we write the actual code

The response you pasted is **unauthenticated**, because:

```json
"accounts": {},
"primaryAccounts": {},
"username": ""
```

So don't start implementing the mailbox synchronization yet.

First get your OAuth/login flow working so that the same JMAP session request returns:

```text
username
+
account ID
+
primaryAccounts
```

For example:

```text
username:
    user@katoemma.website

primary mail account:
    7f8c...

apiUrl:
    https://mail.katoemma.website/jmap/

websocket:
    wss://mail.katoemma.website/jmap/ws
```

Once you have that, we can implement the actual flow:

```text
LOGIN
  ↓
OAuth
  ↓
Nuxt session
  ↓
JMAP session
  ↓
Account ID
  ↓
Mailbox/get
  ↓
Email/query
  ↓
Email/get
  ↓
JMAP WebSocket
  ↓
Realtime state changes
  ↓
Synchronize inbox
```

**That is the right foundation for your Nuxt Gmail-style application.**
