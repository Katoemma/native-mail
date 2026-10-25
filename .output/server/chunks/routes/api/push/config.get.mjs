import { d as defineEventHandler, c as createError } from '../../../nitro/nitro.mjs';
import { w as withJmap } from '../../../_/jmap-auth.mjs';
import { g as getVapidPublicKey } from '../../../_/push.mjs';
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

const config_get = defineEventHandler(async (event) => {
  return withJmap(event, async ({ jmapSession }) => {
    var _a;
    const applicationServerKey = getVapidPublicKey(jmapSession);
    if (!applicationServerKey) {
      throw createError({
        statusCode: 503,
        statusMessage: "Server does not advertise Web Push VAPID"
      });
    }
    const emailPush = "urn:ietf:params:jmap:emailpush" in ((_a = jmapSession.capabilities) != null ? _a : {});
    return {
      applicationServerKey,
      emailPush
    };
  });
});

export { config_get as default };
//# sourceMappingURL=config.get.mjs.map
