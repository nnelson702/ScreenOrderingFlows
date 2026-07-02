# Deployment

## Purpose

This document captures the known deployment and environment model for the Screen Ordering Flow.

Deployment facts must be kept current. If the live hosting path changes, update this document and `docs/README.md`.

## Confirmed live URLs

```text
Customer/internal quote flow: https://www.screens.helpful.place
Staff portal:                 https://www.screens.helpful.place/staff
```

Older references to `https://www.helpful.place/screens` or `/screensadmin` are historical unless intentionally restored.

## Known external systems

```text
GitHub                 source repo and documentation
Cloudflare Pages       likely static/edge hosting layer
Cloudflare Workers     API runtime indicated by api/wrangler.jsonc
Supabase               quote, item, staff, and status data
Stripe                 payment and webhook flow
Resend                 email sending
Helpful.Place          business web property and screen subdomain context
Squarespace            current business website context
GoDaddy                domain/DNS/vendor account context
```

The exact static hosting path should be verified before major deployment changes.

## Worker deployment config

Worker config file:

```text
api/wrangler.jsonc
```

Current configured Worker name:

```text
screen-ordering-api
```

Current configured entrypoint:

```text
worker-production.js
```

This points to:

```text
api/worker-production.js
```

Do not switch back to `worker-diagnostics.js`. That temporary wrapper was removed.

## Worker architecture

`api/worker-production.js` is the deployed entrypoint.

It delegates normal requests to:

```text
api/worker.js
```

It also preserves production guards for:

```text
same-status lifecycle email idempotency
in_production vendor packet suppression behavior
```

## Environment variables

Document variable names only. Do not commit values.

Known/expected Worker environment variables include:

```text
ALLOWED_ORIGINS
RESEND_FROM
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STAFF_SESSION_HOURS
```

Other keys may exist depending on current implementation. Inspect `api/worker.js` before changing Worker environment configuration.

## Allowed origins

Current `api/wrangler.jsonc` should be reviewed if the live frontend URL changes.

Confirmed URLs that may need CORS coverage:

```text
https://www.screens.helpful.place
https://www.screens.helpful.place/staff
```

If requests fail from the browser but work directly, inspect CORS first.

## Static app deployment

Primary static files:

```text
index.html
styles.css
app.js
hardware-tiles.js
staff.html
quote.html
vendor-forms.html
vendor-window-form.html
vendor-window-form.js
vendor-door-form.js
vendor-pagination.js
staff-vendor-forms.js
staff-dashboard-v4-1-filters.js
assets/
swatches/
```

The exact static hosting route should be verified in Cloudflare/Squarespace/GoDaddy before making DNS or host changes.

## Deployment checklist

Before deployment:

```text
confirm changed files
confirm no accidental pricing/delivery/tax/store-routing changes
review docs if behavior changed
run local syntax checks if available
```

After deployment:

```text
open https://www.screens.helpful.place
open https://www.screens.helpful.place/staff
submit a test quote
confirm customer email
confirm selected store email
mark In Production
repeat In Production and confirm no duplicate lifecycle email
mark Ready
repeat Ready and confirm no duplicate ready email
open vendor/production form path
```

## Rollback approach

If deployment breaks critical behavior:

1. Identify last known good commit.
2. Revert the breaking commit or restore prior deployment in the hosting platform.
3. Confirm app load, quote submit, store email routing, and staff status workflow.
4. Document the incident and affected commit.

Critical behavior includes:

```text
app loads
quote submits
store receives selected-store email
customer receives quote email
status update works
production/vendor form path works
pricing/delivery/totals remain correct
```

## Deployment change rule

Any change to hosting, domain, Worker entrypoint, CORS origins, DNS, or environment variables must update this file.
