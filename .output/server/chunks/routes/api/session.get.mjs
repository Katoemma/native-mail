import { d as defineEventHandler, c as createError, u as useRuntimeConfig } from '../../nitro/nitro.mjs';
import { r as requireSession, J as JmapError, c as clearSessionCookie, d as discoverJmapSession, s as setSessionCookie } from '../../_/session.mjs';
import { r as resolveAccessToken, J as JmapClient } from '../../_/client.mjs';
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
  try {
    await resolveAccessToken(session.tokens, event);
  } catch (err) {
    if (err instanceof JmapError && (err.type === "authenticationFailed" || err.status === 401)) {
      clearSessionCookie(event);
      throw createError({
        statusCode: 401,
        statusMessage: "Session expired \u2014 please sign in again"
      });
    }
  }
  const needsHeal = !(displayName == null ? void 0 : displayName.trim()) || !(email == null ? void 0 : email.trim()) || username === "unknown";
  if (needsHeal) {
    try {
      const accessToken = await resolveAccessToken(session.tokens, event);
      const jmapSession = await discoverJmapSession(accessToken, username);
      const client = new JmapClient(jmapSession.apiUrl, accessToken);
      const identities = await getIdentities(client, jmapSession.accountId);
      const identity = identities[0];
      if (identity) {
        username = identity.email || username;
        displayName = (identity.name || identity.email || username).trim();
        email = identity.email || email;
        const fresh = requireSession(event);
        setSessionCookie(event, {
          ...fresh,
          username,
          displayName,
          email
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
