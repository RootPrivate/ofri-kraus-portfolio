import { handleUpload } from "@vercel/blob/client";
import { requireOwner } from "../lib/cms-auth.js";
import { isManagedVideoPath } from "../lib/cms-store.js";
import { assertSameOrigin, methodNotAllowed, readJsonBody, safeError, sendJson } from "../lib/http.js";

const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const VIDEO_CONTENT_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    assertSameOrigin(req);
    await requireOwner(req);
    const body = await readJsonBody(req, 20_000);
    if (body.type !== "blob.generate-client-token") {
      const error = new Error("Invalid upload request");
      error.status = 400;
      throw error;
    }

    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!isManagedVideoPath(pathname)) {
          const error = new Error("Invalid video path");
          error.status = 400;
          throw error;
        }

        return {
          allowedContentTypes: VIDEO_CONTENT_TYPES,
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          validUntil: Date.now() + 10 * 60 * 1000,
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 31_536_000
        };
      }
    });

    return sendJson(res, 200, result);
  } catch (error) {
    return safeError(res, error, "Unable to prepare video upload");
  }
}
