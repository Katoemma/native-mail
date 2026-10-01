import type { Mailbox } from '../../../shared/types'
import { JmapClient } from './client'

interface JmapMailbox {
  id: string
  name: string
  role: string | null
  totalEmails: number
  unreadEmails: number
  totalThreads: number
  unreadThreads: number
  parentId: string | null
  sortOrder: number
}

export async function getMailboxes(client: JmapClient, accountId: string): Promise<Mailbox[]> {
  const response = await client.request([
    [
      'Mailbox/get',
      {
        accountId,
        ids: null,
        properties: [
          'id', 'name', 'role', 'totalEmails', 'unreadEmails',
          'totalThreads', 'unreadThreads', 'parentId', 'sortOrder',
        ],
      },
      'mailboxes',
    ],
  ])

  const args = client.getResponse<{ list: JmapMailbox[] }>(response, 'mailboxes')

  return (args.list ?? []).map(m => ({
    id: m.id,
    name: m.name,
    role: (m.role as Mailbox['role']) ?? null,
    totalEmails: m.totalEmails ?? 0,
    unreadEmails: m.unreadEmails ?? 0,
    totalThreads: m.totalThreads ?? 0,
    unreadThreads: m.unreadThreads ?? 0,
    parentId: m.parentId ?? null,
    sortOrder: m.sortOrder ?? 0,
  }))
}

export async function getMailboxChanges(
  client: JmapClient,
  accountId: string,
  sinceState: string,
): Promise<{ created: string[]; updated: string[]; destroyed: string[]; newState: string }> {
  const response = await client.request([
    ['Mailbox/changes', { accountId, sinceState, maxChanges: 100 }, 'mbchanges'],
  ])
  const args = client.getResponse<{
    created: string[]
    updated: string[]
    destroyed: string[]
    newState: string
  }>(response, 'mbchanges')
  return args
}
