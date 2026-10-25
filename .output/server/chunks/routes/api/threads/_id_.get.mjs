import { d as defineEventHandler, g as getRouterParam, c as createError } from '../../../nitro/nitro.mjs';
import { w as withJmap } from '../../../_/jmap-auth.mjs';
import { b as getEmailList } from '../../../_/email.mjs';
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

async function getThreads(client, accountId, ids) {
  var _a;
  if (!ids.length) return [];
  const response = await client.request([
    ["Thread/get", { accountId, ids }, "threads"]
  ]);
  const args = client.getResponse(
    response,
    "threads"
  );
  return ((_a = args.list) != null ? _a : []).map((t) => {
    var _a2;
    return { id: t.id, emailIds: (_a2 = t.emailIds) != null ? _a2 : [] };
  });
}

const _id__get = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  return withJmap(event, async ({ client, jmapSession }) => {
    const threads = await getThreads(client, jmapSession.accountId, [id]);
    const thread = threads[0];
    if (!thread) throw createError({ statusCode: 404, statusMessage: "Thread not found" });
    const { emails } = await getEmailList(client, jmapSession.accountId, thread.emailIds);
    return { thread, emails };
  });
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
