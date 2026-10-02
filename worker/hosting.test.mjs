import assert from "node:assert/strict";
import test from "node:test";
import { createWorker } from "./index.mjs";
import { quoteEnvironment } from "./quote.mjs";

const valid = { name: "Test Visitor", phone: "603-555-0100", email: "visitor@example.com", message: "Mocked quote." };
const request = () => new Request("https://baxter-industries.example/api/quote", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valid),
});

test("production hosting preserves current quote sender and Tim-only routing through the shared service", async () => {
  let calls = 0;
  const worker = createWorker({ fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, "https://api.resend.com/emails");
    const body = JSON.parse(options.body);
    assert.equal(body.from, "Baxter Industries <onboarding@resend.dev>");
    assert.deepEqual(body.to, ["tbaxter941@gmail.com"]);
    assert.equal(body.reply_to, valid.email);
    return Response.json({ id: "mocked-provider-id" });
  } });
  const response = await worker.fetch(request(), { QUOTE_DELIVERY_MODE: "live", RESEND_API_KEY: "mocked-key" });
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(calls, 1);
});

test("preview remains a no-send environment even if an email secret was supplied", async () => {
  const worker = createWorker({ fetchImpl: () => assert.fail("Preview must not send email") });
  const response = await worker.fetch(request(), { QUOTE_DELIVERY_MODE: "preview", RESEND_API_KEY: "mocked-key" });
  assert.deepEqual(await response.json(), { ok: true, preview: true });
});

test("Worker delivery requires explicit live mode and complete configuration", async () => {
  const worker = createWorker({ fetchImpl: () => assert.fail("Unconfigured Worker must not send email") });
  for (const env of [{ RESEND_API_KEY: "mocked-key" }, { QUOTE_DELIVERY_MODE: "live" }]) {
    assert.equal((await worker.fetch(request(), env)).status, 503);
  }
  assert.equal(quoteEnvironment({ QUOTE_TO_EMAILS: "" }).QUOTE_TO_EMAILS, "");
  assert.equal(quoteEnvironment({ QUOTE_FROM_EMAIL: "" }).QUOTE_FROM_EMAIL, "");
});

test("assets pass through to the platform without Worker header or body changes", async () => {
  const worker = createWorker();
  const env = { ASSETS: { fetch: async () => new Response("production frontend", { headers: { "Cache-Control": "no-cache" } }) } };
  const staging = await worker.fetch(new Request("https://baxter-industries-production.brody-775.workers.dev/"), env);
  assert.equal(staging.headers.get("X-Robots-Tag"), null);
  assert.equal(staging.headers.get("Cache-Control"), "no-cache");
  assert.equal(await staging.text(), "production frontend");
  const production = await worker.fetch(new Request("https://baxter-industries.com/"), env);
  assert.equal(production.headers.get("X-Robots-Tag"), null);
  assert.equal(await production.text(), "production frontend");
});

test("HTTP API requests redirect before provider calls, preserving target path and query", async () => {
  const worker = createWorker({ fetchImpl: () => assert.fail("HTTP must redirect before email delivery") });
  const response = await worker.fetch(new Request("http://baxter-industries.com/api/quote?source=test", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valid),
  }), { QUOTE_DELIVERY_MODE: "live", RESEND_API_KEY: "mocked-key" });
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("Location"), "https://baxter-industries.com/api/quote?source=test");
  assert.equal(response.headers.get("Strict-Transport-Security"), "max-age=63072000");
  const local = await worker.fetch(new Request("http://localhost:8787/api/quote"), {});
  assert.equal(local.status, 405);
});

test("bare and unknown APIs remain JSON 404s with no asset fallback", async () => {
  const worker = createWorker();
  const env = { ASSETS: { fetch: () => assert.fail("API errors cannot fall back to assets") } };
  for (const path of ["/api", "/api/unknown", "/api/quote/extra"]) {
    const response = await worker.fetch(new Request(`https://baxter-industries.com${path}`), env);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Not found." });
    assert.equal(response.headers.get("Strict-Transport-Security"), "max-age=63072000");
  }
});
