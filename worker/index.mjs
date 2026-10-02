import { handleQuote, quoteEnvironment } from "./quote.mjs";

export function createWorker({ fetchImpl = fetch } = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const isApi = url.pathname === "/api" || url.pathname.startsWith("/api/");
      // Local Wrangler uses HTTP. Public API requests must keep their method
      // and body when moving to HTTPS; asset redirects belong to the zone.
      if (isApi && url.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
        url.protocol = "https:";
        return new Response(null, {
          status: 308,
          headers: {
            Location: url.href,
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex",
            "Strict-Transport-Security": "max-age=63072000",
          },
        });
      }
      if (url.pathname === "/api/quote") {
        return handleQuote(request, quoteEnvironment(env), fetchImpl);
      }
      if (isApi) {
        return Response.json({ error: "Not found." }, {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex",
            "X-Content-Type-Options": "nosniff",
            "Strict-Transport-Security": "max-age=63072000",
          },
        });
      }
      return env.ASSETS.fetch(request);
    },
  };
}

export default createWorker();
