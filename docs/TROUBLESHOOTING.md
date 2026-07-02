# Troubleshooting

## Purpose

This document provides a practical debugging guide for common Screen Ordering Flow failures.

Use this before changing code during an incident.

## First response checklist

When an issue is reported, capture:

```text
quote ID if available
customer name if available
store selected
browser/device
URL used
screenshot
exact step where issue occurred
expected behavior
actual behavior
time of issue
```

Then classify severity:

```text
critical: blocks quote, payment, store routing, production, or correct totals
major: workaround exists but operational confidence is reduced
minor: cosmetic or wording issue
```

## App does not load

Likely areas:

```text
static hosting
DNS/subdomain
index.html
_headers
JavaScript syntax error
missing asset
```

Check:

```text
open https://www.screens.helpful.place
browser console
network tab for 404/500 files
recent commits to index.html, app.js, hardware-tiles.js, styles.css
```

Safe fixes:

```text
revert recent frontend commit
restore missing file
fix syntax error
rollback static deployment
```

## Quote will not submit

Likely areas:

```text
app.js payload assembly
API_BASE_URL
Cloudflare Worker availability
CORS
Supabase insert
Stripe setup
required customer/store/item fields
```

Check:

```text
browser network request to /api/quote/create
response body
Worker /health route
api/worker.js createQuote behavior
api/wrangler.jsonc allowed origins
Supabase environment variables
```

Critical if real customer quote is blocked.

## Customer email missing

Likely areas:

```text
Resend config
customer email field
createQuote email send path
spam/junk
email template failure
```

Check:

```text
quote created successfully?
customer email in quote record correct?
Resend logs if available
api/worker.js customer email functions
```

Do not assume store email failed just because customer email failed. Test separately.

## Store email missing

Likely areas:

```text
selected store email
store routing payload
Resend delivery
store spam/junk/filter
backend store email template
```

Check:

```text
selected store in app summary
store_email in quote record
store email in backend email send payload
Resend logs if available
STORE_EMAIL_ROUTING_PROTOCOL.md
```

Critical if selected store cannot receive operational quote.

## Wrong store receives quote

Severity: critical.

Likely areas:

```text
store auto-selection
manual store override
store payload assembly
backend email recipient selection
store override data in app.js
```

Check:

```text
customer address/ZIP
selected store shown before submit
quote record store_id/store_email
email recipient
recent changes to app.js store logic
```

Required action:

```text
stop relying on affected quote path
record quote ID
open/fix issue before broader use
```

## Delivery option wrong

Current rule:

```text
subtotal >= $35 and within 15 miles of selected store = $10 delivery available
```

Likely areas:

```text
DELIVERY_FEE
DELIVERY_MINIMUM_SUBTOTAL
DELIVERY_RADIUS_MILES
store coordinates
ZIP approximations
fulfillment UI
quote totals
```

Check:

```text
app.js delivery constants
selected store
customer ZIP/address
subtotal before tax/delivery
summary totals
```

Critical if customer is promised wrong fee or delivery availability.

## Totals mismatch

Severity: critical.

Likely areas:

```text
pricing table
rounding
quantity
delivery fee
tax rate
line item serialization
backend stored totals
email rendering
production form rendering
```

Check all surfaces:

```text
customer quote summary
success screen
customer email
store email
staff portal
production/vendor forms
```

Do not proceed with production if totals conflict.

## Hardware tile issue

Likely areas:

```text
hardware-tiles.js
assets/hardware/*.svg
#hardwareType hidden canonical select
#hardwareQty
#hardwareSide
#hardwareDiagram
styles.css overrides
```

Check:

```text
all six tile images load
selected tile state changes
diagram shows correct initials
line item summary preserves hardware
production form shows hardware
```

If image is broken, verify repo-local asset path first.

## Crossbar warning issue

Expected behavior:

```text
large opening triggers recommendation
warning appears when user lands on Step 6
Save Screen does not show a duplicate warning if already shown
```

Likely areas:

```text
app.js evaluateCrossbarRecommendation
hardware-tiles.js Step 6 warning enhancement
#crossbarNeeded
#crossbarLabel
#crossbarHelper
```

Check:

```text
screen dimensions over recommendation threshold
Step 6 active state
crossbar select value
warning timing
saved line item crossbar fields
```

## Staff portal login fails

Likely areas:

```text
staff access value
staff_sessions
staff_access_keys
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
session expiration
staff auth route
```

Check:

```text
POST /api/staff/login response
staff access active status
session expiration settings
browser local/session storage if applicable
```

## Status update fails

Likely areas:

```text
staff auth
quote_id
status value
api/worker-production.js
api/worker.js updateQuoteStatus
Supabase patch
email side effect
```

Check:

```text
POST /api/quote/status response
current quote status
staff session validity
valid status list
Worker logs if available
```

## Duplicate lifecycle emails

Expected behavior:

```text
repeating in_production, ready, or completed should not resend duplicate lifecycle emails
```

Likely areas:

```text
api/worker-production.js same-status guard
api/worker.js updateQuoteStatus
Stripe webhook path for in_production
```

Check:

```text
current quote status before update
repeated status click behavior
email logs
recent Worker entrypoint changes
api/wrangler.jsonc main value
```

`api/wrangler.jsonc` should point to:

```text
worker-production.js
```

## Vendor form or packet broken

Likely areas:

```text
vendor packet token/status
vendor packet view route
vendor form JS files
production form data contract
staff-vendor-forms.js
```

Check:

```text
quote status is operational status
vendor_packet_status
vendor packet link
GET /api/vendor-packet/view/:token
vendor form browser console
line item data on form
```

Critical if store/vendor cannot build the order.

## Payment or Stripe issue

Likely areas:

```text
Stripe secret key
Stripe webhook secret
checkout session metadata
payment_url
webhook signature
status transition from webhook
```

Check:

```text
payment URL present
Stripe checkout completes
webhook response
quote status after payment
paid_at
stripe_session_id
stripe_payment_intent_id
```

## CORS / API blocked from browser

Likely areas:

```text
ALLOWED_ORIGINS
api/wrangler.jsonc
Worker CORS helper
frontend domain change
```

Check:

```text
browser network CORS error
Origin header
allowed origins configured
confirmed live URLs
```

## Future affiliate issue class

Affiliate behavior is future-state only. If affiliate work begins, new troubleshooting sections must be added for:

```text
tenant/subdomain resolution
affiliate branding
affiliate markup percent
affiliate cost quote
customer-facing affiliate retail quote
logo/theme isolation
ACE branding removal
```

## Escalation rule

Escalate immediately if issue involves:

```text
wrong price
wrong tax
wrong delivery promise
wrong store email
missing store email
customer payment failure
production form wrong build data
duplicate customer-facing lifecycle emails
security/auth leak
```
