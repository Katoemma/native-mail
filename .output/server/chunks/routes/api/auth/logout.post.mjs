import { d as defineEventHandler } from '../../../nitro/nitro.mjs';
import { g as getSession, c as clearSessionCookie } from '../../../_/auth.mjs';
import { i as invalidateJmapSession } from '../../../_/session.mjs';
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

const logout_post = defineEventHandler(async (event) => {
  const session = getSession(event);
  if (session) {
    await invalidateJmapSession(session.username);
  }
  clearSessionCookie(event);
  return { ok: true };
});

export { logout_post as default };
//# sourceMappingURL=logout.post.mjs.map
