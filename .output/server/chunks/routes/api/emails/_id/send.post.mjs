import { d as defineEventHandler, h as getRouterParam, c as createError } from '../../../../nitro/nitro.mjs';
import { r as requireSession } from '../../../../_/auth.mjs';
import { d as discoverJmapSession } from '../../../../_/session.mjs';
import { c as createJmapClient } from '../../../../_/client.mjs';
import { g as getIdentities } from '../../../../_/identity.mjs';
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
import '../../../../_/oauth.mjs';

async function submitEmail(client, accountId, emailId, identityId) {
  var _a;
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
        }
      },
      "submission"
    ]
  ]);
  const args = client.getResponse(response, "submission");
  const created = (_a = args.created) == null ? void 0 : _a.submission;
  if (!(created == null ? void 0 : created.id)) throw new Error("Email submission failed");
  return created.id;
}

const send_post = defineEventHandler(async (event) => {
  const session = requireSession(event);
  const emailId = getRouterParam(event, "id");
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username);
  const client = await createJmapClient(session.tokens, jmapSession.apiUrl, event);
  const identities = await getIdentities(client, jmapSession.accountId);
  if (!identities.length)
    throw createError({ statusCode: 500, statusMessage: "No sending identity found" });
  const submissionId = await submitEmail(client, jmapSession.accountId, emailId, identities[0].id);
  return { submissionId, emailId };
});

export { send_post as default };
//# sourceMappingURL=send.post.mjs.map
