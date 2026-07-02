# Data Contract

## Purpose

This document defines the operational data contract for the Screen Ordering Flow.

The most important rule: the app, backend, emails, staff portal, and production/vendor forms must all represent the same quote truth.

## Contract scope

This contract covers:

```text
customer data
store data
fulfillment data
quote totals
window line items
patio door line items
hardware assignments
crossbar details
status fields
vendor packet fields
future affiliate fields
```

## Quote identity

Expected quote identity fields include:

```text
id
order_number
view_token
created_at
validity_expires_at
status
status_updated_at
```

`id` is the primary operational reference. Store users should document quote IDs when reporting defects.

## Customer fields

Expected customer fields:

```text
customer_name
customer_street
customer_city
customer_state
customer_zip
customer_phone
customer_email
```

Required for quote creation:

```text
customer_name
customer_email
```

Operationally required by the UI:

```text
name
phone
email
address/store selection context
```

## Store fields

Expected store fields:

```text
store_id
store_name
store_email
store_phone
store_address
```

Wrong store routing is a critical defect.

Current store IDs:

```text
18228
18507
18690
19117
```

## Fulfillment fields

Expected fulfillment fields:

```text
fulfillment_method
pickup_or_delivery
delivery_distance_miles
delivery_fee/delivery_cents
```

Current delivery rule:

```text
subtotal >= $35 and within 15 miles = $10 delivery available
```

Pickup remains available even when delivery is unavailable.

## Totals fields

Expected total fields:

```text
subtotal_cents
tax_cents
delivery_cents
total_cents
```

Totals must match across:

```text
quote screen
success screen
customer email
store email
staff portal
payment/status flow
production/vendor forms
```

Any mismatch is critical.

## Line item common fields

Expected fields for every line item:

```text
quote_id
sort_index
type or screen_type
qty
width_display
height_display
width_in_inches
height_in_inches
frame_type
frame_color
material_type
material_color
unit_price_cents
line_total_cents
```

Fractions must remain readable in display fields.

## Window screen fields

Window-specific fields:

```text
frame_cut_type
crossbar_needed
crossbar_type
crossbar_orientation
crossbar_distance
hardware_assignments
```

`crossbar_needed` should be boolean or normalized to a clear boolean-equivalent value in backend/form rendering.

## Hardware assignment fields

Hardware assignments should preserve:

```text
hardware_type
hardware_label
hardware_initials
quantity
side/location
placement/diagram coordinate data where applicable
```

The current UI keeps `#hardwareType` as the canonical selection field even though image tiles are user-facing.

Current hardware values:

```text
slide_leaf_spring
standard_leaf_spring
pull_tab
bale_clip
tension_spring
plunger
```

Current initials:

```text
SLS
LS
PT
BC
TS
PL
```

## Crossbar contract

Crossbar recommendation is based on large window openings.

Current UI behavior:

```text
If crossbar is recommended and No Crossbar is selected, the warning appears on Step 6 entry.
Save Screen should not show a duplicate warning after that.
```

If crossbar is selected, production forms must show enough information to build the screen:

```text
needed yes/no
type/size if provided
orientation
distance/location
```

## Patio door fields

Patio-door-specific fields:

```text
door_rollers or doorRollers
handle_orientation
handle_height_display
handle_height_in_inches
```

Production forms must preserve roller type, handle side/orientation, and handle height.

## Status fields

Expected statuses:

```text
quote_created
in_production
ready
completed
cancelled
expired
```

Expected timestamp fields as applicable:

```text
paid_at
ready_at
completed_at
cancelled_at
expired_at
status_updated_at
```

Same-status updates for lifecycle statuses should not resend duplicate lifecycle emails.

## Payment fields

Expected payment fields as applicable:

```text
payment_method
payment_url
stripe_session_id
stripe_payment_intent_id
pos_receipt_number
pos_notes
```

Stripe and in-store payment paths must preserve quote totals.

## Vendor packet fields

Expected vendor/production packet fields include:

```text
vendor_packet_status
vendor_packet_token_hash
vendor_packet_last_error
vendor_packet_opened_at
vendor_packet_opened_by
vendor_order_sent_to_vendor_at
vendor_order_sent_to_vendor_by
vendor_order_sent_to_vendor_method
vendor_order_sent_to_vendor_notes
```

Vendor packet status behavior is guarded by `api/worker-production.js` and `api/worker.js`.

## Future affiliate data model

Future-state only. Not current beta behavior.

Affiliate support will require additional data fields such as:

```text
affiliate_id
affiliate_name
affiliate_subdomain
affiliate_logo_url
affiliate_theme_settings
affiliate_retail_markup_percent
affiliate_cost_discount_percent
affiliate_customer_quote_branding
affiliate_cost_quote_recipient
affiliate_margin_percent
```

Rules for future affiliate pricing:

```text
affiliate retail markup may be positive only
no negative markup
customer-facing quote shows affiliate retail pricing
affiliate-facing email shows affiliate cost and margin
ACE branding must be removed or made agnostic in affiliate contexts
```

Affiliate data must be tenant-isolated before any affiliate version goes live.

## Data change rule

Any change to this contract must be tested against:

```text
customer quote submission
quote email
store email
staff portal
status update
vendor/production forms
```

If data appears in one surface but not another, document the reason or fix the drift.
