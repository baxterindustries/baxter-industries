import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

// Assets can settle independently after Wrangler reports success. A current
// root does not prove that the generated navigation payloads are current too.
export async function waitForCurrentAsset(url, expectedHash, {
  fetchImpl = fetch,
  now = Date.now,
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeoutMs = 45000,
  intervalMs = 5000,
  expectedStatuses = [200],
} = {}) {
  const deadline = now() + timeoutMs;
  let last = { status: null, url: url.href, sha256: null };
  let attempts = 0;
  while (now() < deadline) {
    attempts++;
    try {
      const response = await fetchImpl(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(Math.max(1, deadline - now())),
      });
      last = {
        status: response.status,
        url: response.url || url.href,
        sha256: hash(new Uint8Array(await response.arrayBuffer())),
      };
      if (expectedStatuses.includes(last.status) && last.sha256 === expectedHash) return { attempts, response };
    } catch {
      last = { status: null, url: url.href, sha256: null };
    }
    const remaining = deadline - now();
    if (remaining > 0) await pause(Math.min(intervalMs, remaining));
  }
  throw new Error(`Production asset did not reach the built bytes within ${timeoutMs}ms: ${JSON.stringify({ ...last, expectedSha256: expectedHash, attempts })}`);
}

async function files(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
    const target = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    return entry.isDirectory() ? files(target) : [target];
  }))).flat();
}

export function checkResponseHeaders(response, { canonical = false, api = false, path = "/" } = {}) {
  assert.equal(response.headers.get("Server")?.toLowerCase(), "cloudflare", `Response is not served by Cloudflare: ${path}`);
  assert.ok(response.headers.get("CF-Ray"), `Missing Cloudflare request evidence: ${path}`);
  assert.equal(response.headers.get("Strict-Transport-Security"), "max-age=63072000", `Missing HSTS: ${path}`);
  const robots = response.headers.get("X-Robots-Tag") || "";
  if (api || !canonical) {
    assert.match(robots, /noindex/i, `Missing noindex: ${path}`);
  } else {
    assert.doesNotMatch(robots, /noindex/i, `Canonical asset must remain indexable: ${path}`);
  }
  if (api) assert.equal(response.headers.get("Cache-Control"), "no-store", `API response must not be cached: ${path}`);
}

export async function checkProductionWorker({ canonical = false } = {}) {
  const base = new URL(process.env.BAXTER_WORKER_BASE_URL || (canonical
    ? "https://baxter-industries.com/"
    : "https://baxter-industries-production.brody-775.workers.dev/"));
  assert.equal(base.protocol, "https:");
  assert.equal(base.pathname, "/");
  assert.equal(base.search, "");
  if (canonical) {
    assert.equal(base.host, "baxter-industries.com", "Canonical checks target the production apex domain.");
  } else {
    assert.ok(base.hostname.endsWith(".workers.dev"), "Candidate checks target a production workers.dev host.");
  }
  const output = new URL("../.workers-assets/production/", import.meta.url);
  let readinessAttempts = 0;
  let matchedAssets = 0;
  for (const local of await files(output)) {
    const relative = local.href.slice(output.href.length);
    if (relative === "_headers") continue;
    // Cloudflare redirects .html requests to their extensionless public URLs.
    // Check those bytes directly while continuing to reject unexpected redirects.
    const publicPath = relative === "index.html" ? "/" : relative.replace(/\.html$/, "");
    const url = new URL(publicPath, base);
    const { response, attempts } = await waitForCurrentAsset(url, hash(await readFile(local)), {
      expectedStatuses: relative === "404.html" ? [200, 404] : [200],
    });
    readinessAttempts += attempts;
    checkResponseHeaders(response, { canonical, path: relative });
    matchedAssets++;
  }
  const request = (url, options = {}) => fetch(url, {
    ...options, redirect: "manual", signal: AbortSignal.timeout(15000),
  });
  const quoteUrl = new URL("/api/quote", base);
  const method = await request(quoteUrl);
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("Allow"), "POST");
  checkResponseHeaders(method, { canonical, api: true, path: quoteUrl.pathname });
  const malformed = await request(quoteUrl, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
  });
  assert.equal(malformed.status, 400); // Deliberately invalid; cannot reach the email provider.
  checkResponseHeaders(malformed, { canonical, api: true, path: quoteUrl.pathname });
  const unknown = await request(new URL("/api/unknown", base));
  assert.equal(unknown.status, 404);
  checkResponseHeaders(unknown, { canonical, api: true, path: "/api/unknown" });
  assert.match(unknown.headers.get("Content-Type") || "", /application\/json/);
  assert.deepEqual(await unknown.json(), { error: "Not found." });
  for (const path of ["/.env", "/worker/quote.mjs", "/app/api/quote/route.ts", "/README.md", "/package.json"]) {
    const response = await request(new URL(path, base));
    assert.equal(response.status, 404, `Private source path is exposed: ${path}`);
    checkResponseHeaders(response, { canonical, path });
  }
  if (canonical) {
    const insecure = new URL(base);
    insecure.protocol = "http:";
    const redirect = await request(insecure);
    assert.ok([301, 302, 307, 308].includes(redirect.status), "HTTP must redirect to HTTPS.");
    assert.equal(redirect.headers.get("Location"), base.href);
  }
  console.log(JSON.stringify({ host: base.hostname, canonical, readinessAttempts, matchedAssets, cloudflareResponses: true, getQuote: 405, malformedQuote: 400, unknownApi: 404, indexableAssets: canonical, workersDevNoindex: !canonical, privateFilesMissing: true, validQuotePosts: 0 }));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await checkProductionWorker({ canonical: process.argv.includes("--canonical") });
}
