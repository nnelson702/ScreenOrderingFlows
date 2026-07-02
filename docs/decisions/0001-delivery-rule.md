# ADR 0001: Alpha/Beta Delivery Rule

## Status

Accepted.

## Context

Earlier delivery logic was more complex and created unnecessary risk during the hardened beta phase.

The business decision was to make the alpha delivery rule canonical and remove competing delivery logic.

## Decision

Delivery is available when both conditions are true:

```text
screen subtotal is at least $35
customer is within 15 miles of selected store
```

When delivery is available and selected, the delivery fee is:

```text
$10
```

Pickup remains available.

## Consequences

- Delivery rules are easier for customers, stores, and future developers to understand.
- Pricing and fulfillment promises are less fragile.
- More complex graduated delivery logic should not be restored without a new business decision.

## Current implementation

Canonical constants currently live in `app.js`:

```text
DELIVERY_FEE = 10
DELIVERY_MINIMUM_SUBTOTAL = 35
DELIVERY_RADIUS_MILES = 15
```

## Revisit trigger

Revisit only if business leadership wants a new delivery economics model, expanded radius, higher fee, affiliate-specific delivery rule, or store-specific delivery behavior.
