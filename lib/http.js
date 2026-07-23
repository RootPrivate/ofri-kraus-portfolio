export function setApiHeaders(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
}

export function sendJson(res, status, payload) {
  setApiHeaders(res);
  res.status(status).json(payload);
}

export function methodNotAllowed(res, allowed) {
  res.setHeader("Allow", allowed.join(", "));
  sendJson(res, 405, { error: "Method not allowed" });
}

export async function readJsonBody(req, maxBytes = 500_000) {
  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > maxBytes) {
    const error = new Error("Request body is too large");
    error.status = 413;
    throw error;
  }

  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error("Request body is too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function assertSameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "https";
  if (!origin || !host || origin !== `${protocol}://${host}`) {
    const error = new Error("Invalid request origin");
    error.status = 403;
    throw error;
  }
}

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return String(value || req.socket?.remoteAddress || "unknown").trim().slice(0, 120);
}

export function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";
  const prefix = `${name}=`;
  for (const part of cookieHeader.split(";")) {
    const cookie = part.trim();
    if (cookie.startsWith(prefix)) return decodeURIComponent(cookie.slice(prefix.length));
  }
  return "";
}

export function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || "/"}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (options.secure !== false) parts.push("Secure");
  parts.push(`SameSite=${options.sameSite || "Strict"}`);
  return parts.join("; ");
}

export function safeError(res, error, fallback = "Request failed") {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  if (status >= 500) console.error(error?.message || fallback);
  sendJson(res, status, { error: status >= 500 ? fallback : error.message });
}
