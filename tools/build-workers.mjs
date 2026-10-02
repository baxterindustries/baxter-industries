import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { checkAssets } from "./check-workers-assets.mjs";

const deployEnvironment = process.argv[2] || "production";
if (!["production", "preview"].includes(deployEnvironment)) {
  throw new Error("Build environment must be production or preview.");
}
const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  stdio: "inherit",
  env: { ...process.env, BAXTER_HOSTING_TARGET: "cloudflare", BAXTER_DEPLOY_ENV: deployEnvironment },
});
if (build.status !== 0) process.exit(build.status || 1);

const output = new URL(`../.workers-assets/${deployEnvironment}/`, import.meta.url);
const preview = deployEnvironment === "preview";
await writeFile(new URL("_headers", output), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=63072000
${preview ? "  X-Robots-Tag: noindex, nofollow, noarchive\n" : ""}
${preview ? "" : "https://:version.:subdomain.workers.dev/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n\n"}
/
  Cache-Control: no-cache

/*.html
  Cache-Control: no-cache

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
`);
await writeFile(new URL("robots.txt", output), preview ? "User-agent: *\nDisallow: /\n" : "User-agent: *\nAllow: /\n");
await checkAssets(deployEnvironment);
