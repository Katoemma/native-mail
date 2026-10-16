import { c as createError } from '../nitro/nitro.mjs';
import { b as buildDownloadUrl, a as buildUploadUrl } from './session.mjs';

async function uploadAttachment(accessToken, session, data, contentType, name) {
  var _a;
  const uploadUrl = buildUploadUrl(session);
  const raw = await $fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": contentType,
      "X-JMAP-FileName": encodeURIComponent(name)
    },
    body: data
  });
  return { blobId: raw.blobId, size: raw.size, type: (_a = raw.type) != null ? _a : contentType, name };
}
async function downloadAttachment(accessToken, session, blobId, name) {
  var _a;
  const url = buildDownloadUrl(session, blobId, name);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    throw createError({
      statusCode: res.status === 401 || res.status === 403 ? 401 : 502,
      statusMessage: `Attachment download failed (${res.status})`
    });
  }
  const data = Buffer.from(await res.arrayBuffer());
  return {
    data,
    contentType: (_a = res.headers.get("content-type")) != null ? _a : "application/octet-stream",
    name
  };
}
function buildClientDownloadUrl(blobId, name) {
  const params = new URLSearchParams({ name });
  return `/api/attachments/${encodeURIComponent(blobId)}?${params.toString()}`;
}

export { buildClientDownloadUrl as b, downloadAttachment as d, uploadAttachment as u };
//# sourceMappingURL=attachment.mjs.map
