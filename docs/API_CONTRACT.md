# API Contract

## Purpose

This document defines the operational API contract for the Screen Ordering Flow Worker.

Core implementation lives in:

```text
api/worker.js
```

Production entrypoint lives in:

```text
api/worker-production.js
```

## General rules

- Request and response bodies are JSON unless noted otherwise.
- Staff/admin routes require staff authentication unless explicitly public.
- Do not document or commit secret values.
- Email and vendor packet side effects are part of the API contract.
- Same-status lifecycle updates should not resend duplicate lifecycle emails.

## Public/service routes

### GET `/`

Purpose: health-style root response.

Expected response includes service identity and phase information.

### GET `/health`

Purpose: environment/diagnostic health route.

Expected response includes:

```text
ok
service
phase
env status summary
```

Should not expose secret values.

## Staff authentication routes

### POST `/api/staff/login`

Purpose: create a staff session from a valid access value.

Expected request fields may include:

```text
access_value
staff_access
passphrase
password
```

Expected response:

```text
ok
token
session
```

Side effects:

```text
creates staff_sessions record
updates staff_access_keys last_used_at
```

### POST `/api/staff/logout`

Purpose: revoke current staff session.

Auth required: yes.

Side effects:

```text
sets revoked_at on current staff session
```

### Staff access management routes

Routes:

```text
POST /api/staff/access/list
POST /api/staff/access/create
POST /api/staff/access/rotate
POST /api/staff/access/deactivate
POST /api/staff/access/reactivate
```

Purpose: top-admin staff access management.

Auth required: top admin.

Do not expose raw staff access values after creation.

## Quote creation

### POST `/api/quote/create`

Purpose: create a customer quote, quote line items, payment path, and quote emails.

Expected request groups:

```text
customer
store
fulfillment
totals
items
```

Required business inputs:

```text
customer.name
customer.email
store.name
store.email
at least one item
total > 0
```

Expected side effects:

```text
insert quote
insert quote_items
create payment URL when configured
send customer quote email
send selected-store quote email
```

Critical failure examples:

```text
missing customer name/email
missing store name/email
no items
total invalid
Supabase insert failure
email failure that blocks required operational email behavior
```

## Quote view/search/admin

### GET `/api/quote/view/:token`

Purpose: customer-facing quote lookup by view token.

Auth required: no.

Expected response includes quote and items if token is valid.

### POST `/api/quote/search`

Purpose: staff search/list quotes.

Auth required: staff.

Expected filters may include:

```text
search or term
status
store_id or store
fulfillment_method
limit
```

### POST `/api/quote/admin-view`

Purpose: staff/admin quote detail lookup by quote ID.

Auth required: staff.

Required request:

```text
quote_id
```

Expected response:

```text
ok
quote
items
```

## Vendor packet routes

### GET `/api/vendor-packet/view/:token`

Purpose: open the store/vendor production packet by token.

Auth required: token.

Allowed quote statuses should be operational production statuses such as:

```text
in_production
ready
completed
```

Side effects:

```text
may update vendor_packet_status to opened_by_store
may set vendor_packet_opened_at
may set vendor_packet_opened_by
```

### POST `/api/vendor-packet/mark-sent-to-vendor`

Purpose: staff marks vendor packet as sent to vendor.

Auth required: staff.

Required request:

```text
quote_id
```

Optional request:

```text
method
notes
```

Side effects:

```text
sets vendor_packet_status to sent_to_vendor
sets vendor_order_sent_to_vendor_at/by/method/notes
```

### POST `/api/vendor-packet/send-to-store`

Purpose: staff/admin sends or resends vendor packet link to store.

Auth required: staff.

Required request:

```text
quote_id
```

Side effects:

```text
sends store-facing vendor packet email
```

## Status update

### POST `/api/quote/status`

Purpose: move a quote through operational statuses.

Auth required: staff.

Required request:

```text
quote_id
status
```

Allowed statuses:

```text
in_production
ready
completed
cancelled
expired
```

Optional request fields:

```text
payment_method
pos_receipt_number
pos_notes
```

Expected side effects by status:

```text
in_production: sets payment fields / paid_at and sends paid-production lifecycle emails
ready: sets ready_at and sends ready lifecycle email
completed: sets completed_at and sends completed lifecycle email
cancelled: sets cancelled_at
expired: sets expired_at
```

Important production-entrypoint behavior:

```text
api/worker-production.js prevents duplicate lifecycle emails on repeated same-status updates for in_production, ready, and completed.
```

Do not remove this idempotency without replacing it with an equivalent core implementation.

## Stripe webhook

### POST `/api/stripe/webhook`

Purpose: process Stripe checkout/session webhook events.

Auth/security:

```text
Stripe-Signature header required
STRIPE_WEBHOOK_SECRET required
```

Expected side effects for completed checkout:

```text
moves quote to in_production
sets Stripe payment fields
sets paid_at/status_updated_at
sends paid-production lifecycle emails
may trigger vendor packet behavior when appropriate
```

## CORS expectations

The Worker should respond with allowed-origin headers based on configured allowed origins.

Current confirmed app URLs:

```text
https://www.screens.helpful.place
https://www.screens.helpful.place/staff
```

If CORS breaks after deployment or URL changes, check `api/wrangler.jsonc` vars and Worker CORS helpers.

## API change rule

Any API route change must document:

```text
request shape
response shape
auth expectations
side effects
email side effects
status/vendor packet effects
failure behavior
```

Then run the relevant test matrix sections before release.
