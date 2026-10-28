import { b as buildClientDownloadUrl } from './attachment.mjs';

const LIST_PROPERTIES = [
  "id",
  "threadId",
  "mailboxIds",
  "keywords",
  "receivedAt",
  "sentAt",
  "size",
  "from",
  "to",
  "cc",
  "replyTo",
  "subject",
  "preview",
  "hasAttachment"
];
function normaliseAddress(a) {
  return { name: a.name, email: a.email };
}
function normaliseList(raw) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
  return {
    id: raw.id,
    threadId: raw.threadId,
    mailboxIds: (_a = raw.mailboxIds) != null ? _a : {},
    keywords: (_b = raw.keywords) != null ? _b : {},
    receivedAt: (_c = raw.receivedAt) != null ? _c : null,
    sentAt: (_d = raw.sentAt) != null ? _d : null,
    size: (_e = raw.size) != null ? _e : 0,
    from: ((_f = raw.from) != null ? _f : []).map(normaliseAddress),
    to: ((_g = raw.to) != null ? _g : []).map(normaliseAddress),
    cc: ((_h = raw.cc) != null ? _h : []).map(normaliseAddress),
    replyTo: ((_i = raw.replyTo) != null ? _i : []).map(normaliseAddress),
    subject: (_j = raw.subject) != null ? _j : "(no subject)",
    preview: (_k = raw.preview) != null ? _k : "",
    hasAttachment: (_l = raw.hasAttachment) != null ? _l : false,
    isRead: "$seen" in ((_m = raw.keywords) != null ? _m : {}),
    isStarred: "$flagged" in ((_n = raw.keywords) != null ? _n : {})
  };
}
function normaliseFull(raw) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
  const base = normaliseList(raw);
  let textBody = null;
  let htmlBody = null;
  const bodyValues = (_a = raw.bodyValues) != null ? _a : {};
  const textPartId = (_c = (_b = raw.textBody) == null ? void 0 : _b[0]) == null ? void 0 : _c.partId;
  const htmlPartId = (_e = (_d = raw.htmlBody) == null ? void 0 : _d[0]) == null ? void 0 : _e.partId;
  if (textPartId && ((_f = bodyValues[textPartId]) == null ? void 0 : _f.value)) {
    textBody = bodyValues[textPartId].value;
  }
  if (htmlPartId && ((_g = bodyValues[htmlPartId]) == null ? void 0 : _g.value)) {
    htmlBody = bodyValues[htmlPartId].value;
  }
  if (!textBody || !htmlBody) {
    for (const part of [...(_h = raw.textBody) != null ? _h : [], ...(_i = raw.htmlBody) != null ? _i : []]) {
      const val = part.partId ? bodyValues[part.partId] : null;
      if (val == null ? void 0 : val.value) {
        if (!htmlBody && part.type === "text/html") htmlBody = val.value;
        if (!textBody && part.type === "text/plain") textBody = val.value;
      }
    }
  }
  if (!textBody && !htmlBody) {
    for (const [, val] of Object.entries(bodyValues)) {
      if ((val == null ? void 0 : val.value) && !textBody) textBody = val.value;
    }
  }
  const attachments = ((_j = raw.attachments) != null ? _j : []).filter((p) => p.blobId && p.disposition !== "inline").map((p) => {
    var _a2, _b2, _c2, _d2;
    return {
      blobId: p.blobId,
      name: (_a2 = p.name) != null ? _a2 : "attachment",
      type: (_b2 = p.type) != null ? _b2 : "application/octet-stream",
      size: (_c2 = p.size) != null ? _c2 : 0,
      downloadUrl: buildClientDownloadUrl(p.blobId, (_d2 = p.name) != null ? _d2 : "attachment")
    };
  });
  const headers = {};
  for (const h of (_k = raw.headers) != null ? _k : []) {
    headers[h.name.toLowerCase()] = h.value.trim();
  }
  return {
    ...base,
    htmlBody,
    textBody,
    attachments,
    headers,
    inReplyTo: (_l = headers["in-reply-to"]) != null ? _l : null,
    messageId: (_m = headers["message-id"]) != null ? _m : null,
    references: (_n = headers["references"]) != null ? _n : null
  };
}
async function queryEmails(client, accountId, filter, position = 0, limit = 20) {
  var _a, _b, _c;
  const jmapFilter = typeof filter === "string" ? { inMailbox: filter } : filter;
  const response = await client.request([
    [
      "Email/query",
      {
        accountId,
        filter: jmapFilter,
        sort: [{ property: "receivedAt", isAscending: false }],
        position,
        limit,
        calculateTotal: true
      },
      "email-query"
    ]
  ]);
  const args = client.getResponse(
    response,
    "email-query"
  );
  return { ids: (_a = args.ids) != null ? _a : [], total: (_b = args.total) != null ? _b : 0, queryState: (_c = args.queryState) != null ? _c : "" };
}
async function getEmailList(client, accountId, ids) {
  var _a, _b;
  const response = await client.request([
    [
      "Email/get",
      { accountId, ids, properties: LIST_PROPERTIES },
      "email-list"
    ]
  ]);
  const args = client.getResponse(response, "email-list");
  return {
    emails: ((_a = args.list) != null ? _a : []).map(normaliseList),
    state: (_b = args.state) != null ? _b : ""
  };
}
async function getEmailFull(client, accountId, id) {
  var _a, _b, _c, _d, _e;
  const response = await client.request([
    [
      "Email/get",
      {
        accountId,
        ids: [id],
        properties: [
          ...LIST_PROPERTIES,
          "bodyStructure",
          "bodyValues",
          "htmlBody",
          "textBody",
          "attachments",
          "headers"
        ],
        fetchTextBodyValues: true,
        fetchHTMLBodyValues: true,
        maxBodyValueBytes: 256 * 1024
      },
      "email-full"
    ]
  ]);
  const args = client.getResponse(response, "email-full");
  const raw = (_a = args.list) == null ? void 0 : _a[0];
  if (!raw) throw new Error(`Email ${id} not found`);
  console.log("[getEmailFull] raw.textBody:", JSON.stringify(raw.textBody));
  console.log("[getEmailFull] raw.htmlBody:", JSON.stringify(raw.htmlBody));
  console.log("[getEmailFull] raw.bodyStructure type:", (_b = raw.bodyStructure) == null ? void 0 : _b.type);
  console.log("[getEmailFull] raw.bodyValues keys:", Object.keys((_c = raw.bodyValues) != null ? _c : {}));
  console.log("[getEmailFull] raw.attachments count:", (_e = (_d = raw.attachments) == null ? void 0 : _d.length) != null ? _e : 0);
  return normaliseFull(raw);
}
async function setEmailKeyword(client, accountId, id, keyword, value) {
  await client.request([
    [
      "Email/set",
      {
        accountId,
        update: { [id]: { [`keywords/${keyword}`]: value } }
      },
      "kw-set"
    ]
  ]);
}
async function moveEmail(client, accountId, id, mailboxId) {
  await client.request([
    [
      "Email/set",
      {
        accountId,
        update: { [id]: { mailboxIds: { [mailboxId]: true } } }
      },
      "move"
    ]
  ]);
}
async function destroyEmail(client, accountId, id) {
  await client.request([
    ["Email/set", { accountId, destroy: [id] }, "destroy"]
  ]);
}
async function createDraft(client, accountId, draftsMailboxId, draft) {
  var _a, _b, _c, _d, _e, _f, _g;
  const bodyValues = {};
  let innerStructure;
  if (draft.htmlBody && draft.textBody) {
    bodyValues["1"] = { value: draft.textBody, charset: "utf-8" };
    bodyValues["2"] = { value: draft.htmlBody, charset: "utf-8" };
    innerStructure = {
      type: "multipart/alternative",
      subParts: [
        { partId: "1", type: "text/plain" },
        { partId: "2", type: "text/html" }
      ]
    };
  } else if (draft.htmlBody) {
    bodyValues["1"] = { value: draft.htmlBody, charset: "utf-8" };
    innerStructure = { partId: "1", type: "text/html" };
  } else {
    const text = (_a = draft.textBody) != null ? _a : "";
    bodyValues["1"] = { value: text, charset: "utf-8" };
    innerStructure = { partId: "1", type: "text/plain" };
  }
  const attachmentParts = ((_b = draft.attachments) != null ? _b : []).map((att) => ({
    blobId: att.blobId,
    type: att.type || "application/octet-stream",
    name: att.name,
    disposition: "attachment",
    ...typeof att.size === "number" ? { size: att.size } : {}
  }));
  const bodyStructure = attachmentParts.length ? {
    type: "multipart/mixed",
    subParts: [innerStructure, ...attachmentParts]
  } : innerStructure;
  const emailCreate = {
    mailboxIds: { [draftsMailboxId]: true },
    keywords: { $draft: true },
    from: [{ name: draft.from.name, email: draft.from.email }],
    to: draft.to,
    cc: (_c = draft.cc) != null ? _c : [],
    bcc: (_d = draft.bcc) != null ? _d : [],
    subject: draft.subject,
    bodyValues,
    bodyStructure
  };
  if (draft.references) emailCreate["header:References:asText"] = draft.references;
  if (draft.inReplyTo) emailCreate["header:In-Reply-To:asText"] = draft.inReplyTo;
  const response = await client.request([
    [
      "Email/set",
      { accountId, create: { draft: emailCreate } },
      "create-draft"
    ]
  ]);
  const args = client.getResponse(response, "create-draft");
  if ((_e = args.notCreated) == null ? void 0 : _e.draft) {
    const err = args.notCreated.draft;
    throw new Error(`Draft creation failed: ${err.type} \u2014 ${(_f = err.description) != null ? _f : ""}`);
  }
  const created = (_g = args.created) == null ? void 0 : _g.draft;
  if (!(created == null ? void 0 : created.id)) throw new Error("Draft creation failed: no id returned");
  return created.id;
}
async function updateDraft(client, accountId, emailId, patch) {
  await client.request([
    ["Email/set", { accountId, update: { [emailId]: patch } }, "update-draft"]
  ]);
}
async function getEmailChanges(client, accountId, sinceState) {
  const response = await client.request([
    ["Email/changes", { accountId, sinceState, maxChanges: 100 }, "email-changes"]
  ]);
  const args = client.getResponse(response, "email-changes");
  return args;
}

export { getEmailChanges as a, getEmailList as b, createDraft as c, destroyEmail as d, getEmailFull as g, moveEmail as m, queryEmails as q, setEmailKeyword as s, updateDraft as u };
//# sourceMappingURL=email.mjs.map
