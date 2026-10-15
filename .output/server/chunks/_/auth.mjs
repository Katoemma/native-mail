import { u as useRuntimeConfig, e as getCookie, c as createError, s as setCookie, f as deleteCookie } from '../nitro/nitro.mjs';
import { createHmac } from 'node:crypto';

const COOKIE_NAME = "nm_session";
function simpleHmac(data, secret) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}
function encodeSession(data, secret) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = simpleHmac(payload, secret);
  return `${payload}.${sig}`;
}
function decodeSession(token, secret) {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (simpleHmac(payload, secret) !== sig) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
function setSessionCookie(event, data, secret) {
  const token = encodeSession(data, secret);
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7
    // 7 days
  });
}
function clearSessionCookie(event) {
  deleteCookie(event, COOKIE_NAME, { path: "/" });
}
function requireSession(event) {
  const config = useRuntimeConfig();
  const raw = getCookie(event, COOKIE_NAME);
  if (!raw) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorised" });
  }
  const session = decodeSession(raw, config.sessionSecret);
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Invalid session" });
  }
  return session;
}
function getSession(event) {
  const config = useRuntimeConfig();
  const raw = getCookie(event, COOKIE_NAME);
  if (!raw) return null;
  return decodeSession(raw, config.sessionSecret);
}
function refreshSessionTokens(event, tokens) {
  const config = useRuntimeConfig();
  const session = requireSession(event);
  setSessionCookie(event, { ...session, tokens }, config.sessionSecret);
}

export { refreshSessionTokens as a, clearSessionCookie as c, decodeSession as d, getSession as g, requireSession as r, setSessionCookie as s };
//# sourceMappingURL=auth.mjs.map
