# Baxter Industries

The one-page marketing site uses Next.js, TypeScript and plain CSS. Vercel remains supported while Cloudflare hosting is prepared. The Cloudflare configuration contains no custom-domain routes or DNS changes.

See [Security maintenance](SECURITY.md) for the current framework security update, validation evidence, and the remaining Baxter hardening opportunities.

## Local development and Vercel

Run `npm ci`, then `npm run dev`. Set a server-side `RESEND_API_KEY` in `.env.local` only when email delivery is needed. To run the normal production server, use `npm run build` followed by `npm start`; this includes the Next `/api/quote` handler. Vercel uses the same normal build and its existing environment settings.

## Cloudflare Workers

The Worker serves only `/api` and `/api/*`. Next exports the marketing pages as static assets, so page and image requests go directly to Cloudflare's asset service. Worker builds export TSX pages/layouts and exclude the `.ts` Next API route; both hosting platforms call the shared quote service in `worker/quote.mjs`.

- `npm test` runs validation, no-send isolation, provider fixtures and routing checks without network calls or email.
- `npm run build:workers` produces `.workers-assets/production` with the normal presentation.
- `npm run build:workers:preview` produces `.workers-assets/preview` with a visible test notice, noindex and no-email quote handling.
- `npm run workers:dev` or `npm run workers:dev:preview` runs the corresponding local Worker and builds its assets.
- `npm run workers:deploy:production` deploys `baxter-industries-production`; `npm run workers:deploy:preview` deploys `baxter-industries-preview`. Wrangler runs the configured build before each deployment.
- `npx wrangler deploy --env production --dry-run` (or `--env preview`) builds and packages without deployment.

Generated output and local secrets are ignored by Git. Each export starts from current source; private source, environment files and payment-preview work are excluded and checked. Production and preview outputs are separate. A Workers export also updates Next's intermediate `.next` directory; run the normal `npm run build` again before `npm start`.

Production custom-domain assets remain indexable. The native `_headers` host rule marks production `workers.dev` responses noindex without invoking the Worker for static assets; preview assets are always noindex. APIs are noindex and no-store. HSTS preserves the existing `max-age=63072000` policy. Public HTTP API requests redirect to HTTPS with status 308; Cloudflare's zone-level Always Use HTTPS setting handles static requests when the domain is cut over. The official [static asset headers documentation](https://developers.cloudflare.com/workers/static-assets/headers/) describes the host rule.

The GitHub deployment workflow runs the production deploy followed by `npm run workers:check:production`. This check compares deployed asset hashes to the freshly built local output, checks headers, API errors and absent private files. Its only POST is malformed JSON, which cannot send email. `BAXTER_WORKER_BASE_URL` may select another HTTPS production `workers.dev` candidate; the default is `https://baxter-industries-production.brody-775.workers.dev/`.

## Quote delivery

The form posts to same-origin `/api/quote`; this site has no authentication provider or separate CORS/authorized-URL configuration. The API validates and bounds the request before delivery and never logs contact fields or provider errors.

Current delivery defaults are `Baxter Industries <onboarding@resend.dev>` to **only `tbaxter941@gmail.com`**. Replies go to the customer's submitted email. `QUOTE_FROM_EMAIL` and comma-separated `QUOTE_TO_EMAILS` can override those defaults. The API key stays server-side and is never exported with the frontend.

Cloudflare requires the explicit `QUOTE_DELIVERY_MODE` from its environment: `live` for production or `preview` for the preview. Live delivery fails closed when the key or delivery settings are unavailable. Preview never sends email or stores submitted fields, even if a key is accidentally supplied; success explicitly states no email was sent. Vercel preserves its existing live default when the mode is omitted.

The shared `onboarding@resend.dev` sender is limited to the Resend account owner's allowed test recipient. Verify that the production key belongs to the account supporting the existing Tim destination before activating it. Sending to additional recipients requires a verified sender domain in that account; see [Resend's error reference](https://resend.com/docs/api-reference/errors). Do not assume another site's key has equivalent permission. No valid production quote is sent by the tests or CI check. Before DNS cutover, verify a controlled real quote delivery separately, then attach the intended custom domains and verify their indexable HTTPS responses. Keep Vercel available for rollback until the cutover is confirmed.
