# Backend Payload and Email Template Audit

## Purpose

This audit documents how quote data should stay aligned across the front end, backend record, customer email, store email, quote PDF, payment/status flow, and production forms.

The key distinction is simple:

- Payload capture means the app submitted the data.
- Backend persistence means the system stored the data.
- Template coverage means an email, PDF, or form displays the data.

A field can be captured correctly and still be missing from an email template.

## Current front-end payload groups

The front end submits the following groups to `/api/quote/create`:

- Customer
- Store
- Fulfillment
- Totals
- Items

## Required payload coverage

### Customer

- Name
- Street
- City
- State
- ZIP
- Phone
- Email

### Store

- Store ID
- Store name
- Store email
- Store phone
- Store address
- Store city
- Store state
- Store ZIP

### Fulfillment

- Pickup or delivery method
- Delivery distance
- Delivery fee
- Delivery minimum
- Delivery radius

### Totals

- Subtotal
- Delivery
- Tax
- Total

### Items

- Sort order
- Screen type
- Quantity
- Width
- Height
- Frame type
- Frame color
- Material type
- Material color
- Line total
- Frame cut type
- Crossbar fields
- Handle fields
- Roller type
- Hardware details

## Artifact coverage expectations

### Customer email

Customer emails should show enough information for the customer to confirm the order and payment path.

Required:

- Quote ID
- Status
- Customer information
- Selected store
- Quote totals
- Payment instructions or link
- Screen summary

Detailed production fields are optional in the customer email if the quote PDF or forms carry them correctly.

### Store email

Store emails should show enough information for the store to identify the customer, selected store, status, totals, and next action.

Recommended store email fields:

- Quote ID
- Status
- Customer information
- Selected store
- Pickup or delivery status
- Quote totals
- Screen summary
- Link or attachment for full quote or production forms

### Quote PDF or download view

The quote PDF should show the customer-facing quote clearly.

Expected:

- Quote ID
- Status
- Customer information
- Selected store
- Quote totals
- Pickup or delivery status
- Screen line items
- Payment action when unpaid

### Production forms

Production forms are the build artifact.

Required:

- Store/dealer information
- Customer/job name
- Quote or sales order ID
- Quantity
- Width
- Height
- Frame type and color
- Material type and color
- Hardware detail
- Crossbar or spreader bar detail, when applicable
- Roller detail, when applicable
- Handle placement, when applicable
- Drawing or placement reference

## Beta observation

A real quote path was reviewed during beta.

Observed:

- Totals stayed consistent across app, emails, PDF view, and production forms.
- Delivery fee and delivery status were represented in the quote flow.
- Screen Fab forms carried production-critical build details.
- Email line item tables appeared more summary-level than the production forms.

Current conclusion:

This is not a production blocker if the Screen Fab forms remain correct. It should be treated as a template coverage review item.

## Audit checklist

For each test quote, compare:

- App dashboard
- Success screen
- Backend/admin record
- Customer email
- Store email
- Quote PDF/download view
- Paid or production email
- Generated production forms

Confirm:

- Quote ID matches.
- Status is correct.
- Customer fields match.
- Store fields match.
- Pickup or delivery status matches.
- Subtotal matches.
- Tax matches.
- Delivery matches.
- Total matches.
- Window item details reach the production form.
- Patio door item details reach the production form.
- Payment link behavior is correct.

## Defect severity

### Critical

Blocks production or trust.

Examples:

- Wrong customer
- Wrong store
- Wrong total
- Wrong production form data
- Missing production-critical details from production forms

### Major

Should be fixed during beta.

Examples:

- Store email lacks helpful detail but production form is correct
- Customer email summary is too thin
- Delivery status appears inconsistently
- Status wording is unclear

### Minor

Can be queued.

Examples:

- Cosmetic formatting
- Non-critical wording improvement
- Minor layout issue

## Required user action

During beta, keep at least one full quote example for audit:

- Dashboard
- Success screen
- Customer email
- Quote PDF/download view
- Paid or production email
- Window production form, if applicable
- Patio door production form, if applicable

Open a specific issue for any mismatch between these artifacts.

## Operating principle

Do not confuse data capture with data display. Audit the full chain before changing code.
