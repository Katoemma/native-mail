import { d as defineEventHandler, g as getRouterParam } from '../../../nitro/nitro.mjs';
import { w as withJmap } from '../../../_/jmap-auth.mjs';
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
import '../../../_/session.mjs';
import '../../../_/client.mjs';
import '../../../_/oauth.mjs';
import '../../../_/attachment.mjs';

const _id__get = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  return withJmap(event, async ({ client, jmapSession }) => {
    const email = await getEmailFull(client, jmapSession.accountId, id);
    return { email };
  });
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
