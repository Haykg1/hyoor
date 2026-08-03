# RentStar — Terms of Service

<!--
**DRAFT — NOT LEGAL ADVICE.** This document was drafted to match the actual behavior of the
RentStar platform as implemented in code. It must be reviewed and adapted by a qualified
lawyer (Armenian law + data-protection counsel) before publication. Items in
`[SQUARE BRACKETS]` are placeholders that must be filled in.
Locale files: terms-of-service.{en,hy,ru}.md — keep all three aligned.
-->

_Last updated: [DATE]_

## 1. Who we are

RentStar ("**RentStar**", "**we**", "**us**") is operated by **[LEGAL ENTITY NAME]**, a company
registered in the Republic of Armenia under registration number **[REG NUMBER]**, with its
registered address at **[ADDRESS]**. You can contact us at **[SUPPORT EMAIL]**.

RentStar is an online marketplace that connects people who offer short-term accommodation
("**Hosts**") with people seeking to book it ("**Guests**"). RentStar is **not** a party to the
rental agreement between Guest and Host: we provide the platform, booking tools, and payment
processing, but the accommodation itself is provided by the Host.

## 2. Acceptance and eligibility

By creating an account or using RentStar you agree to these Terms and to our
[Privacy Policy](/privacy). You must be at least 18 years old and able to enter
binding contracts. If you register on behalf of a company, you confirm you are authorized to
bind that company.

## 3. Accounts

- You must provide accurate information and keep it up to date. Your email address must be
  verified before you can use booking features.
- You are responsible for activity under your account and for keeping your credentials secure.
  Notify us immediately at [SUPPORT EMAIL] if you suspect unauthorized use.
- You may sign in with a password or via Google or Apple single sign-on.
- We may suspend or deactivate accounts that violate these Terms, applicable law, or the
  safety of other users. Hosts' listings may likewise be suspended pending review.

## 4. Host obligations

- Hosts must have the legal right to rent out each listed property and are responsible for
  compliance with all applicable laws, including local registration, tax, and safety
  requirements.
- Listings must be accurate: photos, description, amenities, house rules, pricing, cleaning
  fees, security-deposit rules, and cancellation policy must reflect reality. New listings may
  be subject to review by RentStar before becoming publicly visible.
- Hosts set their own nightly prices, seasonal pricing, cleaning fees, security-deposit
  amounts, and cancellation policy within the options the platform provides.
- Hosts must honor confirmed bookings. Repeated Host cancellations may lead to penalties,
  reduced visibility, or suspension.
- To receive payouts, Hosts must complete onboarding with our payment provider (Stripe
  Connect), which includes identity verification required by Stripe and applicable law.

## 5. Bookings

- A booking request reserves the dates once payment is authorized (see Section 6). Bookings
  proceed through statuses including awaiting payment, pending, confirmed, completed,
  cancelled, or expired.
- If payment is not completed within the payment window shown at checkout (currently
  approximately **15 minutes**), the reservation lock expires and the dates are released.
- The total price shown at checkout includes the rent for the stay, any cleaning fee, and any
  refundable security deposit, in the listing's currency. Prices displayed in other currencies
  are **estimates for convenience only**, based on third-party exchange rates; you are charged
  in the listing's currency.
- The Guest's contract for the stay is with the Host. House rules shown on the listing form
  part of that contract.

## 6. Payments, deposits, and payouts

- Card payments are processed by **Stripe**. RentStar does not store your card details.
- **Authorization at booking:** when you book with a card, RentStar places an authorization
  hold on your card for the rent (and a separate hold for the security deposit, if the listing
  requires one). No money is captured at this point.
- **Capture at check-in:** the rent is captured (charged) on or around the check-in day.
- **Security deposit:** the deposit is a hold, not a charge. After checkout it is
  automatically released, unless the Host submits a damage claim within the claim window
  (currently **[48] hours** after checkout). Claims are reviewed by RentStar; if a claim is
  approved, the approved amount (up to the deposit) is charged and the remainder released; if
  declined, the full hold is released. Guests are notified of the outcome by email and in-app.
- **Cash payment:** where offered, Guests may select payment in cash to the Host at check-in.
  For cash bookings, RentStar does not process the payment, and any deposit arrangements are
  handled directly between Guest and Host.
- **Host payouts:** payouts are made to the Host's connected Stripe account after check-in,
  subject to a processing delay (currently approximately **[24] hours**) and to Stripe's own
  settlement times. RentStar deducts a platform service fee (Section 7) before payout.
- If a card authorization or capture fails, we may retry, ask you to provide another payment
  method, or cancel the booking.

## 7. RentStar service fee

RentStar charges Hosts a platform service fee as a percentage of the booking value (the
default fee is **[10]%**; the applicable rate is shown to the Host and may be individually
agreed). The fee is deducted automatically from the amounts paid out to the Host. RentStar
may change the default fee prospectively with **[30] days'** notice; changes do not affect
already-confirmed bookings.

## 8. Cancellations and refunds

A guest-facing summary of this section is also published as our
[Cancellation & Refund Policy](/cancellation).

Each Host sets the cancellation terms for their own listing. Every listing displays, before
you book: the policy type, the cancellation deadline (a number of days before check-in), and
the cancellation fee chosen by the Host (a percentage of the stay subtotal up to 50%, or a
fixed amount — which may be zero). The **stay subtotal** is the accommodation price plus any
cleaning fee, and never includes the security deposit.

- **Flexible / Moderate / Strict:** the Guest may cancel through the platform at any time
  **before the listing's cancellation deadline**. On cancellation, the listing's cancellation
  fee (calculated on the stay subtotal — accommodation plus any cleaning fee — and never on
  the security deposit) is retained and the remainder of the stay payment is released or
  refunded. If the Host has set the fee to zero, the full stay payment is released.
- **After the deadline has passed, self-service cancellation is no longer available.**
  Contact the Host through platform messaging or [SUPPORT EMAIL]; the Host may agree to
  cancel the booking on your behalf.
- **Non-refundable:** the Guest cannot cancel through the platform. Contact the Host or
  [SUPPORT EMAIL] for exceptional circumstances.
- **In every cancellation case the security-deposit hold is released in full.** The deposit is
  never used to pay cancellation fees.
- Refunds of captured amounts are returned to the original payment method; release of an
  authorization hold typically appears within a few business days depending on your bank.
- **Host cancellations:** if a Host cancels a confirmed booking on their own initiative, the
  Guest receives a full refund (stay payment and deposit hold released in full). Where the Host
  cancels at the Guest's request after the Guest's own cancellation window has closed, the
  listing's cancellation fee may be applied as if the Guest had cancelled.
- Bookings can only be cancelled before check-in. The exact fee and refund amounts are always
  shown to you before you confirm a cancellation.

## 9. Messaging, reviews, and content

- Guests and Hosts may communicate through on-platform messaging. Do not use messaging to
  circumvent the platform (e.g. moving confirmed bookings off-platform to avoid fees), to
  harass, or to send spam.
- After a stay, Guests may review properties and Hosts may review Guests. Reviews must be
  honest, based on a genuine stay, and free of unlawful or abusive content. We may remove
  reviews that violate these rules; we do not otherwise edit reviews.
- You retain ownership of content you upload (photos, descriptions, reviews, messages) and
  grant RentStar a non-exclusive, worldwide, royalty-free license to host, display, and
  reproduce it for operating and promoting the platform.
- You must not upload content that infringes third-party rights or applicable law.

## 10. Prohibited conduct

You must not: (a) use the platform for unlawful purposes; (b) list a property you have no
right to rent; (c) make fraudulent bookings or damage claims; (d) misuse the AI search or any
other feature to abuse, overload, or probe the platform; (e) scrape or harvest data; (f)
attempt to access other users' accounts or non-public areas of the systems; (g) circumvent
fees or payment flows.

## 11. Damage claims and disputes between Guests and Hosts

- Host damage claims against a security deposit must be submitted within the claim window
  with a description and supporting evidence. RentStar reviews claims in good faith and its
  decision on the deposit disposition is administrative, not a legal judgment.
- Either party remains free to pursue remaining claims against the other directly; RentStar
  is not liable for damage to property or for Guest or Host behavior.

## 12. Our role and liability

- RentStar provides the platform "as is". We do not own, manage, or inspect properties and do
  not guarantee the accuracy of listings, the conduct of users, or uninterrupted availability
  of the service.
- To the maximum extent permitted by applicable law, RentStar's aggregate liability arising
  out of the platform is limited to the greater of (a) the total service fees we earned from
  the bookings giving rise to the claim, or (b) **[AMOUNT] AMD**. Nothing in these Terms
  limits liability that cannot be limited under applicable law (including for intent or gross
  negligence, or death/personal injury).
- RentStar is not liable for the acts or omissions of payment providers, banks, or other
  third-party services, though we will reasonably assist in resolving issues.

## 13. Termination

You may stop using RentStar and request account closure at any time via [SUPPORT EMAIL] or
your account settings. Confirmed future bookings must first be resolved (completed or
cancelled under Section 8). We may terminate or suspend accounts for material breach of these
Terms. Sections that by their nature survive (payments owed, content licenses, liability,
disputes) survive termination.

## 14. Changes to these Terms

We may update these Terms. For material changes we will give at least **[15] days'** notice
by email or in-app notification. Continued use after the effective date constitutes
acceptance; if you do not agree, stop using the platform and close your account.

## 15. Governing law and disputes

These Terms are governed by the laws of the Republic of Armenia. Disputes shall be resolved
by the competent courts of **[Yerevan, Armenia]**, unless mandatory consumer-protection rules
of your country of residence provide otherwise. Consumers may also have the right to turn to
local consumer-protection authorities.

## 16. Contact

**[LEGAL ENTITY NAME]** — [ADDRESS] — [SUPPORT EMAIL] — [PHONE]
