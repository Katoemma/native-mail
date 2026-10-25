import { g as getMailboxes } from './mailbox.mjs';
import { J as JmapError } from './session.mjs';

function hasEmailPush(session) {
  var _a;
  return "urn:ietf:params:jmap:emailpush" in ((_a = session.capabilities) != null ? _a : {});
}
function pushUsing(includeEmailPush) {
  const using = [
    "urn:ietf:params:jmap:core",
    "urn:ietf:params:jmap:mail"
  ];
  if (includeEmailPush) using.push("urn:ietf:params:jmap:emailpush");
  return using;
}
function getVapidPublicKey(session) {
  var _a, _b;
  const vapid = (_a = session.capabilities) == null ? void 0 : _a["urn:ietf:params:jmap:webpush-vapid"];
  return ((_b = vapid == null ? void 0 : vapid.applicationServerKey) == null ? void 0 : _b.trim()) || null;
}
async function createPushSubscription(client, session, input) {
  var _a, _b, _c, _d;
  const create = {
    deviceClientId: input.deviceClientId,
    url: input.url,
    keys: {
      p256dh: input.keys.p256dh,
      auth: input.keys.auth
    },
    // Empty types → no StateChange noise; EmailPush covers new mail
    types: []
  };
  if (input.expires) create.expires = input.expires;
  if (hasEmailPush(session)) {
    const mailboxes = await getMailboxes(client, session.accountId);
    const inbox = mailboxes.find((m) => m.role === "inbox");
    if (inbox) {
      create.emailPush = {
        [session.accountId]: {
          filter: { inMailbox: inbox.id },
          properties: ["id", "from", "subject", "preview"],
          urgency: "high"
        }
      };
    }
  }
  const response = await client.request([
    [
      "PushSubscription/set",
      {
        create: { sub: create }
      },
      "pushset"
    ]
  ], pushUsing(hasEmailPush(session)));
  const args = client.getResponse(response, "pushset");
  const created = (_a = args.created) == null ? void 0 : _a.sub;
  if (created == null ? void 0 : created.id) return { id: created.id };
  const err = (_b = args.notCreated) == null ? void 0 : _b.sub;
  throw new JmapError(
    (_c = err == null ? void 0 : err.type) != null ? _c : "serverFail",
    (_d = err == null ? void 0 : err.description) != null ? _d : "Failed to create push subscription",
    void 0,
    502
  );
}
async function verifyPushSubscription(client, pushSubscriptionId, verificationCode) {
  var _a, _b, _c, _d;
  const response = await client.request([
    [
      "PushSubscription/set",
      {
        update: {
          [pushSubscriptionId]: { verificationCode }
        }
      },
      "pushverify"
    ]
  ], pushUsing(false));
  const args = client.getResponse(response, "pushverify");
  if ((_a = args.updated) == null ? void 0 : _a.includes(pushSubscriptionId)) return;
  const err = (_b = args.notUpdated) == null ? void 0 : _b[pushSubscriptionId];
  throw new JmapError(
    (_c = err == null ? void 0 : err.type) != null ? _c : "serverFail",
    (_d = err == null ? void 0 : err.description) != null ? _d : "Failed to verify push subscription",
    void 0,
    502
  );
}
async function destroyPushSubscription(client, pushSubscriptionId) {
  var _a, _b, _c, _d;
  const response = await client.request([
    [
      "PushSubscription/set",
      {
        destroy: [pushSubscriptionId]
      },
      "pushdestroy"
    ]
  ], pushUsing(false));
  const args = client.getResponse(response, "pushdestroy");
  if ((_a = args.destroyed) == null ? void 0 : _a.includes(pushSubscriptionId)) return;
  const err = (_b = args.notDestroyed) == null ? void 0 : _b[pushSubscriptionId];
  if ((err == null ? void 0 : err.type) === "notFound") return;
  if (err) {
    throw new JmapError(
      (_c = err.type) != null ? _c : "serverFail",
      (_d = err.description) != null ? _d : "Failed to destroy push subscription",
      void 0,
      502
    );
  }
}

export { createPushSubscription as c, destroyPushSubscription as d, getVapidPublicKey as g, verifyPushSubscription as v };
//# sourceMappingURL=push.mjs.map
