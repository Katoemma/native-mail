import { J as JmapError } from './session.mjs';

const IDENTITY_PROPS = [
  "id",
  "name",
  "email",
  "replyTo",
  "bcc",
  "textSignature",
  "htmlSignature"
];
const SIGNATURE_MAX_CHARS = 2047;
const DEFAULT_SIGNATURE_LOGO_PATH = "/native-logo.png";
function mapIdentity(i) {
  var _a, _b, _c, _d;
  const htmlSignature = (_a = i.htmlSignature) != null ? _a : "";
  return {
    id: i.id,
    name: i.name,
    email: i.email,
    replyTo: (_b = i.replyTo) != null ? _b : null,
    bcc: (_c = i.bcc) != null ? _c : null,
    textSignature: (_d = i.textSignature) != null ? _d : "",
    htmlSignature,
    logoUrl: extractLogoUrl(htmlSignature)
  };
}
async function getIdentities(client, accountId) {
  var _a;
  const response = await client.request([
    [
      "Identity/get",
      {
        accountId,
        ids: null,
        properties: [...IDENTITY_PROPS]
      },
      "identities"
    ]
  ]);
  const args = client.getResponse(response, "identities");
  return ((_a = args.list) != null ? _a : []).map(mapIdentity);
}
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function extractLogoUrl(html) {
  var _a, _b;
  if (!html) return "";
  const m = html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  return (_b = (_a = m == null ? void 0 : m[1]) == null ? void 0 : _a.trim()) != null ? _b : "";
}
function normalizeLogoUrl(raw) {
  const url = raw.trim();
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    return u.toString();
  } catch {
    return "";
  }
}
function resolveSignatureLogoUrl(logoUrl, requestOrigin, defaultPath = DEFAULT_SIGNATURE_LOGO_PATH) {
  const origin = requestOrigin.replace(/\/$/, "");
  const raw = (logoUrl != null ? logoUrl : "").trim();
  if (!raw) {
    return `${origin}${defaultPath.startsWith("/") ? defaultPath : `/${defaultPath}`}`;
  }
  if (raw.startsWith("/")) {
    return `${origin}${raw}`;
  }
  return normalizeLogoUrl(raw) || `${origin}${DEFAULT_SIGNATURE_LOGO_PATH}`;
}
function buildHtmlSignature(text, absoluteLogoUrl) {
  const parts = [];
  const trimmed = text.trimEnd();
  if (trimmed) {
    parts.push(escapeHtml(trimmed).replace(/\r\n|\r|\n/g, "<br>"));
  }
  const logo = normalizeLogoUrl(absoluteLogoUrl);
  if (logo) {
    if (parts.length) parts.push("<br><br>");
    parts.push(
      `<img src="${escapeHtml(logo)}" alt="Native" width="120" style="max-width:120px;height:auto;display:block;border:0;">`
    );
  }
  return parts.join("");
}
async function updateIdentitySignatures(client, accountId, identityId, textSignature, absoluteLogoUrl) {
  var _a, _b, _c;
  if (textSignature.length > SIGNATURE_MAX_CHARS) {
    throw new JmapError(
      "invalidArguments",
      `Signature must be at most ${SIGNATURE_MAX_CHARS} characters`,
      ["textSignature"],
      400
    );
  }
  const htmlSignature = buildHtmlSignature(textSignature, absoluteLogoUrl);
  if (htmlSignature.length > SIGNATURE_MAX_CHARS) {
    throw new JmapError(
      "invalidArguments",
      `HTML signature is too long (${htmlSignature.length}/${SIGNATURE_MAX_CHARS}). Use a shorter logo URL or less text.`,
      ["htmlSignature"],
      400
    );
  }
  const response = await client.request([
    [
      "Identity/set",
      {
        accountId,
        update: {
          [identityId]: {
            textSignature,
            htmlSignature
          }
        }
      },
      "idset"
    ]
  ]);
  const args = client.getResponse(response, "idset");
  const notUpdated = (_a = args.notUpdated) == null ? void 0 : _a[identityId];
  if (notUpdated) {
    throw new JmapError(
      (_b = notUpdated.type) != null ? _b : "invalidPatch",
      (_c = notUpdated.description) != null ? _c : "Failed to update signature",
      notUpdated.properties,
      400
    );
  }
  const identities = await getIdentities(client, accountId);
  const updated = identities.find((i) => i.id === identityId);
  if (!updated) {
    throw new JmapError("notFound", "Identity not found after update", void 0, 404);
  }
  return updated;
}

export { DEFAULT_SIGNATURE_LOGO_PATH as D, SIGNATURE_MAX_CHARS as S, getIdentities as g, resolveSignatureLogoUrl as r, updateIdentitySignatures as u };
//# sourceMappingURL=identity.mjs.map
