import { c as createError } from '../nitro/nitro.mjs';
import { r as requireSession, d as discoverJmapSession, J as JmapError, c as clearSessionCookie, j as jmapErrorToStatus } from './session.mjs';
import { r as resolveAccessToken, J as JmapClient } from './client.mjs';

async function useJmap(event) {
  const session = requireSession(event);
  try {
    const accessToken = await resolveAccessToken(session.tokens, event);
    const jmapSession = await discoverJmapSession(accessToken, session.username);
    const client = new JmapClient(jmapSession.apiUrl, accessToken);
    return { session, jmapSession, client, accessToken };
  } catch (err) {
    throw handleJmapAuthError(event, err);
  }
}
async function withJmap(event, fn) {
  const ctx = await useJmap(event);
  try {
    return await fn(ctx);
  } catch (err) {
    throw handleJmapAuthError(event, err);
  }
}
function handleJmapAuthError(event, err) {
  var _a, _b, _c, _d, _e;
  if (isH3Error(err)) throw err;
  if (err instanceof JmapError) {
    if (err.type === "authenticationFailed" || err.status === 401) {
      clearSessionCookie(event);
      throw createError({
        statusCode: 401,
        statusMessage: "Session expired \u2014 please sign in again"
      });
    }
    throw createError({
      statusCode: (_a = err.status) != null ? _a : jmapErrorToStatus(err.type),
      statusMessage: (_b = err.description) != null ? _b : err.type
    });
  }
  const status = err;
  const code = (_e = (_c = status.statusCode) != null ? _c : status.status) != null ? _e : (_d = status.response) == null ? void 0 : _d.status;
  if (code === 401 || code === 400) {
    clearSessionCookie(event);
    throw createError({
      statusCode: 401,
      statusMessage: "Session expired \u2014 please sign in again"
    });
  }
  throw err instanceof Error ? createError({ statusCode: 502, statusMessage: err.message }) : createError({ statusCode: 502, statusMessage: "Upstream mail server error" });
}
function isH3Error(err) {
  return !!err && typeof err === "object" && "statusCode" in err && typeof err.statusCode === "number";
}

export { withJmap as w };
//# sourceMappingURL=jmap-auth.mjs.map
