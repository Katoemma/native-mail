import { d as defineEventHandler, a as getQuery, c as createError } from '../../../nitro/nitro.mjs';
import { w as withJmap } from '../../../_/jmap-auth.mjs';
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
import '../../../_/session.mjs';
import '../../../_/client.mjs';
import '../../../_/oauth.mjs';
import '../../../_/attachment.mjs';

const changes_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const sinceState = query.sinceState;
  if (!sinceState) throw createError({ statusCode: 400, statusMessage: "sinceState required" });
  return withJmap(event, async ({ client, jmapSession }) => {
    const changes = await getEmailChanges(client, jmapSession.accountId, sinceState);
    const fetchIds = [.../* @__PURE__ */ new Set([...changes.created, ...changes.updated])].slice(0, 50);
    const { emails } = fetchIds.length ? await getEmailList(client, jmapSession.accountId, fetchIds) : { emails: [] };
    return { ...changes, emails };
  });
});

export { changes_get as default };
//# sourceMappingURL=changes.get.mjs.map
