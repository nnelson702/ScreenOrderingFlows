# Pass 3 Production Validation — 2026-08-30

## Scope

Final validation pass after the SEO/crawlability work (Pass 1) and performance/conversion hardening (Pass 2) for the live customer flow at:

`https://screens.helpful.place`

This pass does not introduce new customer features. The purpose is to verify the deployed system, compare the implementation against the approved business rules, document residual manual-only checks, and avoid claiming checks that cannot be safely completed without creating a real customer transaction.

## Release posture

**Automated/static result: PASS — no critical defect identified.**

A single controlled end-to-end transaction is still required to close the operational checks that inherently create records, emails, payment/status changes, and production packets. Those checks are listed separately below and are not assumed passed.

## Production routing and deployment checks

Verified against the production Vercel deployment after Pass 2:

- `https://screens.helpful.place/` returns HTTP 200.
- `https://screens.helpful.place/staff` returns HTTP 200.
- `https://screens.helpful.place/quote` returns HTTP 200.
- `https://screens.helpful.place/api/health` returns HTTP 200 and the Worker health payload reports `ok: true`.
- `robots.txt`, `sitemap.xml`, and `llms.txt` remain present from Pass 1.
- `/staff`, `/quote`, and `/api/*` remain protected with `X-Robots-Tag: noindex, nofollow, noarchive`.
- The Vercel production deployment for the Pass 2 merge is READY.
- Vercel reported no runtime error clusters in the prior 24-hour window at validation time.

## Approved business-rule static verification

The current `app.js` implementation still contains the approved alpha business rules:

- Tax rate: `0.08375`.
- Delivery fee: `$10`.
- Delivery minimum screen subtotal: `$35`.
- Delivery radius: `15 miles`.
- Pickup remains the fallback when delivery is unavailable.
- Delivery fee is applied only when delivery is selected and the eligibility conditions are met.
- Window/door pricing uses the approved half-perimeter approach: width + height is rounded up, multiplied by the configured per-inch rate, and multiplied by quantity.
- Store auto-selection uses the customer ZIP-area coordinates and the configured store coordinates, while manual store override remains available.

No pricing, tax, delivery, store-selection, payload, Stripe, Supabase, email, vendor packet, staff-authentication, or status-transition logic was changed in Pass 3.

## Pass 2 regression review

The production source contains the Pass 2 hardening as intended:

- Customer form fields receive native autocomplete/input-mode hints.
- Mobile inputs/selects/buttons receive minimum 44px control height.
- Screen configuration retains the same step workflow while adding an accessible progress indicator.
- Quote submission is guarded while an existing submission is pending, preventing repeated clicks/taps from issuing another request through the wrapped handler.
- The submit button is restored after the existing handler resolves or throws.
- Hardware tile images retain lazy loading and now use asynchronous decoding.
- The draft line-item editor is removed from the critical startup path and requested on first Add Screen interaction, with a browser-idle fallback.
- The exact `/api/health` route is rewritten to the Worker's existing `/health` endpoint; the general `/api/:path*` proxy remains unchanged.

## Customer-flow static checks

Verified by source inspection against the release checklist:

- Landing page and `Get Started` navigation are wired.
- Customer form retains required name, address, city, state, ZIP, email, phone, and selected-store fields in markup.
- Customer submit opens the quote dashboard after state/store assignment.
- Window and patio-door paths remain separate and preserve their existing step counts.
- Window hardware selection, quantity, side placement, diagram rendering, crossbar recommendation, and crossbar details remain implemented.
- Patio-door roller, handle orientation, and handle-height fields remain implemented.
- Draft line items can still be edited and removed before quote submission.
- Quote submission still requires customer/store state, at least one line item, and measurement acknowledgement.
- Delivery validation is rechecked immediately before quote submission.
- Quote creation still posts to the existing `/api/quote/create` endpoint with the existing customer, store, fulfillment, totals, and item payload structure.
- Success rendering still uses the backend quote ID/payment URL returned by the existing API path.

## Staff and operational-path checks

Verified without mutating a live order:

- Staff page loads at the existing `/staff` path.
- Staff page continues to call the existing Worker staff login/search/admin-view/status endpoints.
- Customer quote page loads at the existing `/quote` path and remains noindex.
- Customer quote page continues to load quote data through `/api/quote/view/:token` on the Worker.
- Worker route definitions still expose staff login/logout, quote creation/view/search/admin-view, vendor packet view/actions, status update, and Stripe webhook paths.

## Checks intentionally not simulated

The following checks create or alter operational data and therefore were not fabricated during this pass:

1. Submit a new production quote and verify the generated quote ID.
2. Confirm customer quote email receipt and content.
3. Confirm selected-store email routing and confirm non-selected stores do not receive it.
4. Open the generated customer quote link using its real view token.
5. Complete an online payment or record an in-store payment.
6. Verify automatic/manual transition to `in_production` as applicable.
7. Verify production/vendor form generation and regeneration for the same real quote.
8. Mark vendor packet sent and verify workflow state.
9. Advance a real order to `ready` and `completed`.
10. Verify lifecycle emails and duplicate-email guards by attempting same-status updates.
11. Compare UI, customer email, staff/admin view, Stripe/payment amount, and production packet totals for the same real quote.

These are the only remaining Pass 3 checks that require a controlled real transaction or valid staff credentials/session. They should be performed on one intentionally created test order and documented with the quote ID.

## Recommended controlled production smoke test

Use one low-complexity test quote rather than multiple production records:

- Customer: clearly labeled internal test identity/email that can receive email.
- Store: one known store.
- Include one window screen and one patio door line if practical so both product paths are exercised.
- Use pickup unless delivery specifically needs to be revalidated.
- Record the dashboard subtotal, tax, delivery, and total before submit.
- Submit once; confirm duplicate clicks do not create a second quote.
- Confirm customer/store emails and quote ID.
- Validate the customer quote page.
- Use the normal approved payment/status pathway.
- Generate/regenerate the vendor packet and compare all line data/totals.
- Advance through ready/completed only if the test record can be safely closed without affecting reporting/work queues.

## Pass 3 release decision

**No code defect was found that justifies changing production business logic.**

The system remains live with the existing customer URLs and operational paths. Pass 3 is considered complete from a non-destructive engineering validation standpoint. The controlled transaction above is the final business-process certification step.