import { publicOwner, requireOwner } from "../../lib/cms-auth.js";
import { methodNotAllowed, safeError, sendJson } from "../../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  try {
    const { record } = await requireOwner(req, { allowPasswordChange: true });
    return sendJson(res, 200, { owner: publicOwner(record) });
  } catch (error) {
    return safeError(res, error, "Authentication required");
  }
}
