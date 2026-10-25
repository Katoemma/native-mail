import { d as defineEventHandler, a as getQuery, c as createError } from '../../nitro/nitro.mjs';
import { w as withJmap } from '../../_/jmap-auth.mjs';
import { q as queryEmails, b as getEmailList } from '../../_/email.mjs';
import { g as getMailboxes } from '../../_/mailbox.mjs';
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
import '../../_/session.mjs';
import '../../_/client.mjs';
import '../../_/oauth.mjs';
import '../../_/attachment.mjs';

const index_get = defineEventHandler(async (event) => {
  var _a, _b, _c;
  const query = getQuery(event);
  const mailboxRole = (_a = query.mailbox) != null ? _a : "inbox";
  const position = Number((_b = query.position) != null ? _b : 0);
  const limit = Math.min(Number((_c = query.limit) != null ? _c : 50), 100);
  return withJmap(event, async ({ client, jmapSession }) => {
    const mailboxes = await getMailboxes(client, jmapSession.accountId);
    const mb = mailboxes.find((m) => m.role === mailboxRole || m.id === mailboxRole);
    if (!mb) throw createError({ statusCode: 404, statusMessage: `Mailbox "${mailboxRole}" not found` });
    const { ids, total, queryState } = await queryEmails(
      client,
      jmapSession.accountId,
      mb.id,
      position,
      limit
    );
    const { emails, state: emailState } = await getEmailList(client, jmapSession.accountId, ids);
    return { emails, total, position, queryState, emailState };
  });
});

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map
