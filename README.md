# Baxter Industries

The one-page marketing site uses Next.js, TypeScript and plain CSS. Production is configured for Cloudflare Workers in Baxter's account, serving `baxter-industries.com`. Vercel remains available for manual rollback; Git-triggered Vercel deployments are disabled in `vercel.json`.

See [Security maintenance](SECURITY.md) for the current framework security update, validation evidence, and the remaining Baxter hardening opportunities.

## Local development and Vercel

Run `npm ci`, then `npm run dev`. Set a server-side `RESEND_API_KEY` in `.env.local` only when email delivery is needed. To run the normal production server, use `npm run build` followed by `npm start`; this includes the Next `/api/quote` handler. A manual Vercel deployment uses the same normal build and its retained environment settings. The [`git.deploymentEnabled` setting](https://vercel.com/docs/project-configuration/git-configuration) disables automatic Git deployments without removing the rollback project.

## Cloudflare Workers

The Worker serves only `/api` and `/api/*`. Next exports the marketing pages as static assets, so page and image requests go directly to Cloudflare's asset service. Worker builds export TSX pages/layouts and exclude the `.ts` Next API route; both hosting platforms call the shared quote service in `worker/quote.mjs`.

- `npm test` runs validation, no-send isolation, provider fixtures and routing checks without network calls or email.
- `npm run build:workers` produces `.workers-assets/production` with the normal presentation.
- `npm run build:workers:preview` produces `.workers-assets/preview` with a visible test notice, noindex and no-email quote handling.
- `npm run workers:dev` or `npm run workers:dev:preview` runs the corresponding local Worker and builds its assets.
- `npm run workers:deploy:production` deploys `baxter-industries-production`; `npm run workers:deploy:preview` deploys `baxter-industries-preview`. Wrangler runs the configured build before each deployment.
- `npx wrangler deploy --env production --dry-run` (or `--env preview`) builds and packages without deployment.

`wrangler.jsonc` pins Baxter account `7756735dae2c45923590649fdef82ed8` and production zone `ed0ff63153d3def3e15c848515eb4330`. Only production attaches the apex custom domain; preview has an explicit empty route list. No `www` hostname is configured.

Generated output and local secrets are ignored by Git. Each export starts from current source; private source, environment files and payment-preview work are excluded and checked. Production and preview outputs are separate. A Workers export also updates Next's intermediate `.next` directory; run the normal `npm run build` again before `npm start`.

Production custom-domain assets remain indexable. The native `_headers` host rule marks production `workers.dev` responses noindex without invoking the Worker for static assets; preview assets are always noindex. APIs are noindex and no-store. HSTS preserves the existing `max-age=63072000` policy. Public HTTP API requests redirect to HTTPS with status 308; Cloudflare's zone-level Always Use HTTPS setting handles static requests when the domain is cut over. The official [static asset headers documentation](https://developers.cloudflare.com/workers/static-assets/headers/) describes the host rule.

The GitHub deployment workflow runs the production deploy followed by candidate and canonical checks. `npm run workers:check:production` targets `https://baxter-industries-production.brody-775.workers.dev/`; `BAXTER_WORKER_BASE_URL` may select another HTTPS production `workers.dev` candidate. `npm run workers:check:production -- --canonical` targets only `https://baxter-industries.com/`.

Both checks wait up to 45 seconds per asset for the freshly built bytes, since the root and navigation payloads can propagate independently, then check Cloudflare response evidence, HSTS, API errors and absent private files. Candidate assets must be noindex; canonical assets must stay indexable. The canonical check also verifies the HTTP-to-HTTPS redirect. Their only POST is malformed JSON, which cannot send email. Provider headers alone cannot establish a successful release: every exported asset must also match the current build's hash.

The initial DNS cutover is coordinated separately from ordinary CI. Back up the existing records and Vercel deployment, verify quote settings and delivery, then attach the custom domain and test the canonical host. CI maintains the declared Worker domain; it contains no DNS-record deletion or rollback automation. Keep the Vercel project, its environment settings and deployment available. For rollback, pause Cloudflare releases, verify the retained Vercel deployment, remove the Worker custom-domain binding, and restore the backed-up Vercel DNS records before verifying the public site.

## Quote delivery

The form posts to same-origin `/api/quote`; this site has no authentication provider or separate CORS/authorized-URL configuration. The API validates and bounds the request before delivery and never logs contact fields or provider errors.

Source delivery defaults are `Baxter Industries <onboarding@resend.dev>` to **only `tbaxter941@gmail.com`**. Cloudflare production retains its verified `Baxter Industries <quotes@baxter-capital.com>` sender override and has no recipient override. Replies go to the customer's submitted email. `QUOTE_FROM_EMAIL` and comma-separated `QUOTE_TO_EMAILS` can override those defaults. The API key stays server-side and is never exported with the frontend.

Cloudflare requires the explicit `QUOTE_DELIVERY_MODE` from its environment: `live` for production or `preview` for the preview. Live delivery fails closed when the key or delivery settings are unavailable. Preview never sends email or stores submitted fields, even if a key is accidentally supplied; success explicitly states no email was sent. Vercel preserves its existing live default when the mode is omitted.

The shared `onboarding@resend.dev` sender is limited to the Resend account owner's allowed test recipient. Verify that a new production key supports the intended sender and destination before activating it; see [Resend's error reference](https://resend.com/docs/api-reference/errors). Do not assume another site's key has equivalent permission. The existing Cloudflare sender was verified with controlled delivery during its initial setup; this cutover preserves those credentials and recipient settings. No valid production quote is sent by tests or CI. Any fresh delivery test requires explicit authorization for its recipient. Keep Vercel available for rollback until the cutover is confirmed.
