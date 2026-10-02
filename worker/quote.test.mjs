import assert from "node:assert/strict";
import test from "node:test";
import worker from "./index.mjs";
import { handleQuote } from "./quote.mjs";

const valid = { name: "Test Visitor", phone: "603-555-0100", email: "visitor@example.com", message: "Preview test only." };
const previewEnv = { QUOTE_DELIVERY_MODE: "preview" };
const liveEnv = {
  QUOTE_DELIVERY_MODE: "live",
  RESEND_API_KEY: "test-secret",
  QUOTE_FROM_EMAIL: "Baxter Industries <quotes@example.com>",
  QUOTE_TO_EMAILS: "operator@example.com, second@example.com",
};
const request = (data = valid, headers = {}) => new Request("https://preview.example/api/quote", {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(data),
});
const noSend = () => { assert.fail("Preview or invalid input must not contact an email provider"); };

test("valid preview returns explicit dry-run success without outbound delivery or reflected fields", async () => {
  const response = await handleQuote(request(), { ...liveEnv, ...previewEnv }, noSend);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, preview: true });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.match(response.headers.get("X-Robots-Tag"), /noindex/);
});

test("malformed bodies, arrays, null, primitives and non-string fields return controlled errors", async () => {
  for (const data of [null, [], true, 1, "string", { ...valid, name: 42 }, { ...valid, message: {} }]) {
    const response = await handleQuote(request(data), previewEnv, noSend);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid request body." });
  }
  const invalid = new Request("https://preview.example/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal((await handleQuote(invalid, previewEnv, noSend)).status, 400);
});

test("missing and blank fields retain the required-field error; invalid email and long fields are rejected", async () => {
  for (const data of [{}, { ...valid, phone: "  " }, { ...valid, email: undefined }]) {
    const response = await handleQuote(request(data), previewEnv, noSend);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Please fill in every field." });
  }
  assert.equal((await handleQuote(request({ ...valid, email: "invalid" }), previewEnv, noSend)).status, 400);
  assert.equal((await handleQuote(request({ ...valid, message: "x".repeat(8001) }), previewEnv, noSend)).status, 400);
});

test("body cap works with and without Content-Length, before contacting any provider", async () => {
  const large = { ...valid, message: "x".repeat(17000) };
  assert.equal((await handleQuote(request(large), previewEnv, noSend)).status, 413);
  assert.equal((await handleQuote(request(valid, { "Content-Length": "17000" }), previewEnv, noSend)).status, 413);
});

test("only JSON POST is accepted and unknown API paths cannot fall back to website assets", async () => {
  const response = await handleQuote(new Request("https://preview.example/api/quote"), previewEnv, noSend);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "POST");
  assert.equal((await handleQuote(request(valid, { "Content-Type": "text/plain" }), previewEnv, noSend)).status, 415);
  for (const path of ["/api", "/api/unknown", "/api/quote/extra"]) {
    const response = await worker.fetch(new Request(`https://preview.example${path}`), { ASSETS: { fetch: noSend } });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Not found." });
  }
});

test("live delivery requires an explicit mode and every delivery setting", async () => {
  for (const env of [{}, { ...liveEnv, QUOTE_DELIVERY_MODE: undefined }, { ...liveEnv, RESEND_API_KEY: undefined }, { ...liveEnv, QUOTE_FROM_EMAIL: undefined }, { ...liveEnv, QUOTE_TO_EMAILS: "" }, { ...liveEnv, QUOTE_TO_EMAILS: "invalid" }]) {
    const response = await handleQuote(request(), env, noSend);
    assert.equal(response.status, 503);
  }
});

test("live delivery preserves reply address, configured recipients and escaped HTML and reports provider acceptance", async () => {
  let calls = 0;
  const response = await handleQuote(request({ ...valid, name: "  Visitor <sample>  ", message: "Test & <tag>\nSecond line." }), liveEnv, async (url, options) => {
    calls++;
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer test-secret");
    const body = JSON.parse(options.body);
    assert.equal(body.from, liveEnv.QUOTE_FROM_EMAIL);
    assert.deepEqual(body.to, ["operator@example.com", "second@example.com"]);
    assert.equal(body.reply_to, valid.email);
    assert.equal(body.subject, "New quote request from Visitor <sample>");
    assert.match(body.html, /Visitor &lt;sample&gt;/);
    assert.match(body.html, /Test &amp; &lt;tag&gt;/);
    assert.match(body.text, /Test & <tag>\nSecond line\./);
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ id: "test-provider-id" });
  });
  assert.equal(calls, 1);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("provider rejection, malformed success and network error are sanitized; no PII is logged", async () => {
  const originalError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  try {
    for (const send of [
      async () => Response.json({ message: "private contact details" }, { status: 422 }),
      async () => Response.json({}),
      async () => new Response("not JSON", { status: 200 }),
      async () => { throw new Error("private contact details"); },
    ]) {
      const response = await handleQuote(request(), liveEnv, send);
      assert.equal(response.status, 502);
      assert.deepEqual(await response.json(), { error: "We couldn't send your request right now." });
    }
    assert.deepEqual(logged, []);
  } finally {
    console.error = originalError;
  }
});
