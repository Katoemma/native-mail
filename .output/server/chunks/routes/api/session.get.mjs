import { d as defineEventHandler, u as useRuntimeConfig } from '../../nitro/nitro.mjs';
import { r as requireSession, d as discoverJmapSession, s as setSessionCookie } from '../../_/session.mjs';
import { c as createJmapClient } from '../../_/client.mjs';
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
import '../../_/oauth.mjs';

const session_get = defineEventHandler(async (event) => {
  const session = requireSession(event);
  const config = useRuntimeConfig();
  let { username, displayName, email } = session;
  const needsHeal = !(displayName == null ? void 0 : displayName.trim()) || !(email == null ? void 0 : email.trim()) || username === "unknown";
  if (needsHeal) {
    try {
      const jmapSession = await discoverJmapSession(session.tokens.accessToken, username);
      const client = await createJmapClient(session.tokens, jmapSession.apiUrl, event);
      const identities = await getIdentities(client, jmapSession.accountId);
      const identity = identities[0];
      if (identity) {
        username = identity.email || username;
        displayName = (identity.name || identity.email || username).trim();
        email = identity.email || email;
        setSessionCookie(event, {
          ...session,
          username,
          displayName,
          email,
          tokens: session.tokens
        }, config.sessionSecret);
      }
    } catch {
    }
  }
  return {
    username: username || "user",
    displayName: (displayName || username || "User").trim(),
    email: (email || username || "").trim()
  };
});

export { session_get as default };
//# sourceMappingURL=session.get.mjs.map
