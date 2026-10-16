import { d as defineEventHandler, a as getQuery, f as sendRedirect, c as createError, h as getCookie, i as deleteCookie, u as useRuntimeConfig } from '../../../nitro/nitro.mjs';
import { discoverOAuthMetadata, exchangeCodeForTokens } from '../../../_/oauth.mjs';
import { d as discoverJmapSession, s as setSessionCookie } from '../../../_/session.mjs';
import { J as JmapClient } from '../../../_/client.mjs';
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

const PKCE_COOKIE = "nm_pkce";
const STATE_COOKIE = "nm_state";
const callback_get = defineEventHandler(async (event) => {
  var _a;
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const code = query.code;
  const returnedState = query.state;
  const errorParam = query.error;
  if (errorParam) {
    return sendRedirect(event, `/login?error=${encodeURIComponent(errorParam)}`, 302);
  }
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: "Missing authorization code" });
  }
  const savedState = getCookie(event, STATE_COOKIE);
  const pkceVerifier = getCookie(event, PKCE_COOKIE);
  console.log("[callback] cookies received:", event.headers.get("cookie"));
  console.log("[callback] savedState:", savedState, "| returnedState:", returnedState);
  console.log("[callback] pkceVerifier present:", !!pkceVerifier);
  if (!savedState || savedState !== returnedState) {
    throw createError({ statusCode: 400, statusMessage: "Invalid state parameter \u2014 possible CSRF attempt" });
  }
  const codeVerifier = pkceVerifier;
  if (!codeVerifier) {
    throw createError({ statusCode: 400, statusMessage: "Missing PKCE verifier" });
  }
  deleteCookie(event, PKCE_COOKIE, { path: "/" });
  deleteCookie(event, STATE_COOKIE, { path: "/" });
  const metadata = await discoverOAuthMetadata(config.jmapBaseUrl);
  let tokens;
  try {
    tokens = await exchangeCodeForTokens({
      tokenEndpoint: metadata.token_endpoint,
      clientId: config.oauthClientId,
      clientSecret: config.oauthClientSecret,
      redirectUri: config.oauthRedirectUri,
      code,
      codeVerifier
    });
  } catch (err) {
    throw createError({
      statusCode: 401,
      statusMessage: "Token exchange failed \u2014 invalid code or client credentials"
    });
  }
  let username = "user";
  let displayName = "User";
  let email = "";
  try {
    const jmapSession = await discoverJmapSession(tokens.accessToken, "_callback_");
    const client = new JmapClient(jmapSession.apiUrl, tokens.accessToken);
    const response = await client.request([
      ["Identity/get", { accountId: jmapSession.accountId, ids: null }, "identities"]
    ]);
    const args = client.getResponse(response, "identities");
    const identity = (_a = args.list) == null ? void 0 : _a[0];
    if (identity == null ? void 0 : identity.email) {
      username = identity.email;
      displayName = (identity.name || identity.email).trim() || identity.email;
      email = identity.email;
      await discoverJmapSession(tokens.accessToken, username);
    }
  } catch (err) {
    console.warn("[callback] Identity/get failed, session will heal on next /api/session:", err);
  }
  setSessionCookie(event, { username, displayName, email, tokens }, config.sessionSecret);
  return sendRedirect(event, "/mail/inbox", 302);
});

export { callback_get as default };
//# sourceMappingURL=callback.get.mjs.map
