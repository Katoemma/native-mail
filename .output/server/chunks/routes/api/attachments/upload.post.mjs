import { d as defineEventHandler, r as readRawBody, c as createError, b as getHeader } from '../../../nitro/nitro.mjs';
import { w as withJmap } from '../../../_/jmap-auth.mjs';
import { u as uploadAttachment } from '../../../_/attachment.mjs';
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

const upload_post = defineEventHandler(async (event) => {
  var _a, _b;
  const raw = await readRawBody(event, false);
  if (!(raw == null ? void 0 : raw.length)) throw createError({ statusCode: 400, statusMessage: "No file data" });
  const contentType = (_a = getHeader(event, "content-type")) != null ? _a : "application/octet-stream";
  const name = decodeURIComponent((_b = getHeader(event, "x-file-name")) != null ? _b : "attachment");
  return withJmap(event, async ({ jmapSession, accessToken }) => {
    const result = await uploadAttachment(
      accessToken,
      jmapSession,
      Buffer.isBuffer(raw) ? raw : Buffer.from(raw),
      contentType,
      name
    );
    return { blobId: result.blobId, name: result.name, size: result.size, type: result.type };
  });
});

export { upload_post as default };
//# sourceMappingURL=upload.post.mjs.map
