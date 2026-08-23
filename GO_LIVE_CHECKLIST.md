# RentStar — Go-Live Gap Analysis

Analysis date: 2026-08-01 (branch `feature/security-deposit-claims`).

The core product is in good shape: auth (email OTP verification, password reset, Google/Apple OAuth), listings with wizard + bulk upload, availability/pricing, bookings with cancellation policies, messaging, reviews, notifications, favorites, compare/share, AI search, admin panel, cron jobs, i18n (en/hy/ru), unit + e2e specs. Online payments were previously built on Stripe; that integration has been removed pending a decision on a replacement processor, so payments and payouts are currently a launch blocker (see section 2). What follows is what is **missing** to go live, grouped by severity.

---

## 1. Blockers — legal & trust content (cannot launch without these)

Legal policy pages and cookie consent are in place. Footer Hosting still has a dead Host resources link (`apps/web/src/components/public/footer/public-footer.tsx`).

- [x] **Terms of Service** — public `/terms` in en/hy/ru; footer + auth/booking links. Remaining: fill `[PLACEHOLDERS]` (see `docs/legal/go-live-legal-placeholders.md`) + lawyer review.
- [x] **Privacy Policy** — public `/privacy` in en/hy/ru; same placeholder + lawyer-review gap as Terms.
- [x] **Cancellation / Refund policy page** — public `/cancellation` in en/hy/ru; footer + sitemap; aligned with ToS §8 and cancellation-fee logic.
- [x] **Cookie consent banner** — banner + preferences dialog on all locales; Cookie Policy at `/cookies` (en/hy/ru); consent stored in `rentstar_cookie_consent`; analytics gated via `canUseAnalytics()` (no analytics scripts yet). Sitemap + footer linked.
- [x] **Replace legal placeholders with real values** — fill identity/emails in `packages/shared/src/constants/company.ts` (legal markdown `[TOKEN]`s map through `apps/web/src/lib/legal/placeholders.ts`). Tracked in `docs/legal/go-live-legal-placeholders.md`; then lawyer review.
- [x] **Contact page** — public `/contact` with company details from `COMPANY`, form routed to support/info inboxes, footer + sitemap.
- [x] **Help center / FAQ** — public `/faq` (en/hy/ru) from product logic; footer Help Center + Safety; sitemap + FAQPage JSON-LD.
- [x] **Careers / Press pages** — omitted for MVP; dead footer links removed.
- [ ] **Host Terms / commission agreement** — hosts pay a platform fee (`PLATFORM_FEE_PERCENT_DEFAULT`); fee language lives in ToS §7, but a dedicated host-facing agreement is still missing.

## 2. Blockers — payments

- [ ] **No live online payment method.** Stripe has been removed from the codebase. The registry-based providers (cash/Idram/ArCa) exist in the API, but the guest checkout UI currently shows every provider as "coming soon" — there is no way to actually pay for a booking online today.
- [ ] **ArCa and Idram providers are stubs** — both throw `NotImplementedException` (`apps/api/src/payments/providers/arca.provider.ts`, `idram.provider.ts`). For the Armenian market these matter.
- [ ] **Pick and integrate a payment processor** (or wire up cash-on-arrival end-to-end as an interim launch option) — decide the replacement for the removed Stripe integration, including host payout mechanics, before launch.

## 3. Critical — production infrastructure & operations

- [ ] **No deployment target or pipeline.** There are production Dockerfiles and a `docker-compose.yml`, but no deploy workflow, no hosting config (VPS/ECS/Fly/Railway…), no reverse proxy/TLS termination config, no domain/DNS/SSL setup checklist.
- [ ] **CI only runs API unit tests** (`.github/workflows/unit-tests.yml`). Add: lint, typecheck, web build, and the e2e suite (`pnpm e2e:tests`) as PR gates.
- [ ] **No error monitoring** — no Sentry (or similar) in either app. First production bug will be invisible.
- [ ] **No uptime/log monitoring** — `/health` exists but nothing watches it; API logs are default Nest console logs with no aggregation.
- [ ] **No database backup/restore strategy** — Postgres runs in Docker with a volume; you need automated backups (e.g. managed Postgres or `pg_dump` cron + offsite storage) and a tested restore.
- [ ] **Production S3** — code targets LocalStack in dev; need real buckets, IAM user with least privilege, and CORS config for presigned uploads.
- [ ] **Production email** — Resend transport exists (`apps/api/src/mail/transports/resend.mailer.ts`) but needs a live API key plus domain verification (SPF/DKIM/DMARC) so OTP and booking emails don't land in spam.
- [ ] **Secrets management** — real JWT secrets, payment-processor keys (once chosen), DB credentials must come from the host's secret store, not a committed `.env`.
- [ ] **Staging environment** — no way to test payment-processor webhooks/payouts safely before prod once a processor is chosen.

## 4. High — web platform basics (SEO, errors, PWA)

- [x] **No** `robots.txt` **and no** `sitemap.xml` — added `app/robots.ts` + `app/sitemap.ts` (locale-aware; active property pages; private paths disallowed; localhost/staging noindex via `NEXT_PUBLIC_ALLOW_INDEXING`).
- [ ] **No favicon, app icons, or OG image** — nothing in `apps/web/public/` except templates; browser tabs and social shares will look broken. Add `icon`, `apple-icon`, `opengraph-image`, and a web manifest.
- [x] **No per-page metadata** — `generateMetadata` on property, search, and auth pages (plus compare). Shared helper sets title/description/OG/Twitter, canonical + hreflang; auth is `noindex`.
- [x] **No structured data** — property pages emit schema.org `VacationRental` JSON-LD (address, geo, occupancy, offers, aggregateRating when available).
- [x] **No React error boundaries** — added `[locale]/error.tsx`, `global-error.tsx`, and shared `ErrorState` matching the public status-screen design; `not-found` uses the same UI.
- [x] **hreflang/canonical tags** — all public surfaces (home, search, ai-search, property, compare, auth) emit canonical + locale alternates via `buildPageMetadata`.

## 5. Medium — product & compliance gaps

- [ ] **Account deletion / data export** — GDPR-style right-to-erasure; check whether users can delete their account from `/account`, and how bookings/payment records are retained after deletion.
- [ ] **Web analytics** — no product analytics at all (nothing wrong for launch, but you'll be blind; pair with the cookie consent from section 1).
- [ ] **Zero frontend tests** — the API has good coverage; the web app has none. At minimum add tests for booking-price math and the listing wizard schema (`apps/web/src/lib/listing/schema.ts`).
- [ ] **Load a real review of the seed accounts** — `admin@rentstar.am` etc. with known passwords must not exist in the production database (docker-init runs `migrate deploy + seed` on startup — make sure prod seeding is disabled or prod-safe).
- [x] **Rate-limit review** — throttling is wired globally (good); double-check stricter per-route limits on `auth/login`, OTP request, and password reset to prevent brute force / SMS-pump-style abuse.
- [x] **API docs exposure** — Swagger (`/api/docs`) is registered only when `NODE_ENV !== 'production'`.
- [ ] **Currency rates dependency** — FX display rates come from `open.er-api.com`; decide the fallback behavior if it's down and whether `CURRENCY_RATES_FETCH_ON_BOOT` should be on in prod.

## 6. Nice-to-have before or shortly after launch

- [ ] About page with company details (legal entity, address) — often legally required for commercial sites.
- [ ] Host resources page (footer link is dead).
- [ ] Transactional email coverage: booking confirmed/cancelled emails for both sides (verify beyond the existing OTP, password-reset, guest-instructions, deposit-charged templates).
- [ ] Admin audit log for sensitive actions (role changes, fee overrides, booking cancellations).
- [ ] Performance pass: Lighthouse on home/search/property pages, image `sizes` attributes, DB indexes for search queries under load.

---

## Suggested order of attack

1. Legal pages + footer links + cookie banner (section 1) — also unblocks payment-processor live review and Google OAuth verification.
2. Production infrastructure: hosting, TLS, managed Postgres + backups, real S3, Resend domain, secrets (section 3).
3. Pick and integrate a payment processor; hide ArCa/Idram until implemented (section 2).
4. SEO/error-page basics — robots, sitemap, icons, metadata, `error.tsx` (section 4) — roughly a day of work, huge external polish.
5. CI hardening + Sentry + uptime checks (section 3), then section 5 items post-launch-candidate.
