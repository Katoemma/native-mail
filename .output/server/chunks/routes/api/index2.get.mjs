import { d as defineEventHandler } from '../../nitro/nitro.mjs';
import { w as withJmap } from '../../_/jmap-auth.mjs';
import { g as getIdentities } from '../../_/identity.mjs';
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
import '../../_/session.mjs';
import '../../_/client.mjs';
import '../../_/oauth.mjs';

const index_get = defineEventHandler(async (event) => {
  return withJmap(event, async ({ client, jmapSession }) => {
    const identities = await getIdentities(client, jmapSession.accountId);
    return { identities };
  });
});

export { index_get as default };
//# sourceMappingURL=index2.get.mjs.map
