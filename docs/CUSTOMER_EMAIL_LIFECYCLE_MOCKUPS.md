# Customer Email Lifecycle Mockups

## Purpose

This document mocks up customer-facing lifecycle emails before any code changes are made to `api/worker.js`.

The goal is to make each email clearly communicate a different customer signal:

1. Quote created, action required
2. Payment received, production started
3. Order ready for pickup or delivery scheduling
4. Order completed, thank you and retention message

## Data rule

These mockups use only data points already collected or already present in the quote/order flow.

No new schema fields are assumed.

## Fake data used in mockups

```text
Quote ID: Q-TEST-1042
Status: quote_created / in_production / ready / completed
Created: Jun 9, 2026
Valid through: Jul 9, 2026

Customer:
Taylor Morgan
5574 Oak Bend Drive
Las Vegas, NV 89135
(702) 555-0148
taylor.morgan@example.com

Selected store:
SKYE-ACE Tropicana
3145 E. Tropicana Blvd
Las Vegas, NV 89121
(725) 977-3444
ACE_18228@skyecos.com

Fulfillment:
Pickup or Delivery
Delivery fee: $10.00 when applicable
Estimated distance: 12.5 miles when applicable

Totals:
Subtotal: $198.24
Tax: $16.60
Delivery: $10.00 or $0.00
Total: $224.84 or $214.84

Line items:
1. Window, qty 1, 36 in x 36 in, 5/16 x 3/4 white frame, PET black material, SLS x2 Top, PT x2 Bottom, V:18 in crossbar, $66.24
2. Patio Door, qty 1, 48 in x 72 in, Rolled Form Steel white frame, PET black material, steel rollers, right handle at 36 in, $132.00
```

## Shared visual system

### Customer email style

Customer emails should feel branded, simple, and clearly phased.

Recommended shared structure:

```text
[Red Helpful ACE / Screen Tool header]
[Large lifecycle headline]
[Short plain-English message]
[Primary action button or next step]
[Quote summary]
[Screen summary]
[Selected store contact]
[Footer]
```

### Important implementation constraint

Images can be used only if they are stable hosted assets. If we do not want image dependency risk, use a text-based red header with the Helpful ACE name and no external images.

For beta, a strong text-based brand header is safer than relying on external images inside email clients.

---

# Visual Direction A: Branded Card

This option looks more customer-facing and polished. It uses a branded red header, a strong status badge, and a single dominant message.

## A1. Quote Created / Action Required

### Subject

```text
ACE Screen Quote Created - Action Required to Place Order
```

### Preview text

```text
Your quote is ready, but your order has not been placed yet.
```

### Mockup

```text
┌──────────────────────────────────────────────────────────────┐
│ SKYE ACE Hardware                                Screen Tool │
│ Custom Window & Door Screen Quote                            │
└──────────────────────────────────────────────────────────────┘

QUOTE CREATED
Action required to place your order

Your screen quote has been created, but your order has not been placed yet.

Please review your quote for accuracy. When everything looks correct, you can pay online or visit your selected store to place the order.

[ Pay Now ]   [ View / Download Quote ]

Important:
Production does not begin until payment is received.
Once payment is received, your custom order will move into production and may no longer be edited or cancelled.

Quote Summary
Quote ID: Q-TEST-1042
Status: quote_created
Valid through: Jul 9, 2026

Quote Totals
Subtotal: $198.24
Tax: $16.60
Delivery: $0.00
Total: $214.84

Customer
Taylor Morgan
5574 Oak Bend Drive
Las Vegas, NV 89135
(702) 555-0148
taylor.morgan@example.com

Selected Store
SKYE-ACE Tropicana
3145 E. Tropicana Blvd
Las Vegas, NV 89121
(725) 977-3444

Screens
1. Window | Qty 1 | 36 in x 36 in | 5/16 x 3/4 white | PET black | $66.24
   Hardware: SLS x2 Top, PT x2 Bottom | Crossbar: V:18 in

2. Patio Door | Qty 1 | 48 in x 72 in | Rolled Form Steel white | PET black | $132.00
   Rollers: steel | Handle: right at 36 in

Helpful ACE Hardware
Please contact or visit your selected store with any questions.
```

### Why this works

The first thing the customer sees is not a generic quote summary. They see that action is required and the order is not placed yet.

---

## A2. Production Started / Order Locked

### Subject

```text
Production Started - Your ACE Screen Order Is Now In Progress
```

### Preview text

```text
Payment has been received and your custom screen order is now in production.
```

### Mockup

```text
┌──────────────────────────────────────────────────────────────┐
│ SKYE ACE Hardware                                Screen Tool │
│ Custom Window & Door Screen Order                            │
└──────────────────────────────────────────────────────────────┘

PRODUCTION STARTED
Your custom order is now in progress

Payment has been received. Your custom screen order has moved into production.

Because this is a custom-made order, it can no longer be edited, cancelled, or returned from this point forward.

What happens next:
Your selected store and vendor production process are now underway. We will notify you when your order is ready for pickup or delivery scheduling.

Quote Summary
Quote ID: Q-TEST-1042
Status: in_production

Quote Totals
Subtotal: $198.24
Tax: $16.60
Delivery: $10.00
Total: $224.84

Fulfillment
Delivery
Delivery fee: $10.00
Estimated distance from selected store: 12.5 miles

Selected Store
SKYE-ACE Tropicana
3145 E. Tropicana Blvd
Las Vegas, NV 89121
(725) 977-3444

Screens
1. Window | Qty 1 | 36 in x 36 in | 5/16 x 3/4 white | PET black | $66.24
   Hardware: SLS x2 Top, PT x2 Bottom | Crossbar: V:18 in

2. Patio Door | Qty 1 | 48 in x 72 in | Rolled Form Steel white | PET black | $132.00
   Rollers: steel | Handle: right at 36 in

Helpful ACE Hardware
Thank you for trusting us with your custom screen order.
```

### Why this works

The dominant message is production status and the custom-order lock. This reduces customer confusion and protects the store from edit/cancel expectations after payment.

---

## A3. Ready / Pickup Version

### Subject

```text
Ready for Pickup - Your ACE Screen Order Is Ready
```

### Preview text

```text
Your screen order is ready for pickup at your selected store.
```

### Mockup

```text
┌──────────────────────────────────────────────────────────────┐
│ SKYE ACE Hardware                                Screen Tool │
│ Custom Window & Door Screen Order                            │
└──────────────────────────────────────────────────────────────┘

READY FOR PICKUP
Your screen order is ready at your selected store

Your custom screen order is ready for pickup.

Please visit your selected store when convenient. Bring your quote ID or a copy of this email so the team can quickly locate your order.

Selected Store
SKYE-ACE Tropicana
3145 E. Tropicana Blvd
Las Vegas, NV 89121
(725) 977-3444

Quote Summary
Quote ID: Q-TEST-1042
Status: ready
Fulfillment: Pickup

Quote Totals
Subtotal: $198.24
Tax: $16.60
Delivery: $0.00
Total: $214.84

Screens
1. Window | Qty 1 | 36 in x 36 in | 5/16 x 3/4 white | PET black | $66.24
2. Patio Door | Qty 1 | 48 in x 72 in | Rolled Form Steel white | PET black | $132.00

Helpful ACE Hardware
Please contact or visit your selected store with any questions.
```

---

## A4. Ready / Delivery Version

### Subject

```text
Ready for Delivery Scheduling - Your ACE Screen Order Is Ready
```

### Preview text

```text
Your order is ready and the store will contact you soon to schedule delivery.
```

### Mockup

```text
┌──────────────────────────────────────────────────────────────┐
│ SKYE ACE Hardware                                Screen Tool │
│ Custom Window & Door Screen Order                            │
└──────────────────────────────────────────────────────────────┘

READY FOR DELIVERY SCHEDULING
Your screen order is ready

Your custom screen order is ready for delivery scheduling.

Your selected store will contact you soon to schedule delivery of your order.

Delivery Details
Delivery fee: $10.00
Estimated distance from selected store: 12.5 miles
Delivery address:
5574 Oak Bend Drive
Las Vegas, NV 89135

Selected Store
SKYE-ACE Tropicana
3145 E. Tropicana Blvd
Las Vegas, NV 89121
(725) 977-3444

Quote Summary
Quote ID: Q-TEST-1042
Status: ready
Fulfillment: Delivery

Quote Totals
Subtotal: $198.24
Tax: $16.60
Delivery: $10.00
Total: $224.84

Helpful ACE Hardware
Please contact or visit your selected store with any questions.
```

### Why this works

Pickup and delivery ready emails should not be identical. Delivery requires customer expectation-setting that the store will schedule the delivery.

---

## A5. Completed / Thank You

### Subject

```text
Thank You - Your ACE Screen Order Is Complete
```

### Preview text

```text
Thank you for your business. We keep your order on file to make future replacement screens easier.
```

### Mockup

```text
┌──────────────────────────────────────────────────────────────┐
│ SKYE ACE Hardware                                Screen Tool │
│ Custom Window & Door Screen Order                            │
└──────────────────────────────────────────────────────────────┘

ORDER COMPLETE
Thank you for your business

Your screen order has been completed.

Thank you for trusting Helpful ACE Hardware. We value you as a customer and neighbor.

A helpful note for the future:
We keep your invoice and order information on file. If you ever need to replace a screen you previously purchased, we can use your order history to make the repeat process easier.

Also think of us for:
Knife sharpening
Key cutting for your home and many vehicles
Paint
Hardware
Special orders
Delivery

Quote Summary
Quote ID: Q-TEST-1042
Status: completed

Quote Totals
Subtotal: $198.24
Tax: $16.60
Delivery: $10.00
Total: $224.84

Selected Store
SKYE-ACE Tropicana
3145 E. Tropicana Blvd
Las Vegas, NV 89121
(725) 977-3444

Helpful ACE Hardware
Thank you again. We appreciate your business.
```

### Why this works

This email stops being transactional only. It becomes a retention touchpoint without being overdone.

---

# Visual Direction B: Clean Transactional

This option is less visual and more direct. It still differentiates each phase, but it uses a simpler layout that may be more reliable across email clients.

## B1. Quote Created / Action Required

### Subject

```text
ACE Screen Quote Created - Action Required to Place Order
```

### Mockup

```text
ACE SCREEN QUOTE CREATED
Action required: place your order

Taylor, your screen quote has been created, but your order has not been placed yet.

Next step:
Review your quote and pay online or visit your selected store to place the order.

[ Pay Now ]
[ View / Download Quote ]

Quote ID: Q-TEST-1042
Status: quote_created
Selected store: SKYE-ACE Tropicana
Total: $214.84
Fulfillment: Pickup

Important:
Production begins only after payment is received. Once production begins, custom screen orders may no longer be edited or cancelled.

Screen summary:
1. Window | Qty 1 | 36 in x 36 in | PET black | $66.24
2. Patio Door | Qty 1 | 48 in x 72 in | PET black | $132.00

Questions?
Contact SKYE-ACE Tropicana at (725) 977-3444.
```

---

## B2. Production Started

### Subject

```text
Production Started - Your ACE Screen Order Is Now In Progress
```

### Mockup

```text
PRODUCTION STARTED
Your custom screen order is now in progress

Taylor, payment has been received and your custom screen order has moved into production.

Important:
Because this is a custom-made order, it can no longer be edited, cancelled, or returned from this point forward.

Quote ID: Q-TEST-1042
Status: in_production
Selected store: SKYE-ACE Tropicana
Total: $224.84
Fulfillment: Delivery
Delivery fee: $10.00
Estimated distance: 12.5 miles

What happens next:
We will notify you when your order is ready for pickup or delivery scheduling.
```

---

## B3. Ready / Pickup

### Subject

```text
Ready for Pickup - Your ACE Screen Order Is Ready
```

### Mockup

```text
READY FOR PICKUP
Your screen order is ready

Taylor, your custom screen order is ready for pickup at your selected store.

Pickup at:
SKYE-ACE Tropicana
3145 E. Tropicana Blvd
Las Vegas, NV 89121
(725) 977-3444

Quote ID: Q-TEST-1042
Status: ready
Total: $214.84

Please bring your quote ID or this email so the store can quickly locate your order.
```

---

## B4. Ready / Delivery

### Subject

```text
Ready for Delivery Scheduling - Your ACE Screen Order Is Ready
```

### Mockup

```text
READY FOR DELIVERY SCHEDULING
Your screen order is ready

Taylor, your custom screen order is ready for delivery scheduling.

Your selected store will contact you soon to schedule delivery.

Delivery address:
5574 Oak Bend Drive
Las Vegas, NV 89135

Selected store:
SKYE-ACE Tropicana
(725) 977-3444

Quote ID: Q-TEST-1042
Status: ready
Delivery fee: $10.00
Total: $224.84
```

---

## B5. Completed

### Subject

```text
Thank You - Your ACE Screen Order Is Complete
```

### Mockup

```text
ORDER COMPLETE
Thank you for your business

Taylor, your screen order has been completed.

Thank you for trusting Helpful ACE Hardware. We value you as a customer and neighbor.

We keep your invoice and order information on file. If you ever need to replace a screen you previously purchased, we can use your order history to make the repeat process easier.

Also think of us for:
Knife sharpening
Key cutting for your home and many vehicles
Paint
Hardware
Special orders
Delivery

Quote ID: Q-TEST-1042
Status: completed
Selected store: SKYE-ACE Tropicana
Total: $224.84

Thank you again. We appreciate your business.
```

---

# Recommendation

Use Direction A for customer emails.

Reason:

- Better customer-facing presentation
- Stronger lifecycle differentiation
- Clearer action signals
- Better perceived quality for a commercial tool

Use Direction B only if email rendering reliability becomes an issue.

# Implementation notes

If Direction A is approved, implementation should:

- Keep the shared quote summary block but expand it with optional detail lines.
- Add phase-specific intro blocks.
- Use fulfillment method to choose pickup vs delivery ready copy.
- Use branded text header first; avoid relying on image loading for critical meaning.
- Keep production forms as the build source of truth.

# Open decision

Approve one of these:

```text
A. Branded Card customer emails
B. Clean Transactional customer emails
C. Hybrid: A for customer, B for store
```

Recommended answer: `C`, with Direction A for customer emails and plain operational emails for stores.
