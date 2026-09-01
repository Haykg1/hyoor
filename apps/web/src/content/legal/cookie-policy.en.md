# [WEBSITE NAME] — Cookie Policy

<!--
**DRAFT — NOT LEGAL ADVICE.** Must match actual cookies/storage in apps/web
(auth-cookies.ts, next-intl locale cookie, next-themes, zustand persist keys)
and the consent banner in components/cookies/.
-->

_Last updated: 02-08-2026_

This Cookie Policy explains how **[WEBSITE NAME]** (“we”) uses cookies and similar technologies
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

| Key / technology                                                 | Purpose                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Theme preference (`next-themes` / local storage)                 | Light / dark / system appearance                                                 |
| `hyoor-host-display-currency` (local storage)                    | Preferred display currency for prices                                            |
| Listing wizard draft (session storage)                           | Temporary draft while creating a listing                                         |
| AI search / host-calendar chat drafts (session or local storage) | Temporary chat UI state                                                          |
| Trip planner                                                     | Plans are stored on your account; generation progress is not kept in the browser |
| Minor UI flags (local storage)                                   | e.g. dismissing an in-app notice                                                 |

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

### 3.1 Managing cookies in your browser

Different browsers provide different methods to block and delete cookies used by websites.
You can change your browser settings at any time to block or delete cookies. Official
guides for the most common browsers:

- [Google Chrome](https://support.google.com/chrome/answer/95647)
- [Apple Safari](https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac)
- [Mozilla Firefox](https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox)
- [Microsoft Edge](https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09)

If you use any other browser, please check its official support documentation.

Note that deleting auth cookies will sign you out, and deleting `rentstar_cookie_consent`
will show the consent banner again. Blocking strictly necessary cookies may prevent parts
of the site (such as sign-in) from working.

## 4. Third parties

We do not currently inject third-party marketing trackers. Online card payment is not yet
available on [WEBSITE NAME]; if a third-party payment processor is introduced in the future,
this policy will be updated to describe any cookies it sets.

## 5. International users

If you access [WEBSITE NAME] from the EU/EEA/UK, this policy is intended to meet transparency and
consent expectations under the ePrivacy Directive (as implemented locally) and the GDPR’s
transparency principles for cookie-related processing described in our Privacy Policy.

## 6. Changes

We may update this Cookie Policy when our technologies change. The “Last updated” date at
the top will change. For material changes that introduce new non-essential cookies, we will
ask for consent again where required (for example by bumping the consent version).

## 7. Contact

Questions: **[PRIVACY EMAIL]** or **[SUPPORT EMAIL]**.
