import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const base = new URL(process.env.BAXTER_WORKER_BASE_URL || "https://baxter-industries-production.brody-775.workers.dev/");
assert.equal(base.protocol, "https:");
assert.ok(base.hostname.endsWith(".workers.dev"), "This check targets the production workers.dev candidate.");
const output = new URL("../.workers-assets/production/", import.meta.url);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function files(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
    const target = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    return entry.isDirectory() ? files(target) : [target];
  }))).flat();
}
let matchedAssets = 0;
for (const local of await files(output)) {
  const relative = local.href.slice(output.href.length);
  if (relative === "_headers") continue;
  const url = new URL(relative === "index.html" ? "/" : relative, base);
  const response = await fetch(url);
  assert.ok(response.status === 200 || (relative === "404.html" && response.status === 404), `Asset status mismatch: ${relative}`);
  assert.match(response.headers.get("X-Robots-Tag") || "", /noindex/, `Missing staging noindex: ${relative}`);
  assert.equal(response.headers.get("Strict-Transport-Security"), "max-age=63072000", `Missing HSTS: ${relative}`);
  assert.equal(hash(new Uint8Array(await response.arrayBuffer())), hash(await readFile(local)), `Deployed asset mismatch: ${relative}`);
  matchedAssets++;
}
const quoteUrl = new URL("/api/quote", base);
const method = await fetch(quoteUrl);
assert.equal(method.status, 405);
assert.equal(method.headers.get("Allow"), "POST");
assert.equal(method.headers.get("Strict-Transport-Security"), "max-age=63072000");
assert.equal((await fetch(quoteUrl, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
})).status, 400); // Deliberately invalid; cannot reach the email provider.
const unknown = await fetch(new URL("/api/unknown", base));
assert.equal(unknown.status, 404);
assert.match(unknown.headers.get("Content-Type") || "", /application\/json/);
assert.deepEqual(await unknown.json(), { error: "Not found." });
for (const path of ["/.env", "/worker/quote.mjs", "/app/api/quote/route.ts", "/README.md", "/package.json"]) {
  assert.equal((await fetch(new URL(path, base))).status, 404, `Private source path is exposed: ${path}`);
}
console.log(JSON.stringify({ host: base.hostname, matchedAssets, getQuote: 405, malformedQuote: 400, unknownApi: 404, workersDevNoindex: true, privateFilesMissing: true, validQuotePosts: 0 }));
