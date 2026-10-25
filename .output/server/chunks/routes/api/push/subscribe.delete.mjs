import { d as defineEventHandler, a as getQuery, c as createError } from '../../../nitro/nitro.mjs';
import { w as withJmap } from '../../../_/jmap-auth.mjs';
import { d as destroyPushSubscription } from '../../../_/push.mjs';
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

const subscribe_delete = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const id = typeof query.id === "string" ? query.id.trim() : "";
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "id is required"
    });
  }
  return withJmap(event, async ({ client }) => {
    await destroyPushSubscription(client, id);
    return { ok: true };
  });
});

export { subscribe_delete as default };
//# sourceMappingURL=subscribe.delete.mjs.map
