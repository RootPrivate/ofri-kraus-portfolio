import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hashPassword, verifyPassword } from "../lib/cms-auth.js";
import { normalizeContent } from "../lib/cms-schema.js";
import { isManagedMediaPath, isManagedVideoPath } from "../lib/cms-store.js";
import { getCookie, readJsonBody } from "../lib/http.js";

const malicious = normalizeContent({
  appearance: { accent: "#fff;background:url(javascript:alert(1))" },
  hero: {
    title: '<img src=x onerror="globalThis.pwned=true">',
    primaryCta: { href: "javascript:alert(1)" },
    topImage: "javascript:alert(1)"
  },
  work: {
    projects: [{ mediaSrc: "file:///etc/passwd", poster: "data:image/svg+xml,<svg onload=alert(1)>" }]
  }
});

assert.equal(malicious.appearance.accent, "#3A6963");
assert.equal(malicious.hero.primaryCta.href, "#work");
assert.equal(malicious.hero.topImage, "assets/optimized/thumb-01.webp");
assert.equal(malicious.work.projects[0].mediaSrc, "assets/project-01.mp4");
assert.equal(malicious.work.projects[0].poster, "assets/optimized/thumb-01.webp");
assert.match(malicious.hero.title, /<img/);

const passwordHash = await hashPassword("Strong-Test-42!");
assert.equal(await verifyPassword("Strong-Test-42!", passwordHash), true);
assert.equal(await verifyPassword("wrong-password", passwordHash), false);
assert.equal(await verifyPassword("Strong-Test-42!", `${passwordHash}tampered`), false);

assert.equal(isManagedMediaPath("cms/media/1784800000000-550e8400-e29b-41d4-a716-446655440000.webp"), true);
assert.equal(isManagedMediaPath("cms/media/1784800000000-550e8400-e29b-41d4-a716-446655440000.mp4"), true);
assert.equal(isManagedVideoPath("cms/media/1784800000000-550e8400-e29b-41d4-a716-446655440000.mp4"), true);
assert.equal(isManagedVideoPath("cms/media/1784800000000-550e8400-e29b-41d4-a716-446655440000.webp"), false);
assert.equal(isManagedMediaPath("cms/media/../../auth.json"), false);
assert.equal(isManagedMediaPath("cms/media/not-a-real-key.webp"), false);

await assert.rejects(
  readJsonBody({ headers: { "content-type": "text/plain" }, body: {} }),
  (error) => error.status === 415
);
await assert.rejects(
  readJsonBody({ headers: { "content-type": "application/json" }, body: [] }),
  (error) => error.status === 400
);
await assert.rejects(
  readJsonBody({
    headers: { "content-type": "application/json" },
    async *[Symbol.asyncIterator]() { yield Buffer.from("{"); }
  }),
  (error) => error.status === 400
);
await assert.rejects(
  readJsonBody({
    headers: { "content-type": "application/json" },
    get body() { throw new SyntaxError("Invalid JSON"); }
  }),
  (error) => error.status === 400
);
assert.equal(getCookie({ headers: { cookie: "session=%E0%A4%A" } }, "session"), "");

const clientSources = await Promise.all(["script.js", "admin.js"].map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")));
for (const source of clientSources) {
  assert.doesNotMatch(source, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(|new Function/);
}
assert.match(clientSources[0], /textContent/);

const sensitiveSources = await Promise.all([
  "../lib/cms-auth.js",
  "../lib/cms-store.js",
  "../api/auth/login.js",
  "../admin.js"
].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
assert.doesNotMatch(sensitiveSources.join("\n"), /admin123|BLOB_READ_WRITE_TOKEN\s*=|CMS_SESSION_SECRET\s*=/);

const vercelConfig = await readFile(new URL("../vercel.json", import.meta.url), "utf8");
assert.match(vercelConfig, /connect-src 'self' https:\/\/vercel\.com https:\/\/\*\.blob\.vercel-storage\.com/);

console.log("Security checks passed");
