# RentStar — Cookie Policy

<!--
**DRAFT — NOT LEGAL ADVICE.** Must match actual cookies/storage in apps/web
(auth-cookies.ts, next-intl locale cookie, next-themes, zustand persist keys)
and the consent banner in components/cookies/.
-->

_Last updated: 02-08-2026_

This Cookie Policy explains how **RentStar** (“we”) uses cookies and similar technologies
when you use our website. It should be read with our
[Privacy Policy](/privacy) and [Terms of Service](/terms).

Controller: **[LEGAL ENTITY NAME]**, [ADDRESS], Republic of Armenia.
Contact: **[PRIVACY EMAIL]** or **[SUPPORT EMAIL]**.

## 1. What are cookies?

Cookies are small text files stored on your device by a website. Similar technologies include
browser `localStorage` / `sessionStorage`, which stay on your device and are not sent with
every HTTP request the way cookies are.

Under EU/EEA ePrivacy rules and good practice for Armenia-facing services, **strictly
necessary** cookies can be used without prior consent. **Non-essential** cookies (for example
analytics or advertising) require your prior opt-in. We do **not** currently load analytics or
advertising cookies.

## 2. How we use cookies today

### 2.1 Strictly necessary cookies

These are required for the site to work securely (sign-in) or to remember your cookie choice.
They are always active.

| Name                      | Type                               | Purpose                                                                   | Typical lifetime                     |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------------------- | ------------------------------------ |
| `rentstar_access_token`   | First-party cookie                 | Short-lived access token so authenticated API calls work                  | 15 minutes                           |
| `rentstar_refresh_token`  | First-party cookie                 | Lets us renew your session without asking you to sign in again            | 7 days                               |
| `rentstar_cookie_consent` | First-party cookie                 | Stores your cookie category choices (necessary / preferences / analytics) | 1 year                               |
| `NEXT_LOCALE`             | First-party cookie (via next-intl) | Remembers the language you selected (`en`, `hy`, or `ru`)                 | Up to about 1 year (library default) |

Auth cookies are set only after you sign in (or complete OAuth). They use `SameSite=Lax` and
the `Secure` flag on HTTPS.

### 2.2 Preference storage (on your device)

These are not login cookies. They improve convenience and normally stay on your device:

| Key / technology                                                 | Purpose                                  |
| ---------------------------------------------------------------- | ---------------------------------------- |
| Theme preference (`next-themes` / local storage)                 | Light / dark / system appearance         |
| `hyoor-host-display-currency` (local storage)                    | Preferred display currency for prices    |
| Listing wizard draft (session storage)                           | Temporary draft while creating a listing |
| AI search / host-calendar chat drafts (session or local storage) | Temporary chat UI state                  |
| Minor UI flags (local storage)                                   | e.g. dismissing an in-app notice         |

If you choose **Necessary only** in the banner, we treat optional preference persistence as
declined for future non-essential use. Core browsing and sign-in still work. Language
selection you make yourself may still set `NEXT_LOCALE` because that is needed to deliver
the page in the language you asked for.

### 2.3 Analytics and advertising

We currently use **no** analytics, advertising, or social-pixel cookies.

If we introduce analytics later (for example privacy-friendly page-view metrics), we will:

1. update this Cookie Policy and the Privacy Policy;
2. load those scripts **only** if you have opted into the **Analytics** category in the
   consent banner; and
3. never sell your personal data as a condition of using the site.

## 3. Your choices

When you first visit, a banner lets you:

- **Accept all** — necessary + preferences + analytics (analytics remains unused until we
  actually deploy analytics scripts);
- **Necessary only** — only strictly necessary cookies;
- **Customize** — toggle Preferences and Analytics, then save.

You can reopen the dialog anytime via **Cookie settings** in the website footer.

You can also delete cookies in your browser settings. Deleting auth cookies will sign you out.
Deleting `rentstar_cookie_consent` will show the banner again.

## 4. Third parties

Payment card data is handled by **Stripe** on Stripe-controlled pages/components; Stripe may
set its own cookies when you interact with Stripe Checkout or Connect. Those cookies are
governed by [Stripe’s cookie/privacy documentation](https://stripe.com/privacy). We do not
control Stripe’s cookies.

We do not currently inject other third-party marketing trackers.

## 5. International users

If you access RentStar from the EU/EEA/UK, this policy is intended to meet transparency and
consent expectations under the ePrivacy Directive (as implemented locally) and the GDPR’s
transparency principles for cookie-related processing described in our Privacy Policy.

## 6. Changes

We may update this Cookie Policy when our technologies change. The “Last updated” date at
the top will change. For material changes that introduce new non-essential cookies, we will
ask for consent again where required (for example by bumping the consent version).

## 7. Contact

Questions: **[PRIVACY EMAIL]** or **[SUPPORT EMAIL]**.
