import { createSessionCookie, publicOwner, requireOwner, updateCredentials } from "../../lib/cms-auth.js";
import { assertSameOrigin, getClientIp, methodNotAllowed, readJsonBody, safeError, sendJson } from "../../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "PUT") return methodNotAllowed(res, ["PUT"]);
  try {
    assertSameOrigin(req);
    await requireOwner(req, { allowPasswordChange: true });
    const body = await readJsonBody(req, 12_000);
    const owner = await updateCredentials(body.currentPassword, body.email, body.newPassword, getClientIp(req));
    res.setHeader("Set-Cookie", createSessionCookie(owner));
    return sendJson(res, 200, { owner: publicOwner(owner) });
  } catch (error) {
    return safeError(res, error, "Unable to update login details");
  }
}
