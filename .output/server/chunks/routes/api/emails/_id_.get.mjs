import { d as defineEventHandler, g as getRouterParam } from '../../../nitro/nitro.mjs';
import { r as requireSession, d as discoverJmapSession } from '../../../_/session.mjs';
import { c as createJmapClient } from '../../../_/client.mjs';
import { g as getEmailFull } from '../../../_/email.mjs';
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

const _id__get = defineEventHandler(async (event) => {
  var _a, _b, _c, _d;
  const session = requireSession(event);
  const id = getRouterParam(event, "id");
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username);
  const client = await createJmapClient(session.tokens, jmapSession.apiUrl, event);
  const email = await getEmailFull(client, jmapSession.accountId, id);
  console.log("[email/get] id:", id);
  console.log("[email/get] htmlBody length:", (_b = (_a = email.htmlBody) == null ? void 0 : _a.length) != null ? _b : "null");
  console.log("[email/get] textBody length:", (_d = (_c = email.textBody) == null ? void 0 : _c.length) != null ? _d : "null");
  console.log("[email/get] attachments:", email.attachments.length);
  return { email };
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
