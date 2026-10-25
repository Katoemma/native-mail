import { d as defineEventHandler, j as readBody, c as createError } from '../../../nitro/nitro.mjs';
import { w as withJmap } from '../../../_/jmap-auth.mjs';
import { c as createPushSubscription } from '../../../_/push.mjs';
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
import '../../../_/mailbox.mjs';

const subscribe_post = defineEventHandler(async (event) => {
  var _a, _b, _c, _d, _e, _f;
  const body = await readBody(event);
  const deviceClientId = (_a = body.deviceClientId) == null ? void 0 : _a.trim();
  const endpoint = (_b = body.endpoint) == null ? void 0 : _b.trim();
  const p256dh = (_d = (_c = body.keys) == null ? void 0 : _c.p256dh) == null ? void 0 : _d.trim();
  const auth = (_f = (_e = body.keys) == null ? void 0 : _e.auth) == null ? void 0 : _f.trim();
  if (!deviceClientId || !endpoint || !p256dh || !auth) {
    throw createError({
      statusCode: 400,
      statusMessage: "deviceClientId, endpoint, and keys (p256dh, auth) are required"
    });
  }
  if (!endpoint.startsWith("https://")) {
    throw createError({
      statusCode: 400,
      statusMessage: "Push endpoint must be https"
    });
  }
  return withJmap(event, async ({ client, jmapSession }) => {
    var _a2;
    const { id } = await createPushSubscription(client, jmapSession, {
      deviceClientId,
      url: endpoint,
      keys: { p256dh, auth },
      expires: (_a2 = body.expires) != null ? _a2 : null
    });
    return { id };
  });
});

export { subscribe_post as default };
//# sourceMappingURL=subscribe.post.mjs.map
