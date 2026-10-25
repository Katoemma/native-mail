import { d as defineEventHandler, g as getRouterParam, c as createError, a as getQuery, s as setHeader } from '../../../nitro/nitro.mjs';
import { w as withJmap } from '../../../_/jmap-auth.mjs';
import { d as downloadAttachment } from '../../../_/attachment.mjs';
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

const _blobId__get = defineEventHandler(async (event) => {
  const blobId = getRouterParam(event, "blobId");
  if (!blobId) throw createError({ statusCode: 400, statusMessage: "blobId required" });
  const query = getQuery(event);
  const name = typeof query.name === "string" && query.name ? query.name : "attachment";
  const inline = query.inline === "1" || query.inline === "true";
  return withJmap(event, async ({ jmapSession, accessToken }) => {
    const { data, contentType } = await downloadAttachment(
      accessToken,
      jmapSession,
      decodeURIComponent(blobId),
      name
    );
    const asciiName = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
    const disposition = inline || contentType.startsWith("image/") ? "inline" : "attachment";
    setHeader(event, "Content-Type", contentType);
    setHeader(
      event,
      "Content-Disposition",
      `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`
    );
    setHeader(event, "Content-Length", String(data.length));
    setHeader(event, "Cache-Control", "private, no-store");
    return data;
  });
});

export { _blobId__get as default };
//# sourceMappingURL=_blobId_.get.mjs.map
