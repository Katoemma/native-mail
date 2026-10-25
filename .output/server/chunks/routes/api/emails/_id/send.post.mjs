import { d as defineEventHandler, g as getRouterParam, c as createError } from '../../../../nitro/nitro.mjs';
import { w as withJmap } from '../../../../_/jmap-auth.mjs';
import { g as getIdentities } from '../../../../_/identity.mjs';
import { g as getMailboxes } from '../../../../_/mailbox.mjs';
import 'node:http';
import 'node:https';
import 'node:crypto';
import 'stream';
import 'events';
import 'http';
import 'crypto';
import 'buffer';
import 'zlib';
import 'https';
import 'net';
import 'tls';
import 'url';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:url';
import '../../../../_/session.mjs';
import '../../../../_/client.mjs';
import '../../../../_/oauth.mjs';

async function submitEmail(client, accountId, emailId, identityId, draftsMailboxId, sentMailboxId) {
  var _a, _b, _c;
  const response = await client.request([
    [
      "EmailSubmission/set",
      {
        accountId,
        create: {
          submission: {
            emailId,
            identityId
          }
        },
        // On successful delivery: leave Drafts, land in Sent, drop $draft.
        onSuccessUpdateEmail: {
          "#submission": {
            [`mailboxIds/${draftsMailboxId}`]: null,
            [`mailboxIds/${sentMailboxId}`]: true,
            "keywords/$draft": null,
            "keywords/$seen": true
          }
        }
      },
      "submission"
    ]
  ]);
  const args = client.getResponse(response, "submission");
  if ((_a = args.notCreated) == null ? void 0 : _a.submission) {
    const err = args.notCreated.submission;
    throw new Error(`Email submission failed: ${err.type} \u2014 ${(_b = err.description) != null ? _b : ""}`);
  }
  const created = (_c = args.created) == null ? void 0 : _c.submission;
  if (!(created == null ? void 0 : created.id)) throw new Error("Email submission failed: no id returned");
  return created.id;
}

const send_post = defineEventHandler(async (event) => {
  const emailId = getRouterParam(event, "id");
  return withJmap(event, async ({ client, jmapSession }) => {
    const identities = await getIdentities(client, jmapSession.accountId);
    if (!identities.length)
      throw createError({ statusCode: 500, statusMessage: "No sending identity found" });
    const mailboxes = await getMailboxes(client, jmapSession.accountId);
    const draftsMb = mailboxes.find((m) => m.role === "drafts");
    const sentMb = mailboxes.find((m) => m.role === "sent");
    if (!draftsMb) throw createError({ statusCode: 500, statusMessage: "Drafts mailbox not found" });
    if (!sentMb) throw createError({ statusCode: 500, statusMessage: "Sent mailbox not found" });
    const submissionId = await submitEmail(
      client,
      jmapSession.accountId,
      emailId,
      identities[0].id,
      draftsMb.id,
      sentMb.id
    );
    return { submissionId, emailId };
  });
});

export { send_post as default };
//# sourceMappingURL=send.post.mjs.map
