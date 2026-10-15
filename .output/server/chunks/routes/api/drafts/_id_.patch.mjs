import { d as defineEventHandler, h as getRouterParam, i as readBody, c as createError } from '../../../nitro/nitro.mjs';
import { r as requireSession } from '../../../_/auth.mjs';
import { d as discoverJmapSession } from '../../../_/session.mjs';
import { c as createJmapClient } from '../../../_/client.mjs';
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
import '../../../_/oauth.mjs';

const _id__patch = defineEventHandler(async (event) => {
  const session = requireSession(event);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  if (!body) throw createError({ statusCode: 400, statusMessage: "Body required" });
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username);
  const client = await createJmapClient(session.tokens, jmapSession.apiUrl, event);
  await updateDraft(client, jmapSession.accountId, id, body);
  return { ok: true };
});

export { _id__patch as default };
//# sourceMappingURL=_id_.patch.mjs.map
