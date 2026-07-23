import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";
import { ATTEMPT_PREFIX, AUTH_PATH, deletePrivate, readPrivateJson, writePrivateJson } from "./cms-store.js";
import { getCookie, serializeCookie } from "./http.js";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "ofri_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function parseEmail(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 180 ? email : "";
}

function normalizeAuthRecord(value) {
  if (!value || typeof value !== "object") return null;
  const email = parseEmail(value.email);
  if (!email || typeof value.passwordHash !== "string" || !value.passwordHash.startsWith("scrypt$")) return null;
  return {
    email,
    passwordHash: value.passwordHash,
    sessionVersion: Number.isInteger(value.sessionVersion) ? value.sessionVersion : 1,
    mustChangePassword: Boolean(value.mustChangePassword),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString()
  };
}

function bootstrapAuthRecord() {
  const email = parseEmail(requireEnv("CMS_BOOTSTRAP_EMAIL"));
  const passwordHash = requireEnv("CMS_BOOTSTRAP_PASSWORD_HASH");
  if (!email || !passwordHash.startsWith("scrypt$")) throw new Error("CMS bootstrap credentials are invalid");
  const now = new Date().toISOString();
  return {
    email,
    passwordHash,
    sessionVersion: 1,
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now
  };
}

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw new Error("Password length is invalid");
  }
  const salt = randomBytes(16);
  const parameters = { N: 16384, r: 8, p: 1 };
  const derived = await scrypt(password, salt, 64, {
    cost: parameters.N,
    blockSize: parameters.r,
    parallelization: parameters.p,
    maxmem: 64 * 1024 * 1024
  });
  return `scrypt$${parameters.N}$${parameters.r}$${parameters.p}$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
}

export async function verifyPassword(password, encodedHash) {
  if (typeof password !== "string" || password.length > 128 || typeof encodedHash !== "string") return false;
  const [algorithm, nValue, rValue, pValue, saltValue, hashValue] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !saltValue || !hashValue) return false;
  const N = Number(nValue);
  const r = Number(rValue);
  const p = Number(pValue);
  if (N !== 16384 || r !== 8 || p !== 1) return false;

  try {
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(hashValue, "base64url");
    const derived = Buffer.from(await scrypt(password, salt, expected.length, {
      cost: N,
      blockSize: r,
      parallelization: p,
      maxmem: 64 * 1024 * 1024
    }));
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

export async function loadAuthRecord() {
  const stored = await readPrivateJson(AUTH_PATH);
  const record = normalizeAuthRecord(stored?.data);
  if (stored && !record) throw new Error("Stored CMS credentials are invalid");
  return {
    record: record || bootstrapAuthRecord(),
    etag: stored?.etag || null,
    isBootstrap: !stored
  };
}

async function persistAuthRecord(record, etag) {
  await writePrivateJson(AUTH_PATH, record, { etag });
}

function attemptPath(ip, email) {
  const digest = createHash("sha256").update(`${ip}|${email}`).digest("hex");
  return `${ATTEMPT_PREFIX}${digest}.json`;
}

export async function checkLoginAllowed(ip, email) {
  const path = attemptPath(ip, email);
  const stored = await readPrivateJson(path);
  const lockUntil = Date.parse(stored?.data?.lockedUntil || "");
  if (Number.isFinite(lockUntil) && lockUntil > Date.now()) {
    const error = new Error("Too many attempts. Try again later.");
    error.status = 429;
    error.retryAfter = Math.ceil((lockUntil - Date.now()) / 1000);
    throw error;
  }
  return { path, stored };
}

export async function registerFailedLogin(path, stored) {
  const now = Date.now();
  const startedAt = Date.parse(stored?.data?.windowStartedAt || "");
  const withinWindow = Number.isFinite(startedAt) && now - startedAt < ATTEMPT_WINDOW_MS;
  const count = withinWindow ? Number(stored?.data?.count || 0) + 1 : 1;
  const data = {
    count,
    windowStartedAt: new Date(withinWindow ? startedAt : now).toISOString(),
    lockedUntil: count >= MAX_ATTEMPTS ? new Date(now + ATTEMPT_WINDOW_MS).toISOString() : null
  };

  try {
    await writePrivateJson(path, data, { etag: stored?.etag });
  } catch {
    const error = new Error("Too many attempts. Try again later.");
    error.status = 429;
    throw error;
  }
}

export async function authenticateOwner(emailInput, password, ip) {
  const email = parseEmail(emailInput);
  const safeEmail = email || "invalid";
  const rateState = await checkLoginAllowed(ip, safeEmail);
  const authState = await loadAuthRecord();
  const passwordMatches = await verifyPassword(password, authState.record.passwordHash);
  const emailMatches = email && email === authState.record.email;

  if (!emailMatches || !passwordMatches) {
    await registerFailedLogin(rateState.path, rateState.stored);
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  if (rateState.stored) {
    await deletePrivate(rateState.path, rateState.stored.etag).catch(() => {});
  }

  if (authState.isBootstrap) {
    await persistAuthRecord(authState.record, null);
  }

  return authState.record;
}

function signSessionPayload(payload) {
  const secret = requireEnv("CMS_SESSION_SECRET");
  const encoded = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifySessionToken(token) {
  if (typeof token !== "string" || token.length > 2400) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", requireEnv("CMS_SESSION_SECRET")).update(encoded).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (payload.sub !== "owner" || !Number.isInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionCookie(authRecord) {
  const now = Math.floor(Date.now() / 1000);
  const token = signSessionPayload({
    sub: "owner",
    email: authRecord.email,
    sessionVersion: authRecord.sessionVersion,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    nonce: randomBytes(16).toString("base64url")
  });
  return serializeCookie(SESSION_COOKIE, token, { maxAge: SESSION_TTL_SECONDS });
}

export function clearSessionCookie() {
  return serializeCookie(SESSION_COOKIE, "", { maxAge: 0 });
}

export async function requireOwner(req, options = {}) {
  const token = getCookie(req, SESSION_COOKIE);
  const payload = verifySessionToken(token);
  if (!payload) {
    const error = new Error("Authentication required");
    error.status = 401;
    throw error;
  }

  const authState = await loadAuthRecord();
  if (payload.email !== authState.record.email || payload.sessionVersion !== authState.record.sessionVersion) {
    const error = new Error("Session expired");
    error.status = 401;
    throw error;
  }
  if (authState.record.mustChangePassword && !options.allowPasswordChange) {
    const error = new Error("Password change required");
    error.status = 428;
    throw error;
  }

  return { ...authState, payload };
}

export async function updateCredentials(currentPassword, newEmailInput, newPassword) {
  const authState = await loadAuthRecord();
  if (!(await verifyPassword(currentPassword, authState.record.passwordHash))) {
    const error = new Error("Current password is incorrect");
    error.status = 401;
    throw error;
  }

  const newEmail = parseEmail(newEmailInput);
  if (!newEmail) {
    const error = new Error("Enter a valid email address");
    error.status = 400;
    throw error;
  }
  if (typeof newPassword !== "string" || newPassword.length < 10 || newPassword.length > 128 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    const error = new Error("The new password must be at least 10 characters and contain letters and numbers");
    error.status = 400;
    throw error;
  }

  const updated = {
    ...authState.record,
    email: newEmail,
    passwordHash: await hashPassword(newPassword),
    sessionVersion: authState.record.sessionVersion + 1,
    mustChangePassword: false,
    updatedAt: new Date().toISOString()
  };
  await persistAuthRecord(updated, authState.etag);
  return updated;
}

export function publicOwner(record) {
  return {
    email: record.email,
    mustChangePassword: record.mustChangePassword
  };
}
