import { d as defineEventHandler, j as readBody, c as createError } from '../../../nitro/nitro.mjs';
import { w as withJmap } from '../../../_/jmap-auth.mjs';
import { v as verifyPushSubscription } from '../../../_/push.mjs';
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

const verify_post = defineEventHandler(async (event) => {
  var _a, _b;
  const body = await readBody(event);
  const pushSubscriptionId = (_a = body.pushSubscriptionId) == null ? void 0 : _a.trim();
  const verificationCode = (_b = body.verificationCode) == null ? void 0 : _b.trim();
  if (!pushSubscriptionId || !verificationCode) {
    throw createError({
      statusCode: 400,
      statusMessage: "pushSubscriptionId and verificationCode are required"
    });
  }
  return withJmap(event, async ({ client }) => {
    await verifyPushSubscription(client, pushSubscriptionId, verificationCode);
    return { ok: true };
  });
});

export { verify_post as default };
//# sourceMappingURL=verify.post.mjs.map
