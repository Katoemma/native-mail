import { k as defineWebSocketHandler, u as useRuntimeConfig } from '../../nitro/nitro.mjs';
import { d as decodeSession } from '../../_/auth.mjs';
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

const stalwartConnections = /* @__PURE__ */ new Map();
function getSessionFromRequest(request) {
  var _a;
  const config = useRuntimeConfig();
  const cookieHeader = (_a = request.headers.get("cookie")) != null ? _a : "";
  const match = cookieHeader.match(/(?:^|;\s*)nm_session=([^;]+)/);
  if (!match) return null;
  return decodeSession(decodeURIComponent(match[1]), config.sessionSecret);
}
const mail = defineWebSocketHandler({
  async open(peer) {
    var _a, _b;
    const session = getSessionFromRequest(peer.request);
    if (!session) {
      peer.send(JSON.stringify({ type: "error", message: "Unauthorised" }));
      peer.close();
      return;
    }
    const { tokens, username } = session;
    let wsUrl;
    try {
      const jmapSession = await discoverJmapSession(tokens.accessToken, username);
      const wsCap = (_a = jmapSession.capabilities) == null ? void 0 : _a["urn:ietf:params:jmap:websocket"];
      wsUrl = (_b = wsCap == null ? void 0 : wsCap.url) != null ? _b : jmapSession.apiUrl.replace(/^https/, "wss").replace(/^http/, "ws").replace(/\/jmap\/?$/, "/jmap/ws");
    } catch {
      peer.send(JSON.stringify({ type: "error", message: "JMAP discovery failed" }));
      peer.close();
      return;
    }
    try {
      const { WebSocket: NodeWS } = await import('ws');
      const stalwartWs = new NodeWS(wsUrl, ["jmap"], {
        headers: {
          "Authorization": `Bearer ${tokens.accessToken}`
        }
      });
      stalwartConnections.set(peer.id, stalwartWs);
      stalwartWs.on("open", () => {
        stalwartWs.send(JSON.stringify({
          "@type": "WebSocketPushEnable",
          dataTypes: null,
          // null = all types; or ['Email','Mailbox','EmailSubmission']
          pushState: null
        }));
        peer.send(JSON.stringify({ type: "connected" }));
      });
      stalwartWs.on("message", (data) => {
        var _a2;
        try {
          const text = data.toString("utf8");
          const msg = JSON.parse(text);
          if (msg["@type"] === "StateChange") {
            peer.send(JSON.stringify({
              type: "StateChange",
              changed: (_a2 = msg.changed) != null ? _a2 : {}
            }));
          }
        } catch {
        }
      });
      stalwartWs.on("error", (err) => {
        console.error(`[ws/mail] Stalwart WS error for ${username}:`, err.message);
        peer.send(JSON.stringify({ type: "stalwart_error", message: err.message }));
      });
      stalwartWs.on("close", (code, reason) => {
        stalwartConnections.delete(peer.id);
        peer.send(JSON.stringify({
          type: "stalwart_closed",
          code,
          reason: reason.toString()
        }));
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ws/mail] Failed to connect for ${username}:`, msg);
      peer.send(JSON.stringify({ type: "error", message: `Connect failed: ${msg}` }));
      peer.close();
    }
  },
  close(peer) {
    const stalwartWs = stalwartConnections.get(peer.id);
    if (stalwartWs) {
      stalwartWs.close();
      stalwartConnections.delete(peer.id);
    }
  },
  error(peer) {
    const stalwartWs = stalwartConnections.get(peer.id);
    if (stalwartWs) {
      stalwartWs.close();
      stalwartConnections.delete(peer.id);
    }
  }
});

export { mail as default };
//# sourceMappingURL=mail.mjs.map
