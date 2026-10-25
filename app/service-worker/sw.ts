/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import type { PrecacheEntry } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (PrecacheEntry | string)[]
}

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

try {
  const handler = createHandlerBoundToURL('/')
  registerRoute(new NavigationRoute(handler, {
    denylist: [/^\/api\//, /^\/ws\//],
  }))
}
catch {
  // Precache may be empty in some builds
}

// ── Push payload types (JMAP) ────────────────────────────────────────────────

interface PushVerification {
  '@type': 'PushVerification'
  pushSubscriptionId: string
  verificationCode: string
}

interface EmailPushAddress {
  name?: string
  email?: string
}

interface EmailPushMessage {
  id?: string
  subject?: string
  preview?: string
  from?: EmailPushAddress[]
}

interface EmailPush {
  '@type': 'EmailPush'
  accountId?: string
  emails?: EmailPushMessage[]
  // Stalwart older shape
  email?: { subject?: string }
}

interface StateChange {
  '@type': 'StateChange'
  changed?: Record<string, unknown>
}

interface PushGroup {
  '@type': 'Group'
  entries: PushObject[]
}

type PushObject = PushVerification | EmailPush | StateChange | PushGroup

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object'
}

function parsePush(data: unknown): PushObject | null {
  if (!isRecord(data) || typeof data['@type'] !== 'string') return null
  return data as unknown as PushObject
}

function senderLabel(from?: EmailPushAddress[]): string {
  if (!from?.length) return 'New mail'
  const a = from[0]
  return (a.name || a.email || 'New mail').trim() || 'New mail'
}

async function showEmailNotification(email: EmailPushMessage) {
  const title = senderLabel(email.from)
  const body = (email.subject || email.preview || 'You have a new message').trim()
  const url = email.id ? `/mail/inbox?id=${encodeURIComponent(email.id)}` : '/mail/inbox'

  await self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: email.id ? `email-${email.id}` : 'email-new',
    renotify: true,
    data: { url },
  })
}

async function handlePushObject(obj: PushObject): Promise<void> {
  switch (obj['@type']) {
    case 'PushVerification': {
      await fetch('/api/push/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pushSubscriptionId: obj.pushSubscriptionId,
          verificationCode: obj.verificationCode,
        }),
      })
      break
    }
    case 'EmailPush': {
      const emails = obj.emails?.length
        ? obj.emails
        : [{ subject: obj.email?.subject || 'New mail' }]
      for (const email of emails) {
        await showEmailNotification(email)
      }
      break
    }
    case 'Group': {
      for (const entry of obj.entries ?? []) {
        await handlePushObject(entry)
      }
      break
    }
    case 'StateChange':
      // We subscribe with types: [] + emailPush only — ignore StateChange noise
      break
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let raw: unknown = null
    try {
      raw = event.data ? event.data.json() : null
    }
    catch {
      try {
        const text = event.data?.text()
        raw = text ? JSON.parse(text) : null
      }
      catch {
        raw = null
      }
    }

    const obj = parsePush(raw)
    if (!obj) {
      await self.registration.showNotification('Native Mail', {
        body: 'You have a new message',
        icon: '/pwa-192x192.png',
        tag: 'email-fallback',
        data: { url: '/mail/inbox' },
      })
      return
    }

    await handlePushObject(obj)
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url || '/mail/inbox'

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of all) {
      if ('focus' in client) {
        await client.focus()
        if ('navigate' in client) {
          await (client as WindowClient).navigate(url)
        }
        return
      }
    }
    await self.clients.openWindow(url)
  })())
})
