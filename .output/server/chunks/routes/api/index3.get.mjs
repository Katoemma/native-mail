import { d as defineEventHandler, a as getQuery, c as createError } from '../../nitro/nitro.mjs';
import { r as requireSession, d as discoverJmapSession } from '../../_/session.mjs';
import { c as createJmapClient } from '../../_/client.mjs';
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
import '../../_/oauth.mjs';
import '../../_/attachment.mjs';

const index_get = defineEventHandler(async (event) => {
  var _a, _b, _c, _d;
  const session = requireSession(event);
  const query = getQuery(event);
  const q = ((_a = query.q) != null ? _a : "").trim();
  const limit = Math.min(Number((_b = query.limit) != null ? _b : 50), 100);
  if (!q) throw createError({ statusCode: 400, statusMessage: "Query parameter q is required" });
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username);
  const client = await createJmapClient(session.tokens, jmapSession.apiUrl, event);
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
  const { emails } = await getEmailList(client, jmapSession.accountId, (_c = args.ids) != null ? _c : []);
  return { emails, total: (_d = args.total) != null ? _d : 0 };
});

export { index_get as default };
//# sourceMappingURL=index3.get.mjs.map
