import { m as useStorage } from '../nitro/nitro.mjs';
import { randomBytes, createHash } from 'node:crypto';
import 'node:http';
import 'node:https';
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

async function discoverOAuthMetadata(baseUrl) {
  const storage = useStorage("session-cache");
  const cacheKey = `oauth-metadata:${baseUrl}`;
  const cached = await storage.getItem(cacheKey);
  if (cached) return cached;
  const discoveryUrl = `${baseUrl}/.well-known/oauth-authorization-server`;
  let raw;
  try {
    raw = await $fetch(discoveryUrl);
  } catch (err) {
    const fallback = {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/auth/authorize`,
      token_endpoint: `${baseUrl}/auth/token`,
      device_authorization_endpoint: `${baseUrl}/auth/device`,
      introspection_endpoint: `${baseUrl}/auth/introspect`,
      code_challenge_methods_supported: ["S256"]
    };
    await storage.setItem(cacheKey, fallback);
    return fallback;
  }
  const metadata = raw;
  await storage.setItem(cacheKey, metadata);
  return metadata;
}
function generatePkceChallenge() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge, method: "S256" };
}
function generateState() {
  return randomBytes(24).toString("base64url");
}
function buildAuthorizationUrl(params) {
  const url = new URL(params.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", params.scope);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}
async function exchangeCodeForTokens(params) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code: params.code,
    code_verifier: params.codeVerifier
  });
  if (params.clientSecret) {
    body.set("client_secret", params.clientSecret);
  }
  const raw = await $fetch(params.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  return normaliseTokenResponse(raw);
}
async function refreshAccessToken(params) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: params.clientId,
    refresh_token: params.refreshToken
  });
  if (params.clientSecret) {
    body.set("client_secret", params.clientSecret);
  }
  const raw = await $fetch(params.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  const tokens = normaliseTokenResponse(raw);
  if (!tokens.refreshToken) {
    tokens.refreshToken = params.refreshToken;
  }
  return tokens;
}
function normaliseTokenResponse(raw) {
  var _a, _b, _c, _d;
  return {
    accessToken: raw.access_token,
    refreshToken: (_a = raw.refresh_token) != null ? _a : null,
    tokenType: (_b = raw.token_type) != null ? _b : "Bearer",
    expiresAt: Date.now() + ((_c = raw.expires_in) != null ? _c : 3600) * 1e3,
    scope: (_d = raw.scope) != null ? _d : ""
  };
}
function isTokenExpired(tokens) {
  return Date.now() > tokens.expiresAt - 6e4;
}

export { buildAuthorizationUrl, discoverOAuthMetadata, exchangeCodeForTokens, generatePkceChallenge, generateState, isTokenExpired, refreshAccessToken };
//# sourceMappingURL=oauth.mjs.map
