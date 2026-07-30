import { Readable } from "node:stream";
import { readMedia } from "../lib/cms-store.js";
import { methodNotAllowed, safeError } from "../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return methodNotAllowed(res, ["GET", "HEAD"]);
  try {
    const pathname = typeof req.query.path === "string" ? req.query.path : "";
    const range = typeof req.headers.range === "string" ? req.headers.range : "";
    if (range && !/^bytes=\d*-\d*$/.test(range)) return res.status(416).end("Invalid range");
    const result = await readMedia(pathname, {
      range,
      ifNoneMatch: typeof req.headers["if-none-match"] === "string" ? req.headers["if-none-match"] : undefined
    });
    if (!result) return res.status(404).end("Not found");
    if (result.statusCode === 304) return res.status(304).end();

    res.setHeader("Content-Type", result.blob.contentType || "application/octet-stream");
    const contentLength = result.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", result.blob.etag);
    res.setHeader("X-Content-Type-Options", "nosniff");
    for (const header of ["accept-ranges", "content-range", "last-modified"]) {
      const value = result.headers.get(header);
      if (value) res.setHeader(header, value);
    }
    const status = range && result.headers.get("content-range") ? 206 : 200;
    if (req.method === "HEAD") {
      await result.stream.cancel().catch(() => {});
      return res.status(status).end();
    }

    res.status(status);
    Readable.fromWeb(result.stream).on("error", () => res.destroy()).pipe(res);
    return undefined;
  } catch (error) {
    return safeError(res, error, "Unable to load media");
  }
}
