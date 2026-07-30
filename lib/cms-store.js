import { BlobPreconditionFailedError, del, get, list, put } from "@vercel/blob";
import { normalizeContent } from "./cms-schema.js";

export const CONTENT_PATH = "cms/content.json";
export const AUTH_PATH = "cms/auth.json";
export const MEDIA_PREFIX = "cms/media/";
export const ATTEMPT_PREFIX = "cms/login-attempts/";
const MEDIA_PATH_PATTERN = /^cms\/media\/\d{10,16}-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|avif|mp4|webm|mov)$/i;
const VIDEO_PATH_PATTERN = /\.(?:mp4|webm|mov)$/i;

export function isManagedMediaPath(pathname) {
  return typeof pathname === "string" && MEDIA_PATH_PATTERN.test(pathname);
}

export function isManagedVideoPath(pathname) {
  return isManagedMediaPath(pathname) && VIDEO_PATH_PATTERN.test(pathname);
}

function assertStorageConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error("CMS storage is not configured");
  }
}

export async function readPrivateJson(pathname) {
  assertStorageConfigured();
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) return null;
  if (result.blob.size > 1_000_000) throw new Error("CMS record is too large");

  const text = await new Response(result.stream).text();
  return {
    data: JSON.parse(text),
    // Compressed private responses may expose a weak HTTP ETag, while Blob
    // conditional writes require the underlying strong value.
    etag: result.blob.etag.replace(/^W\//, ""),
    uploadedAt: result.blob.uploadedAt
  };
}

export async function writePrivateJson(pathname, data, options = {}) {
  assertStorageConfigured();
  const body = JSON.stringify(data);
  if (Buffer.byteLength(body, "utf8") > 1_000_000) throw new Error("CMS record is too large");

  return put(pathname, body, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: Boolean(options.etag),
    ifMatch: options.etag,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60
  });
}

export async function deletePrivate(pathname, etag) {
  assertStorageConfigured();
  await del(pathname, etag ? { ifMatch: etag } : undefined);
}

export async function readContent() {
  const record = await readPrivateJson(CONTENT_PATH);
  return {
    content: normalizeContent(record?.data),
    etag: record?.etag || null
  };
}

export async function saveContent(input, expectedRevision) {
  const current = await readContent();
  if (expectedRevision && current.content.revision !== expectedRevision) {
    const error = new Error("Content changed in another session");
    error.code = "CONTENT_CONFLICT";
    throw error;
  }

  const content = normalizeContent(input);
  content.revision = crypto.randomUUID();
  content.updatedAt = new Date().toISOString();

  try {
    await writePrivateJson(CONTENT_PATH, content, { etag: current.etag });
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) {
      const conflict = new Error("Content changed in another session");
      conflict.code = "CONTENT_CONFLICT";
      throw conflict;
    }
    throw error;
  }

  return content;
}

export function publicMediaUrl(pathname) {
  if (!isManagedMediaPath(pathname)) throw new Error("Invalid media path");
  return `/api/media-file?path=${encodeURIComponent(pathname)}`;
}

export async function listMedia() {
  assertStorageConfigured();
  const result = await list({ prefix: MEDIA_PREFIX, limit: 1000 });
  return result.blobs
    .filter((blob) => isManagedMediaPath(blob.pathname))
    .map((blob) => ({
      pathname: blob.pathname,
      url: publicMediaUrl(blob.pathname),
      kind: isManagedVideoPath(blob.pathname) ? "video" : "image",
      contentType: blob.contentType,
      size: blob.size,
      uploadedAt: blob.uploadedAt
    }))
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

export async function saveMedia(pathname, body, contentType) {
  assertStorageConfigured();
  if (!isManagedMediaPath(pathname)) throw new Error("Invalid media path");
  return put(pathname, body, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType,
    cacheControlMaxAge: 31_536_000,
    maximumSizeInBytes: 3_500_000
  });
}

export async function readMedia(pathname, options = {}) {
  assertStorageConfigured();
  if (!isManagedMediaPath(pathname)) return null;
  const headers = {};
  if (typeof options.range === "string" && /^bytes=\d*-\d*$/.test(options.range)) {
    headers.Range = options.range;
  }
  return get(pathname, {
    access: "private",
    useCache: true,
    ifNoneMatch: options.ifNoneMatch,
    headers
  });
}

export async function deleteMedia(pathname) {
  assertStorageConfigured();
  if (!isManagedMediaPath(pathname)) {
    throw new Error("Invalid media path");
  }
  await del(pathname);
}
