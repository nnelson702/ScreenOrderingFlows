# Store Email Routing Protocol

## Purpose

This protocol defines how store-routed screen quote emails and production packets should be handled during beta.

The goal is simple: the selected store must receive the correct packet, understand the required action, and own the customer handoff without depending on corporate inbox forwarding.

## Scope

This applies to:

- New screen quote emails
- Paid quote notifications
- Production packet emails
- Regenerated production forms
- Any store-facing screen order handoff

## Store ownership map

| Store ID | Store | Store path |
|---|---|---|
| 18228 | Tropicana | Tropicana inbox |
| 18507 | Horizon Ridge | Horizon Ridge inbox |
| 18690 | Rainbow | Rainbow inbox |
| 19117 | Green Valley | Green Valley inbox |

The selected store in the quote must determine the receiving store inbox.

## Required store action when a quote email arrives

When a quote email arrives, the receiving store owns the next operational step.

The store should:

1. Confirm the quote belongs to their store.
2. Review customer name, phone, email, and address.
3. Review screen line items.
4. Review pickup or delivery status.
5. Review subtotal, tax, delivery, and total.
6. Contact the customer if clarification is needed.
7. Hold the quote until payment or customer follow-up occurs.

## Required store action when a paid or production packet arrives

When a paid/production packet arrives, the receiving store should treat it as an active order handoff.

The store should:

1. Confirm the quote/order belongs to their store.
2. Confirm paid or production status is visible.
3. Review the generated production forms.
4. Confirm customer details match the quote.
5. Confirm line items match the quote.
6. Confirm dimensions and fractions are readable.
7. Confirm hardware, crossbar, roller, and handle details are readable.
8. Confirm delivery or pickup status is clear.
9. Begin the production/order process according to store operating procedure.
10. Escalate immediately if the packet is incomplete or wrong.

## Successful routing definition

A routed packet is successful only when all of the following are true:

- The selected store receives the email.
- The wrong stores do not receive the email.
- The customer data is usable.
- The quote or production data is usable.
- The store can identify the next required action.
- No personal or corporate inbox is required to forward the packet manually.

## Beta validation procedure

During beta, validate all four store paths.

For each store, record:

- Test date
- Tester
- Quote ID
- Selected store
- Customer email receipt confirmed
- Store email receipt confirmed
- Paid/production packet receipt confirmed
- Generated forms confirmed usable
- Any routing defect found

## Store path validation checklist

### 18228 — Tropicana

- [ ] Quote email routes to Tropicana inbox.
- [ ] Paid/production packet routes to Tropicana inbox.
- [ ] Store can identify next action.
- [ ] No wrong-store routing observed.

### 18507 — Horizon Ridge

- [ ] Quote email routes to Horizon Ridge inbox.
- [ ] Paid/production packet routes to Horizon Ridge inbox.
- [ ] Store can identify next action.
- [ ] No wrong-store routing observed.

### 18690 — Rainbow

- [ ] Quote email routes to Rainbow inbox.
- [ ] Paid/production packet routes to Rainbow inbox.
- [ ] Store can identify next action.
- [ ] No wrong-store routing observed.

### 19117 — Green Valley

- [ ] Quote email routes to Green Valley inbox.
- [ ] Paid/production packet routes to Green Valley inbox.
- [ ] Store can identify next action.
- [ ] No wrong-store routing observed.

## Failure handling

### Wrong store receives the packet

Treat as a critical defect.

Immediate action:

1. Do not proceed with production.
2. Identify quote ID and selected store.
3. Identify actual receiving inbox.
4. Open a GitHub issue with quote ID, selected store, receiving inbox, and timestamp.
5. Manually notify the correct store only after the defect is documented.

### No store receives the packet

Treat as a critical defect.

Immediate action:

1. Confirm customer email was received.
2. Confirm backend quote exists.
3. Confirm selected store on the quote.
4. Check spam or filtered inbox folders.
5. Open a GitHub issue with quote ID, selected store, and timestamp.
6. Manually notify the store only after the defect is documented.

### Store receives incomplete packet

Treat as a major defect unless production cannot proceed. If production cannot proceed, treat as critical.

Immediate action:

1. Identify missing data.
2. Compare customer email, backend/admin record, and generated form.
3. Open a GitHub issue with screenshots or copied field values.
4. Do not rely on verbal correction unless the defect is documented.

## Required user action during beta

The business owner or assigned operator must validate all four store inboxes.

This requires either:

- One test quote per store path, or
- Confirmed real quote traffic through each store path.

A store path should not be marked complete until that store confirms receipt and understands the next action.

## Validation record template

```text
Date:
Tester:
Quote ID:
Selected store:
Customer email received:
Store quote email received:
Store paid/production packet received:
Generated forms usable:
Wrong-store routing observed:
Missing data observed:
Store owner confirmed next action:
Notes:
```

## Operating principle

Store routing is not validated because an email was sent. It is validated only when the correct store receives the correct packet and can act on it without corporate intervention.
