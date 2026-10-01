import { JmapClient } from './client'

export async function submitEmail(
  client: JmapClient,
  accountId: string,
  emailId: string,
  identityId: string,
): Promise<string> {
  const response = await client.request([
    [
      'EmailSubmission/set',
      {
        accountId,
        create: {
          submission: {
            emailId,
            identityId,
          },
        },
      },
      'submission',
    ],
  ])
  const args = client.getResponse<{
    created: Record<string, { id: string }>
  }>(response, 'submission')

  const created = args.created?.submission
  if (!created?.id) throw new Error('Email submission failed')
  return created.id
}
