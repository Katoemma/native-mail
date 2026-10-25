import { e as setCookie, u as useRuntimeConfig, h as getCookie, i as deleteCookie, c as createError, l as useStorage } from '../nitro/nitro.mjs';
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

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class JmapError extends Error {
  constructor(type, description, properties, status) {
    super(description != null ? description : type);
    __publicField(this, "type", type);
    __publicField(this, "description", description);
    __publicField(this, "properties", properties);
    __publicField(this, "status", status);
    this.name = "JmapError";
  }
}
function extractJmapError(methodResponses) {
  var _a;
  for (const response of methodResponses) {
    const [name, args] = response;
    if (name === "error") {
      return new JmapError(
        (_a = args.type) != null ? _a : "unknownError",
        args.description
      );
    }
  }
  return null;
}
function jmapErrorToStatus(type) {
  switch (type) {
    case "authenticationFailed":
      return 401;
    case "notFound":
      return 404;
    case "forbidden":
      return 403;
    case "accountNotFound":
      return 404;
    case "invalidArguments":
      return 400;
    case "invalidPatch":
      return 400;
    case "stateMismatch":
      return 409;
    case "serverFail":
      return 500;
    case "serverUnavailable":
      return 503;
    case "overQuota":
      return 507;
    case "tooLarge":
      return 413;
    case "rateLimit":
      return 429;
    default:
      return 500;
  }
}

async function discoverJmapSession(accessToken, username) {
  var _a, _b, _c, _d, _e, _f, _g;
  const storage = useStorage("session-cache");
  const cacheKey = `jmap-session:${username}`;
  const cached = await storage.getItem(cacheKey);
  if (cached) return cached;
  const config = useRuntimeConfig();
  const discoveryUrl = `${config.jmapBaseUrl}/.well-known/jmap`;
  let raw;
  try {
    raw = await $fetch(discoveryUrl, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
  } catch (err) {
    const status = (_a = err == null ? void 0 : err.response) == null ? void 0 : _a.status;
    if (status === 401) {
      throw new JmapError("authenticationFailed", "Bearer token rejected by Stalwart", void 0, 401);
    }
    throw new JmapError("serverFail", `JMAP discovery failed: ${String(err)}`, void 0, 503);
  }
  const data = raw;
  const accountId = (_b = data.primaryAccounts) == null ? void 0 : _b["urn:ietf:params:jmap:mail"];
  if (!accountId) {
    throw new JmapError("accountNotFound", "Could not determine JMAP account ID from session");
  }
  const session = {
    apiUrl: (_c = data.apiUrl) != null ? _c : `${config.jmapBaseUrl}/jmap/`,
    uploadUrl: (_d = data.uploadUrl) != null ? _d : `${config.jmapBaseUrl}/jmap/upload/{accountId}/`,
    downloadUrl: (_e = data.downloadUrl) != null ? _e : `${config.jmapBaseUrl}/jmap/download/{accountId}/{blobId}/{name}`,
    eventSourceUrl: (_f = data.eventSourceUrl) != null ? _f : `${config.jmapBaseUrl}/jmap/eventsource/`,
    accountId,
    capabilities: (_g = data.capabilities) != null ? _g : {}
  };
  await storage.setItem(cacheKey, session);
  return session;
}
async function invalidateJmapSession(username) {
  const storage = useStorage("session-cache");
  await storage.removeItem(`jmap-session:${username}`);
}
function buildDownloadUrl(session, blobId, name) {
  return session.downloadUrl.replace("{accountId}", session.accountId).replace("{blobId}", encodeURIComponent(blobId)).replace("{name}", encodeURIComponent(name));
}
function buildUploadUrl(session) {
  return session.uploadUrl.replace("{accountId}", session.accountId);
}

export { JmapError as J, buildDownloadUrl as a, buildUploadUrl as b, clearSessionCookie as c, discoverJmapSession as d, extractJmapError as e, refreshSessionTokens as f, getSession as g, decodeSession as h, invalidateJmapSession as i, jmapErrorToStatus as j, requireSession as r, setSessionCookie as s };
//# sourceMappingURL=session.mjs.map
