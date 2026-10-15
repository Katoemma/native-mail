async function getMailboxes(client, accountId) {
  var _a;
  const response = await client.request([
    [
      "Mailbox/get",
      {
        accountId,
        ids: null,
        properties: [
          "id",
          "name",
          "role",
          "totalEmails",
          "unreadEmails",
          "totalThreads",
          "unreadThreads",
          "parentId",
          "sortOrder"
        ]
      },
      "mailboxes"
    ]
  ]);
  const args = client.getResponse(response, "mailboxes");
  return ((_a = args.list) != null ? _a : []).map((m) => {
    var _a2, _b, _c, _d, _e, _f, _g;
    return {
      id: m.id,
      name: m.name,
      role: (_a2 = m.role) != null ? _a2 : null,
      totalEmails: (_b = m.totalEmails) != null ? _b : 0,
      unreadEmails: (_c = m.unreadEmails) != null ? _c : 0,
      totalThreads: (_d = m.totalThreads) != null ? _d : 0,
      unreadThreads: (_e = m.unreadThreads) != null ? _e : 0,
      parentId: (_f = m.parentId) != null ? _f : null,
      sortOrder: (_g = m.sortOrder) != null ? _g : 0
    };
  });
}

export { getMailboxes as g };
//# sourceMappingURL=mailbox.mjs.map
