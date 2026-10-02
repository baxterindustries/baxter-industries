import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

// The public hostname can briefly serve the previous deployment after Wrangler
// reports success. Wait for this build's root before the strict asset/API proof.
export async function waitForCurrentRoot(url, expectedHash, {
  fetchImpl = fetch,
  now = Date.now,
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeoutMs = 45000,
  intervalMs = 5000,
} = {}) {
  const deadline = now() + timeoutMs;
  let last = { status: null, url: url.href, sha256: null };
  let attempts = 0;
  while (now() < deadline) {
    attempts++;
    try {
      const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(Math.max(1, deadline - now())),
      });
      last = {
        status: response.status,
        url: response.url || url.href,
        sha256: hash(new Uint8Array(await response.arrayBuffer())),
      };
      if (last.status === 200 && last.sha256 === expectedHash) return { attempts };
    } catch {
      last = { status: null, url: url.href, sha256: null };
    }
    const remaining = deadline - now();
    if (remaining > 0) await pause(Math.min(intervalMs, remaining));
  }
  throw new Error(`Production root did not reach the built asset within ${timeoutMs}ms: ${JSON.stringify({ ...last, expectedSha256: expectedHash, attempts })}`);
}

async function files(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
    const target = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    return entry.isDirectory() ? files(target) : [target];
  }))).flat();
}

export async function checkProductionWorker() {
  const base = new URL(process.env.BAXTER_WORKER_BASE_URL || "https://baxter-industries-production.brody-775.workers.dev/");
  assert.equal(base.protocol, "https:");
  assert.ok(base.hostname.endsWith(".workers.dev"), "This check targets the production workers.dev candidate.");
  const output = new URL("../.workers-assets/production/", import.meta.url);
  const readiness = await waitForCurrentRoot(new URL("/", base), hash(await readFile(new URL("index.html", output))));
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
  console.log(JSON.stringify({ host: base.hostname, readinessAttempts: readiness.attempts, matchedAssets, getQuote: 405, malformedQuote: 400, unknownApi: 404, workersDevNoindex: true, privateFilesMissing: true, validQuotePosts: 0 }));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await checkProductionWorker();
}
