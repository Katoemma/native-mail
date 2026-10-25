import { d as defineEventHandler, g as getRouterParam, j as readBody, c as createError } from '../../../nitro/nitro.mjs';
import { w as withJmap } from '../../../_/jmap-auth.mjs';
import { u as updateDraft } from '../../../_/email.mjs';
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
  if (!body) throw createError({ statusCode: 400, statusMessage: "Body required" });
  return withJmap(event, async ({ client, jmapSession }) => {
    await updateDraft(client, jmapSession.accountId, id, body);
    return { ok: true };
  });
});

export { _id__patch as default };
//# sourceMappingURL=_id_.patch.mjs.map
