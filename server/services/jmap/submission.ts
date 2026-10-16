import { JmapClient } from './client'

export async function submitEmail(
  client: JmapClient,
  accountId: string,
  emailId: string,
  identityId: string,
  draftsMailboxId: string,
  sentMailboxId: string,
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
        // On successful delivery: leave Drafts, land in Sent, drop $draft.
        onSuccessUpdateEmail: {
          '#submission': {
            [`mailboxIds/${draftsMailboxId}`]: null,
            [`mailboxIds/${sentMailboxId}`]: true,
            'keywords/$draft': null,
            'keywords/$seen': true,
          },
        },
      },
      'submission',
    ],
  ])
  const args = client.getResponse<{
    created?: Record<string, { id: string }>
    notCreated?: Record<string, { type: string; description?: string }>
  }>(response, 'submission')

  if (args.notCreated?.submission) {
    const err = args.notCreated.submission
    throw new Error(`Email submission failed: ${err.type} — ${err.description ?? ''}`)
  }

  const created = args.created?.submission
  if (!created?.id) throw new Error('Email submission failed: no id returned')
  return created.id
}
