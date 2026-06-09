# Store Beta Test Checklist

## Purpose

Use this checklist to validate the Screen Ordering Flow before and during beta rollout.

This checklist is written for store managers and operators. It is not a developer checklist.

The goal is to confirm that a store can receive, review, collect payment for, and move a screen quote through production without extra corporate handholding.

## Beta URLs

During beta, the intended company website paths are:

- Customer quote flow: `https://www.helpful.place/screens`
- Staff portal: `https://www.helpful.place/screensadmin`

These pages may be hidden from public site navigation during beta. Hidden pages are not full access control. Staff portal access still depends on the staff access gate.

## Manager responsibilities

Managers should confirm that:

- The customer quote flow works for their store.
- Store email routing works for their store.
- Staff portal access works for authorized users.
- Status updates are handled correctly.
- Production forms are usable before production begins.
- Defects are reported with quote ID and screenshots.

## Stop-and-escalate rules

Stop and escalate if any of the following occur:

- Quote will not submit.
- Wrong store receives the quote.
- Store does not receive the quote email.
- Payment or status update fails.
- Production form does not generate.
- Production form has wrong dimensions, material, hardware, crossbar, roller, or handle details.
- Totals differ between app, email, PDF, dashboard, or forms.

## Test record

Record this information for every beta test:

```text
Date:
Tester:
Store:
Customer name used:
Quote ID:
Pickup or delivery:
Window screen tested:
Patio door tested:
Payment/status path tested:
Result:
Issues found:
```

## 1. Access check

### Customer quote page

- [ ] Open `https://www.helpful.place/screens`.
- [ ] Confirm the screen quote tool loads.
- [ ] Confirm the page is usable on desktop.
- [ ] Confirm the page is usable on mobile.
- [ ] Confirm the page is not linked from public navigation during beta.

### Staff portal

- [ ] Open `https://www.helpful.place/screensadmin`.
- [ ] Confirm the staff portal loads.
- [ ] Enter the staff access value.
- [ ] Confirm dashboard opens.
- [ ] Confirm Lock works.
- [ ] Confirm Sign Out works.
- [ ] Confirm access value is not shared with unauthorized staff.

## 2. Customer quote flow test

Create one test quote for the store.

- [ ] Enter customer name.
- [ ] Enter customer phone.
- [ ] Enter customer email.
- [ ] Enter customer address.
- [ ] Confirm selected store is correct.
- [ ] Manually override store if needed.
- [ ] Confirm pickup option works.
- [ ] Confirm delivery option appears only when eligible.
- [ ] Confirm delivery fee is `$10` when delivery is selected.

## 3. Window screen item test

Add a window screen.

- [ ] Select window screen type.
- [ ] Enter quantity.
- [ ] Enter width.
- [ ] Enter height.
- [ ] Select frame profile.
- [ ] Select frame color.
- [ ] Select material.
- [ ] Select material color.
- [ ] Select hardware.
- [ ] Confirm hardware placement.
- [ ] Confirm crossbar/spreader detail, if applicable.
- [ ] Save screen.
- [ ] Confirm line item appears on quote summary.
- [ ] Confirm line price appears reasonable.

## 4. Patio door item test

Add a patio door screen.

- [ ] Select patio door type.
- [ ] Enter quantity.
- [ ] Enter width.
- [ ] Enter height.
- [ ] Select frame type.
- [ ] Select frame color.
- [ ] Select material.
- [ ] Select material color.
- [ ] Select roller type.
- [ ] Select handle placement.
- [ ] Enter handle height.
- [ ] Save screen.
- [ ] Confirm line item appears on quote summary.
- [ ] Confirm line price appears reasonable.

## 5. Quote summary test

Before submitting the quote, confirm:

- [ ] Customer information is correct.
- [ ] Store is correct.
- [ ] Pickup or delivery status is correct.
- [ ] Screen line items are correct.
- [ ] Subtotal is present.
- [ ] Tax is present.
- [ ] Delivery fee is correct.
- [ ] Total is correct.
- [ ] Measurement acknowledgement is checked before submit.

## 6. Submit quote test

- [ ] Submit quote.
- [ ] Confirm success screen appears.
- [ ] Record Quote ID.
- [ ] Confirm customer information is correct on success screen.
- [ ] Confirm store information is correct on success screen.
- [ ] Confirm totals match quote summary.
- [ ] Confirm payment link or payment instruction appears.

## 7. Email routing test

After quote submit:

- [ ] Customer quote email is received.
- [ ] Store quote email is received by selected store.
- [ ] Wrong store does not receive the quote email.
- [ ] Quote ID matches.
- [ ] Customer information matches.
- [ ] Store information matches.
- [ ] Totals match.
- [ ] Payment instruction/link is clear.

## 8. Staff portal search test

In the staff portal:

- [ ] Click Load Recent.
- [ ] Confirm recent quotes load.
- [ ] Search by customer name.
- [ ] Search by phone.
- [ ] Search by quote ID.
- [ ] Use status filter.
- [ ] Use store filter.
- [ ] Confirm result row shows created date, customer, phone, store, status, and total.
- [ ] Click the test quote row.
- [ ] Confirm selected order detail loads.

## 9. Selected order review

In selected order detail, confirm:

- [ ] Customer information is correct.
- [ ] Store information is correct.
- [ ] Status is correct.
- [ ] Total is correct.
- [ ] Fulfillment method is correct.
- [ ] Payment information is clear.
- [ ] Quote PDF link opens.
- [ ] Line items are visible.
- [ ] Width and height are correct.
- [ ] Frame and material are correct.

## 10. Status workflow test

Only run this on a real or approved test quote.

### Mark paid / in-production

- [ ] Select quote.
- [ ] Click Mark Paid / In-Production.
- [ ] Enter POS receipt or transaction number when required.
- [ ] Add staff notes if useful.
- [ ] Update status.
- [ ] Confirm status changes to In-Production.
- [ ] Confirm store/customer paid or production email sends as expected.

### Mark ready

- [ ] Confirm production/vendor work is complete before marking ready.
- [ ] Click Mark Ready.
- [ ] Confirm status changes to Ready.
- [ ] Confirm ready email sends as expected.

### Mark completed

- [ ] Confirm order has been transferred to customer.
- [ ] Click Mark Completed.
- [ ] Confirm status changes to Completed.

### Cancel or expire

- [ ] Do not cancel or expire unless intentional.
- [ ] Add staff notes explaining why.
- [ ] Escalate if unsure.

## 11. Production form test

After paid/in-production status:

- [ ] Confirm production forms generate.
- [ ] Confirm window form is usable, if window screen was ordered.
- [ ] Confirm patio door form is usable, if patio door screen was ordered.
- [ ] Confirm quote ID or sales order reference appears.
- [ ] Confirm dealer/store information appears.
- [ ] Confirm customer/job name appears.
- [ ] Confirm quantity matches.
- [ ] Confirm width and height match.
- [ ] Confirm material matches.
- [ ] Confirm frame matches.
- [ ] Confirm hardware details match.
- [ ] Confirm crossbar/spreader details match, if applicable.
- [ ] Confirm roller details match, if applicable.
- [ ] Confirm handle placement matches, if applicable.
- [ ] Confirm forms are readable enough for production.

## 12. Final beta pass/fail

A store beta test passes only when:

- [ ] Quote flow works.
- [ ] Store routing works.
- [ ] Customer email works.
- [ ] Staff portal access works.
- [ ] Staff portal search works.
- [ ] Selected order details are usable.
- [ ] Status workflow works.
- [ ] Production forms are usable.
- [ ] Defects, if any, are documented.

## Defect reporting format

Use this format when reporting an issue:

```text
Quote ID:
Store:
Status:
Customer name:
What was expected:
What happened:
Screenshot attached:
Urgency: Critical / Major / Minor
```

## Severity guide

### Critical

Stop beta use for that path until fixed.

Examples:

- Wrong store routing
- Quote submit failure
- Wrong total
- Wrong production form details
- Staff portal cannot update status

### Major

Can continue with caution if workaround is clear.

Examples:

- Email lacks helpful detail but forms are correct
- Status wording is confusing
- Search result is hard to interpret

### Minor

Can be queued.

Examples:

- Cosmetic layout issue
- Wording polish
- Non-blocking display issue

## Operating principle

The store does not need to understand the code. The store needs to verify that the quote, payment/status workflow, emails, and production forms allow them to serve the customer correctly with fewer manual touches.
