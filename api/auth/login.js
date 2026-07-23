import { authenticateOwner, createSessionCookie, publicOwner } from "../../lib/cms-auth.js";
import { assertSameOrigin, getClientIp, methodNotAllowed, readJsonBody, safeError, sendJson } from "../../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  try {
    assertSameOrigin(req);
    const body = await readJsonBody(req, 10_000);
    const owner = await authenticateOwner(body.email, body.password, getClientIp(req));
    res.setHeader("Set-Cookie", createSessionCookie(owner));
    return sendJson(res, 200, { owner: publicOwner(owner) });
  } catch (error) {
    if (error?.retryAfter) res.setHeader("Retry-After", String(error.retryAfter));
    return safeError(res, error, "Unable to sign in");
  }
}
