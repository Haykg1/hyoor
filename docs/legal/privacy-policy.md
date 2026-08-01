# RentStar — Privacy Policy

> **DRAFT — NOT LEGAL ADVICE.** Drafted to match the data flows actually implemented in the
> RentStar codebase. Must be reviewed by a lawyer familiar with the Armenian Law on Personal
> Data Protection and, if you serve EU users, the GDPR. Items in `[SQUARE BRACKETS]` are
> placeholders.

_Last updated: [DATE]_

## 1. Who is responsible for your data

The data controller is **[LEGAL ENTITY NAME]**, [ADDRESS], Republic of Armenia
("**RentStar**", "**we**"). Contact for privacy matters: **[PRIVACY EMAIL]**.

## 2. What data we collect

**Account data.** Email address, password (stored only as a cryptographic hash), account role
(guest/host/admin), email-verification status. If you sign in with Google or Apple, we
receive your provider account identifier and email address from that provider.

**Profile data (provided by you).** First and last name, phone number, profile photo,
short bio, nationality, preferred language, spoken languages.

**Host data.** Host type (individual or company), company name and description where
applicable, listing content (addresses, photos, pricing, rules), and the identifier of your
connected Stripe payout account. Identity/KYC documents required for payouts are collected
**by Stripe, not by us**.

**Booking and payment data.** Booking dates, number of guests, amounts (rent, cleaning fee,
security deposit), chosen payment method, currency, booking status history, and payment
references (Stripe customer and payment-intent identifiers). **We never see or store your
card number** — card data is entered directly with Stripe.

**Communications.** Messages you exchange with Hosts or Guests on the platform, reviews you
write and receive, notifications, and correspondence with our support.

**Search data.** Search queries, including free-text queries you type into AI-assisted
search (see Section 4 — these are processed by an AI provider).

**Usage and technical data.** Favorites, listing-comparison selections, IP address, and
standard server logs collected when you use the site.

## 3. Why we process it (purposes and legal bases)

| Purpose                                                               | Data                                        | Legal basis                                                          |
| --------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------- |
| Providing accounts, listings, bookings, messaging, reviews            | account, profile, booking, communications   | performance of a contract                                            |
| Processing payments, deposits, payouts                                | booking and payment data                    | performance of a contract; legal obligations                         |
| Email verification, booking and deposit notifications, password reset | account, booking                            | performance of a contract                                            |
| Reviewing damage claims and payment failures                          | booking, communications, evidence submitted | performance of a contract; legitimate interest in dispute resolution |
| AI-assisted search and suggestions                                    | search queries                              | legitimate interest / consent [LAWYER TO CONFIRM]                    |
| Security, fraud prevention, rate limiting, logs                       | technical data                              | legitimate interest                                                  |
| Complying with tax, accounting, AML obligations                       | booking and payment data                    | legal obligation                                                     |

We do not use your data for third-party advertising and we do not sell it.

## 4. Who we share data with (processors and recipients)

- **Stripe** (payments, deposits, host payouts, KYC) — Stripe acts as our payment processor
  and, for its own compliance duties, as an independent controller. See Stripe's privacy
  policy.
- **Amazon Web Services (S3)** — storage of uploaded photos (listings, avatars), region
  **[eu-central-1 / REGION]**.
- **Resend** — sending transactional emails (verification codes, password resets, booking
  and deposit emails).
- **OpenAI** — free-text AI search queries are sent to OpenAI to interpret them. Do not
  include sensitive personal information in search queries.
- **Google / Apple** — only if you choose to sign in with them.
- **Other users** — Hosts see the booking Guest's name, profile photo and message content;
  Guests see Host/listing information; reviews are public.
- **Authorities** — where required by applicable law.

Some providers are located outside Armenia (e.g. USA/EU). Where required, transfers rely on
appropriate safeguards such as standard contractual clauses. [LAWYER TO CONFIRM transfer
mechanism per provider.]

## 5. Cookies

RentStar uses only strictly necessary cookies:

| Cookie                   | Purpose                             | Lifetime         |
| ------------------------ | ----------------------------------- | ---------------- |
| `rentstar_access_token`  | keeps you signed in (access token)  | 15 minutes       |
| `rentstar_refresh_token` | renews your session (refresh token) | 7 days           |
| `NEXT_LOCALE`            | remembers your language             | [session/1 year] |

We currently use **no analytics or advertising cookies**. If that changes, this policy and a
consent banner will be introduced first. Interface preferences (e.g. theme) may be stored in
your browser's local storage and never leave your device.

## 6. How long we keep data

- **Account and profile data:** for as long as your account exists, then deleted or
  anonymized within **[30] days** of account closure, except where retention is legally
  required.
- **Booking, payment, and payout records:** retained for **[5] years** [LAWYER TO CONFIRM
  Armenian tax/accounting retention period] after the transaction, as required for tax and
  accounting purposes, even after account closure.
- **Messages and reviews:** for the life of the account; reviews may be retained in
  anonymized form after account deletion because counterpart users rely on them.
- **Verification codes and password-reset tokens:** short-lived and deleted after use or
  expiry.
- **Server logs:** up to **[90] days**.

## 7. Your rights

Subject to applicable law, you may: access a copy of your data; correct inaccurate data
(most profile data is editable in **Account settings**); request deletion of your account
and data; object to or restrict certain processing; receive your data in a portable format;
and withdraw consent where processing is based on consent. To exercise these rights, email
**[PRIVACY EMAIL]**. We respond within **[30] days**. You may also lodge a complaint with the
Personal Data Protection Agency of the Republic of Armenia (and, for EU residents, with your
local supervisory authority).

## 8. Security

Passwords are stored only as hashes; access to production systems is restricted; traffic is
encrypted in transit (HTTPS); card data never touches our servers; API access is protected
by short-lived tokens, role-based access control, and rate limiting. No system is perfectly
secure — if a breach affecting your data occurs, we will notify you and the competent
authority as required by law.

## 9. Children

RentStar is not directed at children and accounts may only be created by adults (18+). We do
not knowingly collect children's data; if you believe a child has provided us data, contact
[PRIVACY EMAIL].

## 10. Changes to this policy

We may update this policy. Material changes will be announced by email or in-app notice at
least **[15] days** before they take effect. The "Last updated" date above always reflects
the current version.

## 11. Contact

**[LEGAL ENTITY NAME]** — [ADDRESS] — [PRIVACY EMAIL]
