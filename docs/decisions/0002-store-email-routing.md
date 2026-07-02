# ADR 0002: Selected-Store Email Routing

## Status

Accepted.

## Context

The screen quote flow is operationally store-driven. Once a customer submits a quote, the selected store needs the quote details to manage customer follow-up, payment, production, pickup, or delivery.

The user no longer expects corporate/user inbox copies as the primary operational recipient.

## Decision

Quote-created store emails route to the selected store email address.

Wrong-store delivery or missing selected-store email is a critical defect.

## Consequences

- Store teams own their screen quote follow-up.
- Store selection and store payload accuracy are business-critical.
- Future changes to store data require careful regression testing.

## Current store IDs

```text
18228
18507
18690
19117
```

## Current implementation areas

```text
app.js                 store selection, store overrides, selected store payload
api/worker.js          backend quote create and email behavior
STORE_EMAIL_ROUTING_PROTOCOL.md
```

## Revisit trigger

Revisit if centralized routing, district-level notification, affiliate routing, or store-specific escalation rules are introduced.
