import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { checkResponseHeaders, waitForCurrentAsset } from "../tools/check-production-worker.mjs";

const root = new URL("https://candidate.example.workers.dev/");
const expected = createHash("sha256").update("current build").digest("hex");

test("readiness waits for the built root hash using GETs before returning", async () => {
  let elapsed = 0;
  let calls = 0;
  const pauses = [];
  const result = await waitForCurrentAsset(root, expected, {
    fetchImpl: async (url, options) => {
      assert.equal(url.href, root.href);
      assert.equal(options.method, undefined);
      assert.ok(options.signal instanceof AbortSignal);
      calls++;
      return new Response(calls < 3 ? "previous build" : "current build");
    },
    now: () => elapsed,
    pause: async (ms) => { pauses.push(ms); elapsed += ms; },
  });
  assert.equal(result.attempts, 3);
  assert.equal(result.response.status, 200);
  assert.deepEqual(pauses, [5000, 5000]);
  assert.equal(elapsed, 10000);
});

test("readiness stops at 45 seconds and diagnoses a persistent stale response", async () => {
  let elapsed = 0;
  let calls = 0;
  const stale = createHash("sha256").update("previous build").digest("hex");
  await assert.rejects(waitForCurrentAsset(root, expected, {
    fetchImpl: async () => { calls++; return new Response("previous build"); },
    now: () => elapsed,
    pause: async (ms) => { elapsed += ms; },
  }), (error) => {
    assert.match(error.message, /within 45000ms/);
    assert.match(error.message, /"status":200/);
    assert.ok(error.message.includes(root.href));
    assert.ok(error.message.includes(stale));
    assert.ok(error.message.includes(expected));
    return true;
  });
  assert.equal(elapsed, 45000);
  assert.equal(calls, 9);
});

test("matching error-body bytes do not establish readiness", async () => {
  let elapsed = 0;
  let calls = 0;
  const result = await waitForCurrentAsset(root, expected, {
    fetchImpl: async () => new Response("current build", { status: ++calls === 1 ? 503 : 200 }),
    now: () => elapsed,
    pause: async (ms) => { elapsed += ms; },
  });
  assert.equal(result.attempts, 2);
  assert.equal(elapsed, 5000);
});

test("a current root does not skip waiting for a stale navigation payload", async () => {
  let payloadCalls = 0;
  const payload = new URL("__next._full.txt", root);
  const fetchImpl = async (url) => new Response(
    url.href === root.href || ++payloadCalls > 1 ? "current build" : "previous build",
  );
  assert.equal((await waitForCurrentAsset(root, expected, { fetchImpl })).attempts, 1);
  let paused = 0;
  const result = await waitForCurrentAsset(payload, expected, {
    fetchImpl,
    pause: async (ms) => { paused += ms; },
  });
  assert.equal(result.attempts, 2);
  assert.equal(payloadCalls, 2);
  assert.equal(paused, 5000);
});

test("the exported not-found asset can match with HTTP 404", async () => {
  const result = await waitForCurrentAsset(new URL("404.html", root), expected, {
    expectedStatuses: [200, 404],
    fetchImpl: async () => new Response("current build", { status: 404 }),
  });
  assert.equal(result.attempts, 1);
  assert.equal(result.response.status, 404);
});

const cloudflareHeaders = {
  Server: "cloudflare",
  "CF-Ray": "abc123-IAD",
  "Strict-Transport-Security": "max-age=63072000",
};

test("canonical checks reject Vercel and missing Cloudflare request evidence", () => {
  for (const headers of [
    { ...cloudflareHeaders, Server: "Vercel" },
    { Server: "cloudflare", "Strict-Transport-Security": "max-age=63072000" },
  ]) {
    assert.throws(() => checkResponseHeaders(new Response("current build", { headers }), { canonical: true }));
  }
  assert.doesNotThrow(() => checkResponseHeaders(new Response("current build", { headers: cloudflareHeaders }), { canonical: true }));
});

test("canonical assets stay indexable while candidate assets and APIs stay noindex", () => {
  const indexed = new Response("current build", { headers: cloudflareHeaders });
  const noindex = new Response("current build", { headers: { ...cloudflareHeaders, "X-Robots-Tag": "noindex, nofollow" } });
  assert.doesNotThrow(() => checkResponseHeaders(indexed, { canonical: true }));
  assert.throws(() => checkResponseHeaders(noindex, { canonical: true }));
  assert.throws(() => checkResponseHeaders(indexed));
  assert.doesNotThrow(() => checkResponseHeaders(noindex));
  assert.throws(() => checkResponseHeaders(noindex, { canonical: true, api: true }));
  const api = new Response("{}", { headers: { ...cloudflareHeaders, "X-Robots-Tag": "noindex", "Cache-Control": "no-store" } });
  assert.doesNotThrow(() => checkResponseHeaders(api, { canonical: true, api: true }));
});
