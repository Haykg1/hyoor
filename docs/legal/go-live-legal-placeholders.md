# Legal documents — placeholder checklist

Tracks every `[PLACEHOLDER]` in the locale legal files under
[`apps/web/src/content/legal/`](../../apps/web/src/content/legal/) —
`terms-of-service.{en,hy,ru}.md`, `privacy-policy.{en,hy,ru}.md`,
`cancellation-refund-policy.*.md`, and `cookie-policy.*.md` — rendered at
`/terms`, `/privacy`, `/cancellation`, and `/cookies`.

**Fill identity in one place:** [`packages/shared/src/constants/company.ts`](../../packages/shared/src/constants/company.ts).
Legal markdown keeps the `[TOKEN]` spelling; `apps/web/src/lib/legal/placeholders.ts` maps
tokens onto `COMPANY` and shared fee/payout/deposit defaults. Empty values are left as
brackets on the live pages. Do not duplicate identity/emails across locale files.

Check items off as they are resolved. Line numbers are approximate (the web copies carry
the draft banner as an HTML comment near the top).

## Company identity — fill once, used in both files

| Done | Placeholder                                  | Where                                 | What to put                                         |
| ---- | -------------------------------------------- | ------------------------------------- | --------------------------------------------------- |
| ☐    | `[LEGAL ENTITY NAME]`                        | ToS 12, 189 · Privacy 12, 137         | Registered company name (e.g. "RentStar LLC / ՍՊԸ") |
| ☐    | `[REG NUMBER]`                               | ToS 13                                | State registration number                           |
| ☐    | `[ADDRESS]`                                  | ToS 14, 189 · Privacy 12, 137         | Registered legal address                            |
| ☐    | `[SUPPORT EMAIL]`                            | ToS 14, 33, 109, 112, 168, 189        | e.g. support@rentstar.am                            |
| ☐    | `[PRIVACY EMAIL]`                            | Privacy 13, 111, 127, 137             | May equal support email                             |
| ☐    | `[PHONE]`                                    | ToS 189                               | Support phone, or delete                            |
| ☐    | `05-08-2026`                                 | ToS 8 · Privacy 8 · Cookie (en/hy/ru) | Publication date                                    |
| ☐    | `[LEGAL ENTITY NAME]` / `[ADDRESS]` / emails | Cookie policy intro (en/hy/ru)        | Same as company identity row above                  |

## Numbers that already match the code — confirm and unbracket

| Done | Placeholder                       | Where  | Source of truth                                    |
| ---- | --------------------------------- | ------ | -------------------------------------------------- |
| ☐    | `[48] hours` deposit claim window | ToS 76 | `STRIPE_DEPOSIT_CLAIM_WINDOW_HOURS` (default 48)   |
| ☐    | `[24] hours` payout delay         | ToS 83 | `STRIPE_PAYOUT_DELAY_HOURS` (default 24)           |
| ☐    | `[10]%` platform fee              | ToS 91 | `STRIPE_PLATFORM_FEE_PERCENT_DEFAULT` (default 10) |

## Business / legal decisions — owner + lawyer choose

| Done | Placeholder                                  | Where                 | Decision                                                 |
| ---- | -------------------------------------------- | --------------------- | -------------------------------------------------------- |
| ☐    | `[30] days'` notice for fee changes          | ToS 93                | Warning period for hosts before fee changes              |
| ☐    | `[AMOUNT] AMD` liability cap                 | ToS 160               | Fixed liability ceiling — lawyer sets                    |
| ☐    | `[15] days'` notice for terms/policy changes | ToS 176 · Privacy 132 | Notice period for material changes                       |
| ☐    | `[Yerevan, Armenia]` venue                   | ToS 183               | Court jurisdiction — lawyer confirms                     |
| ☐    | `[30] days` account-deletion window          | Privacy 94            | How fast closed accounts are purged                      |
| ☐    | `[5] years` financial-record retention       | Privacy 96            | Must match Armenian tax/accounting law — lawyer confirms |
| ☐    | `[90] days` log retention                    | Privacy 103           | Ops choice                                               |
| ☐    | `[30] days` rights-response deadline         | Privacy 111           | Statutory deadline — lawyer confirms                     |
| ☐    | `[session/1 year]` locale cookie lifetime    | Privacy 60            | Check next-intl's actual `NEXT_LOCALE` cookie config     |
| ☐    | `[eu-central-1 / REGION]` S3 region          | Privacy 66            | Production AWS region (dev uses eu-central-1)            |

## Lawyer review flags (notes, not fill-ins)

- Privacy 51 — legal basis for AI search (legitimate interest vs consent)
- Privacy 74 — international transfer mechanism per provider (SCCs etc.)
- Privacy 96 — retention period for financial records

## Related product decision (in progress)

- Host cancellations that apply the cancellation fee now require admin review
  before the fee is captured — ToS Section 8 reflects this; implemented on branch
  `feature/security-deposit-claims` (admin page `/admin/cancellation-claims`,
  covered by unit + e2e tests).
