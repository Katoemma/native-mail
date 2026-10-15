import { d as defineEventHandler, b as getQuery, c as createError } from '../../../nitro/nitro.mjs';
import { r as requireSession } from '../../../_/auth.mjs';
import { d as discoverJmapSession } from '../../../_/session.mjs';
import { c as createJmapClient } from '../../../_/client.mjs';
import { a as getEmailChanges } from '../../../_/email.mjs';
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
import '../../../_/oauth.mjs';

const changes_get = defineEventHandler(async (event) => {
  const session = requireSession(event);
  const query = getQuery(event);
  const sinceState = query.sinceState;
  if (!sinceState) throw createError({ statusCode: 400, statusMessage: "sinceState required" });
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username);
  const client = await createJmapClient(session.tokens, jmapSession.apiUrl, event);
  return await getEmailChanges(client, jmapSession.accountId, sinceState);
});

export { changes_get as default };
//# sourceMappingURL=changes.get.mjs.map
