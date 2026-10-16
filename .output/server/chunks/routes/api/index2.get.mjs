import { d as defineEventHandler } from '../../nitro/nitro.mjs';
import { r as requireSession, d as discoverJmapSession } from '../../_/session.mjs';
import { c as createJmapClient } from '../../_/client.mjs';
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
import '../../_/oauth.mjs';

const index_get = defineEventHandler(async (event) => {
  const session = requireSession(event);
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username);
  const client = await createJmapClient(session.tokens, jmapSession.apiUrl, event);
  const mailboxes = await getMailboxes(client, jmapSession.accountId);
  return { mailboxes };
});

export { index_get as default };
//# sourceMappingURL=index2.get.mjs.map
