import { requireOwner } from "../lib/cms-auth.js";
import { readContent, saveContent } from "../lib/cms-store.js";
import { assertSameOrigin, methodNotAllowed, readJsonBody, safeError, sendJson } from "../lib/http.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { content } = await readContent();
      return sendJson(res, 200, { content });
    }

    if (req.method === "PUT") {
      assertSameOrigin(req);
      await requireOwner(req);
      const body = await readJsonBody(req, 800_000);
      const content = await saveContent(body.content, body.expectedRevision);
      return sendJson(res, 200, { content });
    }

    return methodNotAllowed(res, ["GET", "PUT"]);
  } catch (error) {
    if (error?.code === "CONTENT_CONFLICT") error.status = 409;
    return safeError(res, error, "Unable to access website content");
  }
}
