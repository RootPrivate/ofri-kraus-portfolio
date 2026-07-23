import { randomUUID } from "node:crypto";
import { requireOwner } from "../lib/cms-auth.js";
import { deleteMedia, listMedia, MEDIA_PREFIX, publicMediaUrl, readContent, saveMedia } from "../lib/cms-store.js";
import { assertSameOrigin, methodNotAllowed, readJsonBody, safeError, sendJson } from "../lib/http.js";

const MAX_IMAGE_BYTES = 2_800_000;
const MAX_ENCODED_BYTES = 3_800_000;

function decodeImageBody(body) {
  const encoded = typeof body?.data === "string" ? body.data : "";
  if (!encoded || encoded.length > MAX_ENCODED_BYTES || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    const error = new Error("Images must be smaller than 2.8 MB");
    error.status = 413;
    throw error;
  }
  const buffer = Buffer.from(encoded, "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    const error = new Error("Images must be smaller than 2.8 MB");
    error.status = 413;
    throw error;
  }
  return buffer;
}

function detectImage(buffer) {
  if (buffer.length < 16) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { type: "image/jpeg", extension: "jpg" };
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { type: "image/png", extension: "png" };
  }
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return { type: "image/webp", extension: "webp" };
  }
  const box = buffer.subarray(4, 12).toString("ascii");
  if (box.startsWith("ftyp") && /avif|avis/.test(buffer.subarray(8, 32).toString("ascii"))) {
    return { type: "image/avif", extension: "avif" };
  }
  return null;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      await requireOwner(req);
      return sendJson(res, 200, { media: await listMedia() });
    }

    if (req.method === "POST") {
      assertSameOrigin(req);
      await requireOwner(req);
      const body = await readJsonBody(req, 3_900_000);
      const buffer = decodeImageBody(body);
      const image = detectImage(buffer);
      if (!image) {
        const error = new Error("Upload a JPG, PNG, WebP, or AVIF image");
        error.status = 415;
        throw error;
      }

      const pathname = `${MEDIA_PREFIX}${Date.now()}-${randomUUID()}.${image.extension}`;
      await saveMedia(pathname, buffer, image.type);
      return sendJson(res, 201, {
        media: {
          pathname,
          url: publicMediaUrl(pathname),
          size: buffer.length,
          uploadedAt: new Date().toISOString()
        }
      });
    }

    if (req.method === "DELETE") {
      assertSameOrigin(req);
      await requireOwner(req);
      const body = await readJsonBody(req, 10_000);
      const pathname = typeof body.pathname === "string" ? body.pathname : "";
      if (!pathname.startsWith(MEDIA_PREFIX)) {
        const error = new Error("Invalid media path");
        error.status = 400;
        throw error;
      }

      const { content } = await readContent();
      const serialized = JSON.stringify(content);
      if (serialized.includes(pathname) || serialized.includes(encodeURIComponent(pathname))) {
        const error = new Error("Remove this image from the website before deleting it from the library");
        error.status = 409;
        throw error;
      }

      await deleteMedia(pathname);
      return sendJson(res, 200, { ok: true });
    }

    return methodNotAllowed(res, ["GET", "POST", "DELETE"]);
  } catch (error) {
    return safeError(res, error, "Unable to manage media");
  }
}
