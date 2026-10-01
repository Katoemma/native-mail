import type { Identity } from '../../../shared/types'
import { JmapClient } from './client'

interface JmapIdentity {
  id: string
  name: string
  email: string
  replyTo: { name?: string; email: string }[] | null
  bcc: { name?: string; email: string }[] | null
}

export async function getIdentities(
  client: JmapClient,
  accountId: string,
): Promise<Identity[]> {
  const response = await client.request([
    ['Identity/get', { accountId, ids: null }, 'identities'],
  ])
  const args = client.getResponse<{ list: JmapIdentity[] }>(response, 'identities')
  return (args.list ?? []).map(i => ({
    id: i.id,
    name: i.name,
    email: i.email,
    replyTo: i.replyTo ?? null,
    bcc: i.bcc ?? null,
  }))
}
