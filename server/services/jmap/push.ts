import { JmapClient } from './client'
import { getMailboxes } from './mailbox'
import { JmapError } from '../../utils/jmap-error'
import type { JmapSession } from '../../../shared/types'

export interface BrowserPushKeys {
  p256dh: string
  auth: string
}

export interface CreatePushInput {
  deviceClientId: string
  url: string
  keys: BrowserPushKeys
  /** Optional expiry ISO date */
  expires?: string | null
}

export interface CreatePushResult {
  id: string
}

function hasEmailPush(session: JmapSession): boolean {
  return 'urn:ietf:params:jmap:emailpush' in (session.capabilities ?? {})
}

function pushUsing(includeEmailPush: boolean): string[] {
  const using = [
    'urn:ietf:params:jmap:core',
    'urn:ietf:params:jmap:mail',
  ]
  if (includeEmailPush) using.push('urn:ietf:params:jmap:emailpush')
  return using
}

export function getVapidPublicKey(session: JmapSession): string | null {
  const vapid = session.capabilities?.['urn:ietf:params:jmap:webpush-vapid'] as
    | { applicationServerKey?: string }
    | undefined
  return vapid?.applicationServerKey?.trim() || null
}

/**
 * Register a browser Web Push endpoint with Stalwart via PushSubscription/set.
 * Uses emailPush (inbox only) when the server advertises emailpush.
 */
export async function createPushSubscription(
  client: JmapClient,
  session: JmapSession,
  input: CreatePushInput,
): Promise<CreatePushResult> {
  const create: Record<string, unknown> = {
    deviceClientId: input.deviceClientId,
    url: input.url,
    keys: {
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    },
    // Empty types → no StateChange noise; EmailPush covers new mail
    types: [],
  }

  if (input.expires) create.expires = input.expires

  if (hasEmailPush(session)) {
    const mailboxes = await getMailboxes(client, session.accountId)
    const inbox = mailboxes.find(m => m.role === 'inbox')
    if (inbox) {
      create.emailPush = {
        [session.accountId]: {
          filter: { inMailbox: inbox.id },
          properties: ['id', 'from', 'subject', 'preview'],
          urgency: 'high',
        },
      }
    }
  }

  const response = await client.request([
    [
      'PushSubscription/set',
      {
        create: { sub: create },
      },
      'pushset',
    ],
  ], pushUsing(hasEmailPush(session)))

  const args = client.getResponse<{
    created?: Record<string, { id: string }>
    notCreated?: Record<string, { type?: string; description?: string }>
  }>(response, 'pushset')

  const created = args.created?.sub
  if (created?.id) return { id: created.id }

  const err = args.notCreated?.sub
  throw new JmapError(
    err?.type ?? 'serverFail',
    err?.description ?? 'Failed to create push subscription',
    undefined,
    502,
  )
}

export async function verifyPushSubscription(
  client: JmapClient,
  pushSubscriptionId: string,
  verificationCode: string,
): Promise<void> {
  const response = await client.request([
    [
      'PushSubscription/set',
      {
        update: {
          [pushSubscriptionId]: { verificationCode },
        },
      },
      'pushverify',
    ],
  ], pushUsing(false))

  const args = client.getResponse<{
    updated?: string[]
    notUpdated?: Record<string, { type?: string; description?: string }>
  }>(response, 'pushverify')

  if (args.updated?.includes(pushSubscriptionId)) return

  const err = args.notUpdated?.[pushSubscriptionId]
  throw new JmapError(
    err?.type ?? 'serverFail',
    err?.description ?? 'Failed to verify push subscription',
    undefined,
    502,
  )
}

export async function destroyPushSubscription(
  client: JmapClient,
  pushSubscriptionId: string,
): Promise<void> {
  const response = await client.request([
    [
      'PushSubscription/set',
      {
        destroy: [pushSubscriptionId],
      },
      'pushdestroy',
    ],
  ], pushUsing(false))

  const args = client.getResponse<{
    destroyed?: string[]
    notDestroyed?: Record<string, { type?: string; description?: string }>
  }>(response, 'pushdestroy')

  if (args.destroyed?.includes(pushSubscriptionId)) return

  // Already gone is fine
  const err = args.notDestroyed?.[pushSubscriptionId]
  if (err?.type === 'notFound') return

  if (err) {
    throw new JmapError(
      err.type ?? 'serverFail',
      err.description ?? 'Failed to destroy push subscription',
      undefined,
      502,
    )
  }
}
