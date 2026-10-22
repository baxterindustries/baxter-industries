# Security maintenance

Last checked: October 21, 2026 (America/New_York). Recheck versions, advisories,
deployment aliases, and provider settings before a later release. This is a
bounded dependency and hosting review, not an application penetration test or a
complete review of Supabase authorization.

## Implemented Next.js update

Industries now pins `next` to **16.4.2**, replacing the lockfile's 16.3.8 and the
manifest's `^16.2.7`. The lockfile updates the matching Next environment/compiler
packages. React and React DOM remain **19.2.7**, within Next 16.4.2's supported
peer range; Next's production image dependency remains **sharp 0.35.5**. No
separate `react-server-dom-*` dependency or override is introduced: Next supplies
its framework implementation.

The [October 14 official security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026)
identifies 16.4.1 as the patched 16.x release. The selected
[16.4.2 stable release](https://github.com/vercel/next.js/releases/tag/v16.4.2)
includes those fixes plus subsequent bug fixes, and 16.x is
[Active LTS](https://nextjs.org/support-policy).

| Advisory | Source applicability observed before this change |
| --- | --- |
| [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr), Cache Components typed-array RCE | No `use cache` or `cacheComponents` declaration in the inspected application/configuration. Upstream still recommends upgrading. |
| [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), image optimization/SVG upstream RCE | No `next/image` or `remotePatterns` declaration. Production sharp was already 0.35.5, meeting the advisory workaround. |
| [GHSA-p3m5-59mp-jv5r](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r), Server Actions DoS | No `use server` declaration in the inspected application. `/api/quote` is a Route Handler, not a Server Action. |

These source findings limit demonstrated applicability; they do not establish
zero exposure. A clean npm audit alone is insufficient to assess these official
Next advisories. Use the advisory's patched versions as well as the installed
dependency tree.

### Source and live evidence boundaries

Relevant remotes were refreshed before work. Industries source baseline:
`e43f168623ee9f7d470d3af7d55e27d51f2a65e8` (`origin/main`). Capital source baseline:
`602ac92b6049c4eaf3f968af0b5b3054c470374e` (`origin/main`). Both original local
checkouts contained unrelated edits and were behind those refs; this change was
prepared in a separate Industries worktree. Capital source was inspected
read-only.

| Surface | Live observation on October 21 |
| --- | --- |
| `https://baxter-industries.com/` | HTTP 200, Vercel; alias deployment `dpl_Bf5sHpmRscLSGrKHgb411xB2K3Re`, READY, matching Industries baseline SHA. Build logs explicitly report Next.js 16.3.8. |
| `https://baxter-capital.com/` | HTTP 200, Vercel; alias deployment `dpl_vFNH7ffKmVp9zX6TBheLpVoVKCxW`, READY. Deployment metadata did not expose a Git SHA; the inspected Capital source ref is not asserted to be this deployment's exact commit. |

Industries uses Next.js and Capital uses a static browser application with
server API handlers and Supabase. No PHP source was found in either inspected
application tree. No hosting migration, DNS change, database change, production
deployment, or real quote email is part of this update.

### Validation and release status

Validated locally with Node **24.19.0** and npm **11.10.1**:

| Check | Result |
| --- | --- |
| `npm ci --no-fund` | Successful clean install from the updated lockfile. |
| `npm test` | All 17 tests pass: routing, bounded input, no-send preview, provider fixtures, sanitization, and readiness behavior. |
| `npm run build` | Next 16.4.2 compilation and TypeScript checks pass; `/` is static and `/api/quote` remains dynamic. |
| `npm run build:workers` | Production static export and asset checks pass; six public image files match their source bytes, no server/payment files exported, correct indexing/header rules. |
| `npm run build:workers:preview` | Preview static export and asset checks pass, including notice, noindex, and robots behavior. |
| Production server, `QUOTE_DELIVERY_MODE=preview` | Root, linked JS/CSS and public image return 200; absent page returns 404. Six quote HTTP checks pass: GET 405, non-JSON 415, malformed JSON 400, missing fields 400, oversized body 413, valid no-send submission 200. Application JSON responses retain no-store/noindex headers. |
| Browser on the production server | Form hydrates, submits sample fields, resets, and displays explicit no-email/no-storage success. No browser console warnings/errors observed. |
| `npm ls next react react-dom sharp --all` | Next 16.4.2, React/React DOM 19.2.7 and production sharp 0.35.5; separate development sharp 0.35.4 noted below. |
| `npm audit --omit=dev --json` / `npm audit --json` | Zero production findings; three high development-chain findings, documented below. |

The framework update passed these local checks. The live 16.3.8 version above
is the pre-update observation; consult current deployment records for release
status. Local no-send checks and mocked provider tests do not prove real email
delivery. A production release must verify the deployed version, the live
root/assets and quote rejection paths; coordinate any real delivery test
separately.

Both the normal Next/Vercel build and the
`BAXTER_HOSTING_TARGET=cloudflare` static export remain supported. The latter
excludes the Next `.ts` API adapter and uses the existing shared Worker quote
service. The final local build is the normal Next build, ready for `npm start`.

## Remaining opportunities (documented, not implemented)

Priority: P1 = prompt maintenance of a known affected dependency; P2 = planned
defense in depth or closure of an evidence gap. These are priorities for follow-up,
not assertions of active compromise.

### P1 - Update the Cloudflare development toolchain

**Surface/evidence:** Both source lockfiles select Wrangler 4.145.0 and Miniflare
5.20260930.0-alpha with a development-only sharp 0.35.4. Industries' full
`npm audit --json` reports three high findings along this single dependency
chain (`sharp` -> `miniflare` -> `wrangler`), while `npm audit --omit=dev --json`
reports zero. Industries has a separate patched production sharp 0.35.5 under
Next. Capital's sharp is development-only.

**Recommendation:** Update Wrangler in each repository in a separate change;
the current audit proposes 4.151.3. Recheck the then-current supported version,
verify all sharp copies resolve to 0.35.5 or newer, and run existing Worker tests,
both asset builds, and production/preview packaging dry runs. Avoid exposing a
development emulator to untrusted traffic. This is a confirmed affected package
in development tooling, not proof that either live site serves the vulnerable
image-processing path. See the
[sharp maintainer advisory](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w).

### P2 - Make the Capital browser SDK delivery reproducible

**Surface/evidence:** Live `/supabase.js` imports
`https://esm.sh/@supabase/supabase-js@2`, matching the inspected source. The CDN
currently resolves that floating major to **2.118.0**. This browser module graph
is outside Capital's npm lockfile. A direct npm bulk-advisory query for
`@supabase/supabase-js`, `auth-js`, `functions-js`, `postgrest-js`, `realtime-js`,
and `storage-js`, each at 2.118.0, returned no advisories. This query is not an
integrity check or a complete audit of every transitive CDN module.

**Recommendation:** Prefer bundling the SDK and its transitive dependencies from
the repository lockfile into the existing asset build. If retaining the CDN,
pin an exact reviewed SDK version and review how its transitive module URLs,
CDN transforms, and caching are selected; a top-level version pin alone does not
remove CDN trust. Test login, refresh, confirmation/recovery links, Storage
downloads/uploads, Realtime, and investor/admin workflows. Preserve the current
session storage key. Treat this as supply-chain hardening, not a confirmed CVE.

### P2 - Add a tested Content Security Policy

**Surface/evidence:** GET responses for both live roots lacked
`Content-Security-Policy`, `Content-Security-Policy-Report-Only`, and a CSP meta
tag. Both included HSTS (`max-age=63072000`). Industries contains inline reveal
and Next hydration scripts; Capital has a large inline application script and
loads the esm.sh SDK. Both load Google Fonts and contain inline styling.

**Recommendation:** Start with a report-only HTTP response policy in a controlled
preview. Inventory actual requests and violations before enforcement. Account
for same-origin assets, scripts, styles and quote/API requests, Google Fonts
CSS/font origins, Capital's complete esm.sh module chain, the configured
Supabase HTTPS/WSS endpoints, and signed Storage/document/image URLs. Review
`object-src`, `base-uri`, `form-action`, and a response-header `frame-ancestors`
policy against the intended embedding behavior. Keep violation reports free of
tokens, document URLs, and customer data.

For static exports, generate and validate hashes for permitted inline scripts
with each build or move them to suitable external assets. Do not add a fixed
nonce or copy a dynamic nonce policy into static HTML: Next's
[nonce guidance](https://nextjs.org/docs/app/guides/content-security-policy)
requires rendering per request. Test production builds, quote submission and
errors, fonts/reveals, auth callbacks, authenticated navigation, signed files,
uploads, voting, and all forms on both hosting paths before enforcing. Missing
CSP alone does not demonstrate an exploit.

### P2 - Close managed runtime and backend patch verification gaps

**Surface/evidence:** Read-only Vercel deployment metadata selects Node **24.x**
for both live deployments. This does not identify the exact hosted runtime
patch, binary build, or future runtime image used by the provider. Supabase
backend component patch levels were not independently verified. The local Node
version used for validation is not evidence of either hosted runtime.

**Recommendation:** Obtain deployment-specific runtime patch evidence or a
provider maintenance attestation and check applicable Node advisories. Review
Supabase's project health/security advisories, available database upgrades,
managed Auth/Storage/Realtime maintenance, and supported component versions
through the authorized provider account. Track owner and review date. Keep
these as verification gaps until evidence establishes an affected version;
browser SDK versions do not prove backend patch status.

### P2 - Align response headers across hosting targets

**Surface/evidence:** Both live Vercel roots also lacked
`X-Content-Type-Options`, `Referrer-Policy`, and `X-Frame-Options`. Prepared
Cloudflare assets already set `nosniff`; Industries additionally sets
`strict-origin-when-cross-origin`. HSTS exists on both live roots. The current
headers do not establish an exploitable content-type, referrer, or framing bug.

**Recommendation:** Add and test suitable `nosniff` and referrer policies to the
Vercel HTML/asset delivery paths and reconcile Cloudflare behavior. Define
framing through the tested CSP's `frame-ancestors` and, if needed, a compatible
legacy `X-Frame-Options` value. Verify MIME types, downloads, auth callbacks,
and intended embeds before enforcement.

### P2 - Keep security checks independent of npm audit coverage

**Surface/evidence:** The Next update is required by official advisories even
though the production npm audit reports zero findings. Industries' current
Cloudflare workflow runs install/tests on pull requests, but its build is inside
the deploy step, which is skipped for pull requests; there is no normal
Next/Vercel build in that workflow.

**Recommendation:** Add non-deploying PR checks for the normal build and both
Worker exports, alongside existing tests. Review framework/vendor advisories
and lockfile versions during dependency maintenance, including CDN-delivered
code and development tools. Keep full and production-only audit results
separate. Do not automatically run `npm audit fix --force` or treat a zero
count as a release-wide security guarantee.
