import { d as defineEventHandler, s as setCookie, a as sendRedirect, u as useRuntimeConfig } from '../../../nitro/nitro.mjs';
import { discoverOAuthMetadata, generatePkceChallenge, generateState, buildAuthorizationUrl } from '../../../_/oauth.mjs';
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
const authorize_get = defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const metadata = await discoverOAuthMetadata(config.jmapBaseUrl);
  const pkce = generatePkceChallenge();
  const state = generateState();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 300
  };
  setCookie(event, PKCE_COOKIE, pkce.verifier, cookieOptions);
  setCookie(event, STATE_COOKIE, state, cookieOptions);
  const authUrl = buildAuthorizationUrl({
    authorizationEndpoint: metadata.authorization_endpoint,
    clientId: config.oauthClientId,
    redirectUri: config.oauthRedirectUri,
    scope: config.oauthScope,
    state,
    codeChallenge: pkce.challenge
  });
  return sendRedirect(event, authUrl, 302);
});

export { authorize_get as default };
//# sourceMappingURL=authorize.get.mjs.map
