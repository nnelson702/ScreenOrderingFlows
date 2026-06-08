# Production Form and Status Transition Audit

## Purpose

This audit verifies that a screen quote remains consistent from initial quote creation through payment, production advancement, and generated production forms.

The purpose is not to test whether one button works. The purpose is to prove that the operational handoff remains accurate after the customer commits money and the store begins production.

## Scope

This audit applies to:

- Quote creation
- Payment link or paid status
- Paid status advancement
- Production status advancement
- Generated production forms
- Regenerated production forms
- Store-facing production packet

## Audit principle

A quote is valid for production only when the app, backend/admin record, customer email, store email, and production forms all reflect the same business truth.

Do not proceed with production if the generated form conflicts with the quote record.

## Status path to verify

The expected status path is:

```text
Quote created -> Paid -> Production
```

If completed or cancelled statuses are available, they should be verified separately after the paid/production path is stable.

## Required audit record

Record the following for each audit:

- Audit date
- Auditor
- Quote ID
- Customer name
- Selected store
- Fulfillment method
- Payment/paid confirmation source
- Production form generation timestamp
- Regenerated form timestamp, if applicable
- Pass/fail result
- Defects found

## Quote creation audit

After quote submission, confirm:

- [ ] Quote ID is generated.
- [ ] Backend/admin record exists.
- [ ] Customer name matches app submission.
- [ ] Customer phone matches app submission.
- [ ] Customer email matches app submission.
- [ ] Customer address matches app submission.
- [ ] Selected store matches app submission.
- [ ] Fulfillment method matches app submission.
- [ ] Line item count matches app submission.
- [ ] Quote totals match app dashboard.

## Payment or paid status audit

When payment is completed or the quote is advanced to paid, confirm:

- [ ] Paid status is visible in the backend/admin process.
- [ ] Quote ID did not change.
- [ ] Customer information did not change.
- [ ] Selected store did not change.
- [ ] Fulfillment method did not change.
- [ ] Line items did not change.
- [ ] Subtotal did not change.
- [ ] Tax did not change.
- [ ] Delivery fee did not change.
- [ ] Total did not change.

## Production status audit

When the quote is advanced to production, confirm:

- [ ] Production status is visible in the backend/admin process.
- [ ] Paid status remains historically clear.
- [ ] Quote ID did not change.
- [ ] Customer information did not change.
- [ ] Store information did not change.
- [ ] Line items did not change.
- [ ] Totals did not change.
- [ ] Store-facing packet is generated or available.

## Production form audit

For every generated production form, compare against the quote record.

### Header and identity

- [ ] Quote ID matches.
- [ ] Customer name matches.
- [ ] Customer phone matches.
- [ ] Customer email matches.
- [ ] Customer address matches.
- [ ] Selected store matches.
- [ ] Store phone/email are usable.
- [ ] Paid or production status is clear.

### Fulfillment

- [ ] Pickup or delivery status is clear.
- [ ] Delivery fee matches quote, if delivery was selected.
- [ ] Delivery address matches customer address, if delivery was selected.
- [ ] Pickup store is clear, if pickup was selected.

### Window line items

For each window screen line item, confirm:

- [ ] Sort/order number matches quote.
- [ ] Quantity matches quote.
- [ ] Width matches quote.
- [ ] Height matches quote.
- [ ] Fractions are preserved and readable.
- [ ] Frame profile matches quote.
- [ ] Frame color matches quote.
- [ ] Material type matches quote.
- [ ] Material color matches quote.
- [ ] Hardware type and quantity match quote.
- [ ] Hardware placement matches quote.
- [ ] Crossbar selection matches quote.
- [ ] Crossbar size matches quote, if applicable.
- [ ] Crossbar orientation matches quote, if applicable.
- [ ] Crossbar distance matches quote, if applicable.
- [ ] Line price matches quote.

### Patio door line items

For each patio door screen line item, confirm:

- [ ] Sort/order number matches quote.
- [ ] Quantity matches quote.
- [ ] Width matches quote.
- [ ] Height matches quote.
- [ ] Fractions are preserved and readable.
- [ ] Frame profile matches quote.
- [ ] Frame color matches quote.
- [ ] Material type matches quote.
- [ ] Material color matches quote.
- [ ] Roller type matches quote.
- [ ] Handle orientation matches quote.
- [ ] Handle height matches quote.
- [ ] Line price matches quote.

### Totals

Confirm:

- [ ] Subtotal matches quote.
- [ ] Tax matches quote.
- [ ] Delivery fee matches quote.
- [ ] Total matches quote.

## Regenerated form audit

If forms are regenerated after paid or production status, confirm:

- [ ] Regenerated form opens successfully.
- [ ] Regenerated form does not lose line item data.
- [ ] Regenerated form does not alter dimensions.
- [ ] Regenerated form does not alter hardware/crossbar/handle details.
- [ ] Regenerated form does not alter totals.
- [ ] Regenerated form reflects current status accurately.

## Failure handling

### Critical defects

Do not proceed with production if any of the following occur:

- Quote ID mismatch
- Wrong customer
- Wrong store
- Wrong dimensions
- Missing line item
- Wrong material or frame
- Wrong hardware/crossbar/handle details that affect production
- Wrong subtotal, tax, delivery, or total
- Paid/production status missing or wrong
- Production form fails to generate

Required action:

1. Stop production.
2. Document the quote ID and defect.
3. Capture screenshot or copied field values.
4. Open a GitHub issue.
5. Manually resolve the customer/store need only after the defect is documented.

### Major defects

Major defects do not necessarily block production if the store can still confidently produce the order, but they must be documented.

Examples:

- Formatting issue on production form
- Confusing label
- Data present but hard to read
- Duplicate non-critical field
- Store instruction unclear

### Minor defects

Minor defects can be queued.

Examples:

- Cosmetic spacing
- Non-operational wording improvement
- Small display inconsistency that does not affect production

## Required user action during beta

The business owner or assigned operator should run this audit against at least one real paid/production quote after this protocol is merged.

A stronger beta validation uses:

- One window-only quote
- One patio-door-only quote
- One mixed quote with both window and patio door screens
- One delivery quote
- One pickup quote

## Validation record template

```text
Date:
Auditor:
Quote ID:
Customer:
Selected store:
Fulfillment method:
Status path tested:
Production form generated:
Production form regenerated:

Quote creation audit result:
Paid status audit result:
Production status audit result:
Production form audit result:
Regenerated form audit result:

Critical defects:
Major defects:
Minor defects:

Production approved:
Notes:
```

## Operating principle

A paid screen order becomes operationally real when the production form is correct. Treat the generated form as the final handoff artifact, and audit it with the same seriousness as a vendor purchase order.
