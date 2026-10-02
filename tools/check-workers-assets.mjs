import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

async function inventory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const target = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    return entry.isDirectory() ? inventory(target) : [target];
  }))).flat();
}

export async function checkAssets(deployEnvironment) {
  assert.ok(["production", "preview"].includes(deployEnvironment));
  const output = new URL(`../.workers-assets/${deployEnvironment}/`, import.meta.url);
  const files = await inventory(output);
  for (const file of files) {
    const relative = file.href.slice(output.href.length);
    assert.equal(/(?:^|\/)(?:api|server|tools|worker|db|pay)(?:\/|$)|DashPaymentPreview|\.env|source\.tar|README|HANDOFF/.test(relative), false, `Unexpected static asset: ${relative}`);
  }
  const sourcePublic = new URL("../public/", import.meta.url);
  const publicNames = await readdir(sourcePublic);
  for (const name of publicNames) {
    const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
    assert.equal(hash(await readFile(new URL(name, sourcePublic))), hash(await readFile(new URL(name, output))), `Public asset changed: ${name}`);
  }
  const html = await readFile(new URL("index.html", output), "utf8");
  const headers = await readFile(new URL("_headers", output), "utf8");
  const robots = await readFile(new URL("robots.txt", output), "utf8");
  const preview = deployEnvironment === "preview";
  assert.equal(html.includes("Preview site."), preview);
  assert.equal(html.includes("sample details"), preview);
  assert.equal(/name="robots"[^>]+noindex/.test(html), preview);
  const globalHeaders = headers.split("https://:version.:subdomain.workers.dev/*")[0];
  assert.equal(globalHeaders.includes("X-Robots-Tag: noindex"), preview);
  assert.equal(headers.includes("https://:version.:subdomain.workers.dev/*\n  X-Robots-Tag: noindex"), !preview);
  assert.ok(headers.includes("Strict-Transport-Security: max-age=63072000"));
  assert.equal(robots.includes("Disallow: /"), preview);
  console.log(JSON.stringify({ environment: deployEnvironment, assetFiles: files.length, sourcePublicAssets: publicNames.length, previewNotice: preview, customDomainNoindex: preview, workersDevNoindex: true, publicAssetBytesMatch: true, serverOrPaymentFilesIncluded: false }));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await checkAssets(process.argv[2] || "production");
}
