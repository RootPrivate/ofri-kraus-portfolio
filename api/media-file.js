import { readMedia } from "../lib/cms-store.js";
import { methodNotAllowed, safeError } from "../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return methodNotAllowed(res, ["GET", "HEAD"]);
  try {
    const pathname = typeof req.query.path === "string" ? req.query.path : "";
    const result = await readMedia(pathname);
    if (!result) return res.status(404).end("Not found");

    res.setHeader("Content-Type", result.blob.contentType || "application/octet-stream");
    res.setHeader("Content-Length", String(result.blob.size));
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", result.blob.etag);
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "HEAD") return res.status(200).end();

    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
    return res.status(200).end(buffer);
  } catch (error) {
    return safeError(res, error, "Unable to load media");
  }
}
