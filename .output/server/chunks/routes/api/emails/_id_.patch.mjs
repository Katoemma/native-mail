import { d as defineEventHandler, g as getRouterParam, j as readBody, c as createError } from '../../../nitro/nitro.mjs';
import { r as requireSession, d as discoverJmapSession } from '../../../_/session.mjs';
import { c as createJmapClient } from '../../../_/client.mjs';
import { s as setEmailKeyword, m as moveEmail } from '../../../_/email.mjs';
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

const _id__patch = defineEventHandler(async (event) => {
  const session = requireSession(event);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  if (!body || Object.keys(body).length === 0)
    throw createError({ statusCode: 400, statusMessage: "Nothing to update" });
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username);
  const client = await createJmapClient(session.tokens, jmapSession.apiUrl, event);
  const accountId = jmapSession.accountId;
  if (body.read !== void 0) await setEmailKeyword(client, accountId, id, "$seen", body.read);
  if (body.starred !== void 0) await setEmailKeyword(client, accountId, id, "$flagged", body.starred);
  if (body.mailboxId !== void 0) await moveEmail(client, accountId, id, body.mailboxId);
  return { ok: true };
});

export { _id__patch as default };
//# sourceMappingURL=_id_.patch.mjs.map
