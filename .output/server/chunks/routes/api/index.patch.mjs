import { d as defineEventHandler, j as readBody, c as createError, k as getRequestURL, u as useRuntimeConfig } from '../../nitro/nitro.mjs';
import { w as withJmap } from '../../_/jmap-auth.mjs';
import { S as SIGNATURE_MAX_CHARS, D as DEFAULT_SIGNATURE_LOGO_PATH, r as resolveSignatureLogoUrl, g as getIdentities, u as updateIdentitySignatures } from '../../_/identity.mjs';
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
import '../../_/session.mjs';
import '../../_/client.mjs';
import '../../_/oauth.mjs';

const index_patch = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const textSignature = typeof body.textSignature === "string" ? body.textSignature : null;
  if (textSignature === null) {
    throw createError({
      statusCode: 400,
      statusMessage: "textSignature is required"
    });
  }
  if (textSignature.length > SIGNATURE_MAX_CHARS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Signature must be at most ${SIGNATURE_MAX_CHARS} characters`
    });
  }
  const config = useRuntimeConfig();
  const defaultPath = config.public.defaultSignatureLogo || DEFAULT_SIGNATURE_LOGO_PATH;
  const origin = getRequestURL(event).origin;
  const absoluteLogo = resolveSignatureLogoUrl(
    typeof body.logoUrl === "string" ? body.logoUrl : "",
    origin,
    defaultPath
  );
  return withJmap(event, async ({ client, jmapSession }) => {
    var _a, _b;
    let identityId = (_a = body.identityId) == null ? void 0 : _a.trim();
    if (!identityId) {
      const list = await getIdentities(client, jmapSession.accountId);
      identityId = (_b = list[0]) == null ? void 0 : _b.id;
    }
    if (!identityId) {
      throw createError({
        statusCode: 404,
        statusMessage: "No sending identity found"
      });
    }
    const identity = await updateIdentitySignatures(
      client,
      jmapSession.accountId,
      identityId,
      textSignature,
      absoluteLogo
    );
    return { identity };
  });
});

export { index_patch as default };
//# sourceMappingURL=index.patch.mjs.map
