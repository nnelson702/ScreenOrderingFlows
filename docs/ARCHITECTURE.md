# Architecture

## Purpose

This document explains how the Screen Ordering Flow is structured and where major responsibilities live.

It is intended for developers, contractors, future coding agents, and technical operators.

## Current architecture summary

The system is a static customer/staff application backed by a Cloudflare Worker API and persistent external services.

```text
Browser customer flow / staff portal
        |
        v
Static HTML/CSS/JS app
        |
        v
Cloudflare Worker API
        |
        +--> Supabase data storage
        +--> Stripe payment/webhook flow
        +--> Resend email delivery
        +--> Vendor/production form views
```

## Runtime entry points

### Customer/internal quote flow

Confirmed URL:

```text
https://www.screens.helpful.place
```

Primary files:

```text
index.html
styles.css
app.js
hardware-tiles.js
```

### Staff portal

Confirmed URL:

```text
https://www.screens.helpful.place/staff
```

Primary files:

```text
staff.html
staff-dashboard-v4-1-filters.js
staff-vendor-forms.js
```

### Worker API

Primary config:

```text
api/wrangler.jsonc
```

Current configured entrypoint:

```text
api/worker-production.js
```

Core API implementation:

```text
api/worker.js
```

`worker-production.js` exists to preserve production guards while delegating normal API behavior to `worker.js`.

## Frontend responsibilities

### `index.html`

Contains the customer/internal quote flow markup and screen-step structure.

High-risk because it is dense and many IDs are depended on by `app.js` and `hardware-tiles.js`.

### `app.js`

Owns the main browser application behavior:

```text
state management
customer form flow
screen item step routing
store selection
delivery eligibility
pricing and totals
quote payload assembly
hardware placement logic
crossbar logic
success screen rendering
API calls
```

Business-critical values currently live here by design during beta, including delivery constants, tax, store overrides, store coordinates, ZIP approximations, and pricing tables.

### `hardware-tiles.js`

Enhances the window hardware step after `app.js` loads.

Current responsibilities:

```text
render hardware image tiles
keep #hardwareType as canonical value source
add Standard Leaf Spring support
adjust Step 5 hardware layout
move crossbar warning to Step 6 entry
suppress duplicate crossbar warning on Save Screen
```

Do not treat this as disposable patch code. It is currently part of production behavior.

## Backend responsibilities

### `api/worker-production.js`

Production Worker entrypoint.

Responsibilities:

```text
delegate normal API traffic to worker.js
preserve same-status lifecycle email idempotency
preserve vendor-packet suppression behavior for in_production status updates
```

This replaced the temporary diagnostic wrapper. Do not restore `worker-diagnostics.js` as the deployed entrypoint.

### `api/worker.js`

Core Worker API.

Owns:

```text
quote creation
quote lookup
staff login/session behavior
staff search/admin view
status updates
customer/store emails
vendor packet links
vendor packet store send path
Stripe webhook handling
Supabase CRUD helpers
email template generation
```

## Data systems

### Supabase

Used for durable data such as:

```text
quotes
quote_items
staff_access_keys
staff_sessions
status and vendor packet state
```

Environment variables are referenced by name only in documentation. Do not commit secret values.

### Stripe

Used for customer payment path and webhook status updates.

### Resend

Used for customer/store/staff operational email delivery.

### Cloudflare

Likely hosts static/edge delivery and definitely hosts the Worker API path based on repo config.

### Helpful.Place / Squarespace / GoDaddy

Helpful.Place is the business web property and confirmed screen subdomain host/path context. Squarespace and GoDaddy are part of the broader website/domain/account context. Update deployment docs if the final static deployment host differs.

## Current status flow

Expected lifecycle:

```text
quote_created -> in_production -> ready -> completed
```

Duplicate same-status lifecycle updates should not resend lifecycle emails.

## Current production form path

Production/vendor forms are store/vendor handoff artifacts. They must match the quote record exactly.

Primary files:

```text
vendor-forms.html
vendor-window-form.html
vendor-window-form.js
vendor-door-form.js
vendor-pagination.js
staff-vendor-forms.js
```

## Current store-routing model

Quote-created store emails route to the selected store. Wrong-store routing is a critical defect.

Store routing currently depends on approved store data in `app.js` and backend email behavior in `api/worker.js`.

## Future affiliate architecture goal

Future-state only, not current behavior:

The platform may support affiliate-specific subdomain instances where an affiliate can use a branded version of the same screen quote tool for their own customers.

Future affiliate goals include:

```text
affiliate-specific subdomain
affiliate logo upload
affiliate color/theme controls
affiliate retail markup percentage above base retail
no negative markup
customer-facing quote branded for affiliate
affiliate-facing cost/invoice email showing affiliate cost and margin
platform/vendor fulfillment by Helpful/Skye operation
ACE branding removed or made agnostic for affiliate context
```

This future model should not be added to the current beta flow without a separate architecture plan, data model, pricing contract, brand isolation rules, and test matrix.

## High-risk areas

Treat these as high-risk:

```text
pricing
delivery eligibility
tax
store routing
status emails
payment/webhook behavior
vendor packet behavior
production forms
staff auth/session behavior
affiliate pricing/branding when introduced
```

## Architecture change rule

Any architecture change that affects high-risk areas must update:

```text
ARCHITECTURE.md
DATA_CONTRACT.md
API_CONTRACT.md
TEST_MATRIX.md
CHANGE_CONTROL.md
```

as applicable in the same change set.
