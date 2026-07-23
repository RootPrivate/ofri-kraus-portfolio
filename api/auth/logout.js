import { clearSessionCookie } from "../../lib/cms-auth.js";
import { assertSameOrigin, methodNotAllowed, safeError, sendJson } from "../../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  try {
    assertSameOrigin(req);
    res.setHeader("Set-Cookie", clearSessionCookie());
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    return safeError(res, error, "Unable to sign out");
  }
}
