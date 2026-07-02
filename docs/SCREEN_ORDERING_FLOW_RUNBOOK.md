# Screen Ordering Flow Runbook

## Purpose

This is the durable handoff document for the Helpful ACE Screen Ordering Flow. Future work should start here before changing the customer quote flow, staff portal, Worker API, email behavior, payment/status flow, vendor forms, or Helpful.Place integration.

The goal is to prevent future sessions from guessing or rebuilding project context from memory.

## Current phase

The project is in hardened beta / production-hardening. Stability matters more than architectural cleanup. Do not move working business rules just because they are hardcoded.

## Repository

```text
nnelson702/ScreenOrderingFlows
```

Main runtime files:

```text
index.html                         Customer SPA markup
styles.css                         Shared styling and layout
app.js                             Customer state, quote flow, pricing, delivery, hardware, crossbar, payload logic
hardware-tiles.js                  Hardware tile selector and Step 5 / Step 6 UI enhancements
staff.html                         Staff/admin portal
quote.html                         Quote view
vendor-forms.html                  Vendor form shell
vendor-window-form.html            Window form shell
vendor-window-form.js              Window production form logic
vendor-door-form.js                Patio door production form logic
vendor-pagination.js               Vendor form pagination
staff-vendor-forms.js              Staff vendor-form integration
staff-dashboard-v4-1-filters.js    Staff dashboard behavior
api/worker.js                      Core Worker API
api/worker-production.js           Durable production Worker entrypoint
api/wrangler.jsonc                 Worker deployment config
data/config.json                   Base config, with app.js applying approved overrides
_headers                           Cloudflare Pages headers
```

Important docs:

```text
docs/README.md
docs/ARCHITECTURE.md
docs/DATA_CONTRACT.md
docs/API_CONTRACT.md
docs/DEPLOYMENT.md
docs/CHANGE_CONTROL.md
docs/TROUBLESHOOTING.md
docs/TEST_MATRIX.md
docs/CONFIG_OWNERSHIP_PLAN.md
docs/STORE_BETA_TEST_CHECKLIST.md
docs/PRODUCTION_FORM_STATUS_AUDIT.md
docs/STORE_EMAIL_ROUTING_PROTOCOL.md
docs/RELEASE_REGRESSION_CHECKLIST.md
docs/CODING_EXECUTION_STANDARD.md
```

## Confirmed URLs

```text
Customer/internal quote flow: https://www.screens.helpful.place
Staff portal:                 https://www.screens.helpful.place/staff
```

Older references to `https://www.helpful.place/screens` or `/screensadmin` are historical unless deliberately restored.

## Non-negotiable business rules

### Delivery

Approved delivery rule:

```text
If the screen subtotal is at least $35 and the customer is within 15 miles of the selected store, delivery is available for $10.
```

Do not restore old graduated delivery logic.

Canonical values currently live in `app.js`:

```text
DELIVERY_FEE = 10
DELIVERY_MINIMUM_SUBTOTAL = 35
DELIVERY_RADIUS_MILES = 15
```

Pickup is always available.

### Pricing and tax

Pricing/tax logic currently lives in `app.js`. Do not change pricing tables, tax rate, rounding behavior, or quote-total logic unless explicitly requested and tested end to end.

Totals must match across:

```text
customer app
success screen
customer email
store email
staff portal
payment/status flow
production/vendor forms
```

### Store routing

Store emails route to the selected store inbox, not a corporate/user inbox. Wrong-store routing is critical.

Current store map:

```text
18228  SKYE-ACE Tropicana      ACE_18228@skyecos.com
18507  SKYE-ACE Horizon Ridge  ACE_18507@skyecos.com
18690  SKYE-ACE Rainbow        ACE_18690@Skyecos.com
19117  SKYE-ACE Green Valley   ACE_19117@Skyecos.com
```

Do not casually change store IDs, emails, names, addresses, phones, coordinates, or ZIP approximations.

## Current completed work

### Scroll-to-top

Page and step changes should place the user at the top of the new page/step. Do not remove this behavior.

### Hardware image tiles

Window hardware selection is now image-tile-first. The hidden/select-backed `#hardwareType` remains the canonical value source so existing hardware assignment logic continues to work.

Current hardware options:

```text
slide_leaf_spring     Slide Leaf Spring      SLS
standard_leaf_spring  Standard Leaf Spring   LS
pull_tab              Pull Tab               PT
bale_clip             Bale Clip              BC
tension_spring        Tension Spring         TS
plunger               Plunger                PL
```

Current repo-local image assets:

```text
assets/hardware/slide-leaf-spring.svg
assets/hardware/standard-leaf-spring.svg
assets/hardware/pulltab.svg
assets/hardware/bale-clip.svg
assets/hardware/tension-spring.svg
assets/hardware/plunger.svg
```

Do not reintroduce Google Drive image dependencies.

### Hardware layout

Step 5 / Hardware has been adjusted to fit the tiles, quantity, side selector, diagram, and Add Hardware button without clipping. Be careful when changing any of these IDs:

```text
#hardwareType
#hardwareQty
#hardwareSide
#btnAddHardware
#hardwareListSummary
#hardwareImagePreview
#hardwareDiagram
#windowOnlyFields
```

### Crossbar warning

The crossbar recommendation alert should fire when the user lands on Step 6, not after Save Screen.

Current warning text:

```text
This opening is large enough that we recommend a crossbar. You chose not to include one. Be aware this may cause some bowing in the middle.
```

If the user keeps No Crossbar selected, Save Screen should not show a second duplicate alert.

### Worker diagnostics cleanup

The temporary diagnostic Worker wrapper has been removed.

Current deployed Worker entrypoint in `api/wrangler.jsonc`:

```text
"main": "worker-production.js"
```

Current durable entrypoint:

```text
api/worker-production.js
```

Removed file:

```text
api/worker-diagnostics.js
```

`worker-production.js` delegates normal traffic to `worker.js` and handles required production guards for same-status lifecycle email behavior and vendor-packet status flow.

## Backend route overview

Core API routes live in `api/worker.js`:

```text
GET  /
GET  /health
POST /api/staff/login
POST /api/staff/logout
POST /api/staff/access/list
POST /api/staff/access/create
POST /api/staff/access/rotate
POST /api/staff/access/deactivate
POST /api/staff/access/reactivate
POST /api/quote/create
GET  /api/quote/view/:token
POST /api/quote/search
POST /api/quote/admin-view
GET  /api/vendor-packet/view/:token
POST /api/vendor-packet/mark-sent-to-vendor
POST /api/vendor-packet/send-to-store
POST /api/quote/status
POST /api/stripe/webhook
```

## Safe-change rules

Before changing customer flow, check whether the change affects:

```text
quote payload
pricing
delivery eligibility
tax
store routing
hardware details
crossbar details
patio door roller/handle details
success screen
emails
staff portal
production forms
```

If yes, use the release regression checklist.

Before changing backend/status/email behavior, review:

```text
api/worker-production.js
api/worker.js
docs/STORE_EMAIL_ROUTING_PROTOCOL.md
docs/PRODUCTION_FORM_STATUS_AUDIT.md
docs/RELEASE_REGRESSION_CHECKLIST.md
```

Before changing config/pricing/delivery ownership, review:

```text
docs/CONFIG_OWNERSHIP_PLAN.md
```

## Critical smoke tests

### Customer quote

1. Start a quote at `https://www.screens.helpful.place`.
2. Enter customer info.
3. Confirm selected store.
4. Add a window screen.
5. Add hardware from tile selector.
6. Handle crossbar recommendation if triggered.
7. Save screen.
8. Submit quote.
9. Confirm quote ID and totals.
10. Confirm customer/store emails.

### Hardware tiles

1. Add a window screen.
2. Go to Step 5 / Hardware.
3. Confirm all six tiles show images.
4. Select Standard Leaf Spring.
5. Confirm `LS` appears on diagram.
6. Save screen and confirm summary.

### Crossbar

1. Add a large enough window to trigger recommendation.
2. Go to Step 6.
3. Confirm warning fires on page entry.
4. Save screen.
5. Confirm no duplicate Save Screen warning.

### Delivery

1. Subtotal at least $35 and within 15 miles: delivery available for $10.
2. Subtotal below $35: delivery unavailable.
3. Outside 15 miles: delivery unavailable.

### Staff/status

1. Open `https://www.screens.helpful.place/staff`.
2. Submit test quote.
3. Confirm quote emails.
4. Mark In Production.
5. Click In Production again and confirm no duplicate lifecycle email.
6. Mark Ready.
7. Click Ready again and confirm no duplicate ready email.
8. Confirm vendor form path works.

## Defect severity

Critical defects stop release/use:

```text
app does not load
quote cannot submit
wrong store receives quote
store receives no quote email
totals mismatch
wrong delivery rule
production form missing build-critical data
payment/status movement fails
vendor form path fails
```

Major defects can continue only with a safe workaround:

```text
layout issue on one screen
confusing wording
data present but awkward to read
store can still confidently produce order
```

Minor defects can be queued:

```text
cosmetic spacing
label polish
small visual inconsistencies
helper text improvements
```

## Known fragile areas

- `index.html` is dense and awkward to patch.
- `app.js` is large and business-critical.
- `hardware-tiles.js` is production enhancement code, not throwaway code.
- Lifecycle emails must remain same-status idempotent.
- Hardware assets must remain repo-local.
- Store routing, pricing, delivery, and production forms are high-risk.

## What not to do casually

Do not casually:

```text
change delivery rules
change tax
change pricing tables
change store routing emails
change staff auth/session behavior
change vendor form generation
remove hardware-tiles.js
remove worker-production.js
restore worker-diagnostics.js as the deployed entrypoint
add GitHub Actions patch workflows for one-off edits
rewrite index.html or app.js wholesale
```

## Future improvement backlog

After beta feedback, reasonable future work includes:

1. Automated regression tests for quote totals, delivery eligibility, payload shape, and status idempotency.
2. Email template detail improvements if stores/customers need them.
3. Consolidating stable UI enhancements into core files if desired.
4. Top-admin config controls after ownership and validation rules are clear.
5. Staff portal usability improvements based on real store feedback.
6. Deployment/smoke-test documentation for Cloudflare Worker and Helpful.Place paths.

## Future assistant instructions

When assisting on this project later:

1. Read this runbook first.
2. Inspect current repo files before making claims.
3. Do not assume old chat context beats repo state.
4. Prefer contained, reversible changes.
5. Preserve approved business rules unless explicitly told otherwise.
6. Treat pricing, delivery, store routing, and production forms as high-risk.
7. Use GitHub directly when possible instead of asking the user to edit code.
8. If a connector action fails, refresh/retry before assuming permission is blocked.
9. For UI issues, test the exact screen and viewport reported.
10. For backend/status/email changes, test duplicate status updates and vendor form paths.

## Current checkpoint

As of this runbook:

```text
Scroll-to-top behavior: complete
Hardware image tiles: complete
Hardware layout: usable after spacing fixes
Crossbar warning timing: corrected
Worker diagnostics cleanup: complete
Production Worker entrypoint: api/worker-production.js
Temporary diagnostics wrapper: removed
Enterprise documentation buildout: complete
```

Future work should be driven by beta feedback, not speculative refactoring.
