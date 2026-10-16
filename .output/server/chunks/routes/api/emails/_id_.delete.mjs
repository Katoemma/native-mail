import { d as defineEventHandler, g as getRouterParam } from '../../../nitro/nitro.mjs';
import { r as requireSession, d as discoverJmapSession } from '../../../_/session.mjs';
import { c as createJmapClient } from '../../../_/client.mjs';
import { d as destroyEmail } from '../../../_/email.mjs';
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

const _id__delete = defineEventHandler(async (event) => {
  const session = requireSession(event);
  const id = getRouterParam(event, "id");
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username);
  const client = await createJmapClient(session.tokens, jmapSession.apiUrl, event);
  await destroyEmail(client, jmapSession.accountId, id);
  return { ok: true };
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map
