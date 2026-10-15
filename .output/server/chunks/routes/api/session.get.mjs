import { d as defineEventHandler } from '../../nitro/nitro.mjs';
import { r as requireSession } from '../../_/auth.mjs';
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

const session_get = defineEventHandler((event) => {
  const session = requireSession(event);
  return {
    username: session.username,
    displayName: session.displayName,
    email: session.email
  };
});

export { session_get as default };
//# sourceMappingURL=session.get.mjs.map
