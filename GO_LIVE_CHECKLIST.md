# RentStar — Go-Live Gap Analysis

Analysis date: 2026-08-01 (branch `feature/security-deposit-claims`).

The core product is in good shape: auth (email OTP verification, password reset, Google/Apple OAuth), listings with wizard + bulk upload, availability/pricing, bookings with cancellation policies, Stripe payments + Connect payouts, security-deposit claims with admin review, messaging, reviews, notifications, favorites, compare/share, AI search, admin panel, cron jobs, i18n (en/hy/ru), 26 unit spec files + 23 e2e specs. What follows is what is **missing** to go live, grouped by severity.

---

## 1. Blockers — legal & trust content (cannot launch without these)

All "About / Support" footer links point to `/` (see `apps/web/src/components/public/footer/public-footer.tsx`) and none of these pages exist:

- [ ] **Terms of Service** — draft page live at `/terms` (rendered from `apps/web/src/content/legal/terms-of-service.md`, linked from footer, auth pages, and booking confirm). Remaining: fill `[PLACEHOLDERS]` (see `docs/legal/go-live-legal-placeholders.md`) + lawyer review.
- [ ] **Privacy Policy** — draft page live at `/privacy` (same setup as terms). Remaining: fill `[PLACEHOLDERS]` + lawyer review.
- [ ] **Cancellation / Refund policy page** — the logic exists in code (`apps/web/src/lib/bookings/cancellation.ts`), but there is no public page a guest can read; Stripe requires a public refund policy.
- [ ] **Cookie consent banner** — auth cookies are fine as "strictly necessary", but the moment you add analytics you need consent (and a cookie policy page).
- [ ] **Contact page** (footer link is dead) — a real support email/form; also required for Stripe/OAuth verification.
- [ ] **Help center & Safety pages** (footer links are dead) — even a minimal FAQ page each.
- [ ] **Careers / Press pages** (footer links are dead) — or remove the links for launch.
- [ ] **Host Terms / commission agreement** — hosts connect Stripe accounts and pay a platform fee (`STRIPE_PLATFORM_FEE_PERCENT_DEFAULT`); that relationship needs written terms.

## 2. Blockers — payments

- [ ] **ArCa and Idram providers are stubs** — both throw `NotImplementedException` (`apps/api/src/payments/providers/arca.provider.ts`, `idram.provider.ts`). For the Armenian market these matter. Either implement them before launch or make sure the UI never offers them (verify the payment-method picker hides them).
- [ ] **Live Stripe setup** — live keys, production webhook endpoint registered in the Stripe dashboard (`stripe-webhook.controller.ts` path), Connect platform profile approved, payout schedule reviewed. Stripe will ask for the ToS/privacy/refund pages from section 1.
- [ ] **Merge the in-flight work** — 47 modified files are uncommitted and 2 commits (deposit charge/release flow, stay-fee normalization) are unpushed on `feature/security-deposit-claims`. Nothing on this branch is live-able until it's reviewed, merged, and green in CI.

## 3. Critical — production infrastructure & operations

- [ ] **No deployment target or pipeline.** There are production Dockerfiles and a `docker-compose.yml`, but no deploy workflow, no hosting config (VPS/ECS/Fly/Railway…), no reverse proxy/TLS termination config, no domain/DNS/SSL setup checklist.
- [ ] **CI only runs API unit tests** (`.github/workflows/unit-tests.yml`). Add: lint, typecheck, web build, and the e2e suite (`pnpm e2e:tests`) as PR gates.
- [ ] **No error monitoring** — no Sentry (or similar) in either app. First production bug will be invisible.
- [ ] **No uptime/log monitoring** — `/health` exists but nothing watches it; API logs are default Nest console logs with no aggregation.
- [ ] **No database backup/restore strategy** — Postgres runs in Docker with a volume; you need automated backups (e.g. managed Postgres or `pg_dump` cron + offsite storage) and a tested restore.
- [ ] **Production S3** — code targets LocalStack in dev; need real buckets, IAM user with least privilege, and CORS config for presigned uploads.
- [ ] **Production email** — Resend transport exists (`apps/api/src/mail/transports/resend.mailer.ts`) but needs a live API key plus domain verification (SPF/DKIM/DMARC) so OTP and booking emails don't land in spam.
- [ ] **Secrets management** — real JWT secrets, Stripe keys, DB credentials must come from the host's secret store, not a committed `.env`.
- [ ] **Staging environment** — no way to test Stripe webhooks/payouts safely before prod.

## 4. High — web platform basics (SEO, errors, PWA)

- [x] **No `robots.txt` and no `sitemap.xml`** — added `app/robots.ts` + `app/sitemap.ts` (locale-aware; active property pages; private paths disallowed; localhost/staging noindex via `NEXT_PUBLIC_ALLOW_INDEXING`).
- [ ] **No favicon, app icons, or OG image** — nothing in `apps/web/public/` except templates; browser tabs and social shares will look broken. Add `icon`, `apple-icon`, `opengraph-image`, and a web manifest.
- [ ] **No per-page metadata** — only the compare pages implement `generateMetadata`. Property detail pages ship with the global "RentStar" title: bad for SEO and link sharing. Add `generateMetadata` at least to property, search, and auth pages.
- [ ] **No structured data** — add schema.org `VacationRental`/`Product` JSON-LD on property pages for rich results.
- [ ] **No React error boundaries** — there is a `not-found.tsx` but no `error.tsx` or `global-error.tsx` anywhere; an uncaught render error shows Next's raw crash screen to users.
- [ ] **hreflang/canonical tags** — with three locales you want alternates metadata so Google doesn't treat en/hy/ru as duplicates.

## 5. Medium — product & compliance gaps

- [ ] **Account deletion / data export** — GDPR-style right-to-erasure; check whether users can delete their account from `/account`, and how bookings/payment records are retained after deletion.
- [ ] **Web analytics** — no product analytics at all (nothing wrong for launch, but you'll be blind; pair with the cookie consent from section 1).
- [ ] **Zero frontend tests** — the API has good coverage; the web app has none. At minimum add tests for booking-price math and the listing wizard schema (`apps/web/src/lib/listing/schema.ts`).
- [ ] **Load a real review of the seed accounts** — `admin@rentstar.am` etc. with known passwords must not exist in the production database (docker-init runs `migrate deploy + seed` on startup — make sure prod seeding is disabled or prod-safe).
- [ ] **Rate-limit review** — throttling is wired globally (good); double-check stricter per-route limits on `auth/login`, OTP request, and password reset to prevent brute force / SMS-pump-style abuse.
- [ ] **API docs exposure** — Swagger is served at `/api/docs` unconditionally; decide whether to disable or protect it in production.
- [ ] **Currency rates dependency** — FX display rates come from `open.er-api.com`; decide the fallback behavior if it's down and whether `CURRENCY_RATES_FETCH_ON_BOOT` should be on in prod.

## 6. Nice-to-have before or shortly after launch

- [ ] About page with company details (legal entity, address) — often legally required for commercial sites.
- [ ] Host resources page (footer link is dead).
- [ ] Transactional email coverage: booking confirmed/cancelled emails for both sides (verify beyond the existing OTP, password-reset, guest-instructions, deposit-charged templates).
- [ ] Admin audit log for sensitive actions (role changes, deposit-claim decisions, fee overrides).
- [ ] Performance pass: Lighthouse on home/search/property pages, image `sizes` attributes, DB indexes for search queries under load.

---

## Suggested order of attack

1. Merge and stabilize `feature/security-deposit-claims` (it touches payments — everything else depends on it).
2. Legal pages + footer links + cookie banner (section 1) — also unblocks Stripe live review and Google OAuth verification.
3. Production infrastructure: hosting, TLS, managed Postgres + backups, real S3, Resend domain, secrets (section 3).
4. Stripe live mode + webhook registration; hide ArCa/Idram until implemented (section 2).
5. SEO/error-page basics — robots, sitemap, icons, metadata, `error.tsx` (section 4) — roughly a day of work, huge external polish.
6. CI hardening + Sentry + uptime checks (section 3), then section 5 items post-launch-candidate.
