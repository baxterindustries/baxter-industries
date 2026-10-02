/** @type {import('next').NextConfig} */
const isWorkerBuild = process.env.BAXTER_HOSTING_TARGET === "cloudflare";
const deployEnvironment = process.env.BAXTER_DEPLOY_ENV || "production";

const nextConfig = isWorkerBuild
  ? {
      output: "export",
      distDir: `.workers-assets/${deployEnvironment}`,
      // Export the TSX pages/layouts. Cloudflare serves /api/quote through its
      // Worker; the .ts Next handler stays available to Vercel.
      pageExtensions: ["tsx"],
    }
  : {};

export default nextConfig;
