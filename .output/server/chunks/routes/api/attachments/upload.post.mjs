import { d as defineEventHandler, r as readRawBody, c as createError, b as getHeader } from '../../../nitro/nitro.mjs';
import { r as requireSession, d as discoverJmapSession } from '../../../_/session.mjs';
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

const upload_post = defineEventHandler(async (event) => {
  var _a, _b;
  const session = requireSession(event);
  const raw = await readRawBody(event);
  if (!raw) throw createError({ statusCode: 400, statusMessage: "No file data" });
  const contentType = (_a = getHeader(event, "content-type")) != null ? _a : "application/octet-stream";
  const name = decodeURIComponent((_b = getHeader(event, "x-file-name")) != null ? _b : "attachment");
  const jmapSession = await discoverJmapSession(session.tokens.accessToken, session.username);
  const result = await uploadAttachment(
    session.tokens.accessToken,
    jmapSession,
    Buffer.from(raw),
    contentType,
    name
  );
  return { blobId: result.blobId, name: result.name, size: result.size, type: result.type };
});

export { upload_post as default };
//# sourceMappingURL=upload.post.mjs.map
