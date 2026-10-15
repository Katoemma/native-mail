import { j as useStorage, u as useRuntimeConfig } from '../nitro/nitro.mjs';

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

export { JmapError as J, buildDownloadUrl as a, buildUploadUrl as b, discoverJmapSession as d, extractJmapError as e, invalidateJmapSession as i };
//# sourceMappingURL=session.mjs.map
