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
  const contentType = String(req.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json" && !contentType.endsWith("+json")) {
    const error = new Error("Content-Type must be application/json");
    error.status = 415;
    throw error;
  }

  const contentLength = Number(req.headers["content-length"] || 0);
  if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > maxBytes) {
    const error = new Error("Request body is too large");
    error.status = 413;
    throw error;
  }

  let requestBody;
  try {
    requestBody = req.body;
  } catch {
    const error = new Error("Invalid JSON body");
    error.status = 400;
    throw error;
  }

  if (requestBody !== undefined && requestBody !== null) {
    if (typeof requestBody === "string" || Buffer.isBuffer(requestBody)) {
      const rawBody = Buffer.isBuffer(requestBody) ? requestBody : Buffer.from(requestBody, "utf8");
      if (rawBody.length > maxBytes) {
        const error = new Error("Request body is too large");
        error.status = 413;
        throw error;
      }
      return parseJsonObject(rawBody.toString("utf8"));
    }

    if (typeof requestBody !== "object" || requestBody instanceof Error) {
      const error = new Error("Invalid JSON body");
      error.status = 400;
      throw error;
    }

    let serialized;
    try {
      serialized = JSON.stringify(requestBody);
    } catch {
      const error = new Error("Invalid JSON body");
      error.status = 400;
      throw error;
    }
    if (Array.isArray(requestBody) || Buffer.byteLength(serialized, "utf8") > maxBytes) {
      const error = new Error(Array.isArray(requestBody) ? "JSON body must be an object" : "Request body is too large");
      error.status = Array.isArray(requestBody) ? 400 : 413;
      throw error;
    }
    return requestBody;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) {
      const error = new Error("Request body is too large");
      error.status = 413;
      throw error;
    }
    chunks.push(buffer);
  }

  if (!chunks.length) return {};
  return parseJsonObject(Buffer.concat(chunks).toString("utf8"));
}

function parseJsonObject(rawBody) {
  try {
    const parsed = JSON.parse(rawBody || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      const error = new Error("JSON body must be an object");
      error.status = 400;
      throw error;
    }
    return parsed;
  } catch (error) {
    if (error?.status) throw error;
    const invalid = new Error("Invalid JSON body");
    invalid.status = 400;
    throw invalid;
  }
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
    if (cookie.startsWith(prefix)) {
      try {
        return decodeURIComponent(cookie.slice(prefix.length));
      } catch {
        return "";
      }
    }
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
  parts.push(`Priority=${options.priority || "High"}`);
  return parts.join("; ");
}

export function safeError(res, error, fallback = "Request failed") {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  if (status >= 500) console.error(error?.message || fallback);
  sendJson(res, status, { error: status >= 500 ? fallback : error.message });
}
