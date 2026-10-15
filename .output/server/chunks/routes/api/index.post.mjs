import { d as defineEventHandler, i as readBody, c as createError } from '../../nitro/nitro.mjs';
import { r as requireSession } from '../../_/auth.mjs';
import { d as discoverJmapSession } from '../../_/session.mjs';
import { c as createJmapClient } from '../../_/client.mjs';
import { g as getEmailFull, c as createDraft } from '../../_/email.mjs';
import { g as getMailboxes } from '../../_/mailbox.mjs';
import { g as getIdentities } from '../../_/identity.mjs';
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
import '../../_/oauth.mjs';

const index_post = defineEventHandler(async (event) => {
  var _a;
  const session = requireSession(event);
  const body = await readBody(event);
  if (!body) throw createError({ statusCode: 400, statusMessage: "Body required" });
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username);
  const client = await createJmapClient(session.tokens, jmapSession.apiUrl, event);
  const identities = await getIdentities(client, jmapSession.accountId);
  if (!identities.length)
    throw createError({ statusCode: 500, statusMessage: "No sending identity found" });
  const identity = identities[0];
  const mailboxes = await getMailboxes(client, jmapSession.accountId);
  const draftsMb = mailboxes.find((m) => m.role === "drafts");
  if (!draftsMb) throw createError({ statusCode: 500, statusMessage: "Drafts mailbox not found" });
  let inReplyTo;
  let references;
  if (body.inReplyToEmailId) {
    try {
      const original = await getEmailFull(client, jmapSession.accountId, body.inReplyToEmailId, jmapSession);
      const msgId = original.messageId;
      if (msgId) {
        inReplyTo = msgId;
        const originalRefs = (_a = original.references) != null ? _a : "";
        references = originalRefs ? `${originalRefs} ${msgId}` : msgId;
      }
    } catch {
    }
  }
  const emailId = await createDraft(client, jmapSession.accountId, draftsMb.id, {
    from: { name: identity.name, email: identity.email },
    to: body.to,
    cc: body.cc,
    bcc: body.bcc,
    subject: body.subject,
    textBody: body.textBody,
    htmlBody: body.htmlBody,
    attachmentBlobIds: body.attachmentBlobIds,
    inReplyToEmailId: body.inReplyToEmailId,
    inReplyTo,
    references
  });
  return { emailId };
});

export { index_post as default };
//# sourceMappingURL=index.post.mjs.map
