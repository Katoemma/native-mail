import type { MailThread } from '../../../shared/types'
import { JmapClient } from './client'

export async function getThreads(
  client: JmapClient,
  accountId: string,
  ids: string[],
): Promise<MailThread[]> {
  if (!ids.length) return []
  const response = await client.request([
    ['Thread/get', { accountId, ids }, 'threads'],
  ])
  const args = client.getResponse<{ list: { id: string; emailIds: string[] }[] }>(
    response, 'threads',
  )
  return (args.list ?? []).map(t => ({ id: t.id, emailIds: t.emailIds ?? [] }))
}
