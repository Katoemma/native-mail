import { u as useRuntimeConfig } from '../nitro/nitro.mjs';
import { J as JmapError, e as extractJmapError } from './session.mjs';
import { isTokenExpired, refreshAccessToken } from './oauth.mjs';
import { a as refreshSessionTokens } from './auth.mjs';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const JMAP_USING = [
  "urn:ietf:params:jmap:core",
  "urn:ietf:params:jmap:mail",
  "urn:ietf:params:jmap:submission"
];
class JmapClient {
  constructor(apiUrl, accessToken) {
    __publicField(this, "apiUrl", apiUrl);
    __publicField(this, "accessToken", accessToken);
  }
  async request(methodCalls) {
    var _a;
    const body = {
      using: JMAP_USING,
      methodCalls
    };
    let raw;
    try {
      raw = await $fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
    } catch (err) {
      const status = (_a = err == null ? void 0 : err.response) == null ? void 0 : _a.status;
      if (status === 401) {
        throw new JmapError("authenticationFailed", "Token invalid or expired", void 0, 401);
      }
      throw new JmapError("serverFail", `JMAP request failed: ${String(err)}`, void 0, 500);
    }
    const response = raw;
    const jmapErr = extractJmapError(response.methodResponses);
    if (jmapErr) throw jmapErr;
    return response;
  }
  getResponse(response, callId) {
    const found = response.methodResponses.find((r) => r[2] === callId);
    if (!found) {
      throw new JmapError("notFound", `No response for callId "${callId}"`);
    }
    return found[1];
  }
}
async function createJmapClient(tokens, apiUrl, event) {
  const config = useRuntimeConfig();
  let activeToken = tokens.accessToken;
  if (isTokenExpired(tokens)) {
    if (!tokens.refreshToken) {
      throw new JmapError("authenticationFailed", "Access token expired and no refresh token available", void 0, 401);
    }
    const { discoverOAuthMetadata } = await import('./oauth.mjs');
    const metadata = await discoverOAuthMetadata(config.jmapBaseUrl);
    const refreshed = await refreshAccessToken({
      tokenEndpoint: metadata.token_endpoint,
      clientId: config.oauthClientId,
      clientSecret: config.oauthClientSecret,
      refreshToken: tokens.refreshToken
    });
    activeToken = refreshed.accessToken;
    if (event) {
      refreshSessionTokens(event, refreshed);
    }
  }
  return new JmapClient(apiUrl, activeToken);
}

export { JmapClient as J, createJmapClient as c };
//# sourceMappingURL=client.mjs.map
