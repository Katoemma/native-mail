import { d as defineEventHandler, a as getQuery, c as createError } from '../../nitro/nitro.mjs';
import { w as withJmap } from '../../_/jmap-auth.mjs';
import { b as getEmailList } from '../../_/email.mjs';
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
import '../../_/attachment.mjs';

const index_get = defineEventHandler(async (event) => {
  var _a, _b;
  const query = getQuery(event);
  const q = ((_a = query.q) != null ? _a : "").trim();
  const limit = Math.min(Number((_b = query.limit) != null ? _b : 50), 100);
  if (!q) throw createError({ statusCode: 400, statusMessage: "Query parameter q is required" });
  return withJmap(event, async ({ client, jmapSession }) => {
    var _a2, _b2;
    const response = await client.request([
      [
        "Email/query",
        {
          accountId: jmapSession.accountId,
          filter: { text: q },
          sort: [{ property: "receivedAt", isAscending: false }],
          position: 0,
          limit,
          calculateTotal: true
        },
        "search"
      ]
    ]);
    const args = client.getResponse(response, "search");
    const { emails } = await getEmailList(client, jmapSession.accountId, (_a2 = args.ids) != null ? _a2 : []);
    return { emails, total: (_b2 = args.total) != null ? _b2 : 0 };
  });
});

export { index_get as default };
//# sourceMappingURL=index4.get.mjs.map
