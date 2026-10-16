import { d as defineEventHandler, a as getQuery, c as createError } from '../../../nitro/nitro.mjs';
import { r as requireSession, d as discoverJmapSession } from '../../../_/session.mjs';
import { c as createJmapClient } from '../../../_/client.mjs';
import { a as getEmailChanges, b as getEmailList } from '../../../_/email.mjs';
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
import '../../../_/attachment.mjs';

const changes_get = defineEventHandler(async (event) => {
  const session = requireSession(event);
  const query = getQuery(event);
  const sinceState = query.sinceState;
  if (!sinceState) throw createError({ statusCode: 400, statusMessage: "sinceState required" });
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username);
  const client = await createJmapClient(session.tokens, jmapSession.apiUrl, event);
  const changes = await getEmailChanges(client, jmapSession.accountId, sinceState);
  const fetchIds = [.../* @__PURE__ */ new Set([...changes.created, ...changes.updated])].slice(0, 50);
  const { emails } = fetchIds.length ? await getEmailList(client, jmapSession.accountId, fetchIds) : { emails: [] };
  return { ...changes, emails };
});

export { changes_get as default };
//# sourceMappingURL=changes.get.mjs.map
