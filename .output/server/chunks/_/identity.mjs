async function getIdentities(client, accountId) {
  var _a;
  const response = await client.request([
    ["Identity/get", { accountId, ids: null }, "identities"]
  ]);
  const args = client.getResponse(response, "identities");
  return ((_a = args.list) != null ? _a : []).map((i) => {
    var _a2, _b;
    return {
      id: i.id,
      name: i.name,
      email: i.email,
      replyTo: (_a2 = i.replyTo) != null ? _a2 : null,
      bcc: (_b = i.bcc) != null ? _b : null
    };
  });
}

export { getIdentities as g };
//# sourceMappingURL=identity.mjs.map
