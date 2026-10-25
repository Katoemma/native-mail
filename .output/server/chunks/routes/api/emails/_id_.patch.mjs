import { d as defineEventHandler, g as getRouterParam, j as readBody, c as createError } from '../../../nitro/nitro.mjs';
import { w as withJmap } from '../../../_/jmap-auth.mjs';
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
import '../../../_/session.mjs';
import '../../../_/client.mjs';
import '../../../_/oauth.mjs';
import '../../../_/attachment.mjs';

const _id__patch = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  if (!body || Object.keys(body).length === 0)
    throw createError({ statusCode: 400, statusMessage: "Nothing to update" });
  return withJmap(event, async ({ client, jmapSession }) => {
    const accountId = jmapSession.accountId;
    if (body.read !== void 0) await setEmailKeyword(client, accountId, id, "$seen", body.read);
    if (body.starred !== void 0) await setEmailKeyword(client, accountId, id, "$flagged", body.starred);
    if (body.mailboxId !== void 0) await moveEmail(client, accountId, id, body.mailboxId);
    return { ok: true };
  });
});

export { _id__patch as default };
//# sourceMappingURL=_id_.patch.mjs.map
