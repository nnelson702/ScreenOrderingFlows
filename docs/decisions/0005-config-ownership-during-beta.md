# ADR 0005: Config Ownership During Beta

## Status

Accepted.

## Context

Several business-critical values currently live in `app.js`, including pricing, delivery, tax, store data, coordinates, ZIP approximations, and product option behavior.

Moving these values too early would create risk without enough benefit during beta hardening.

## Decision

Keep business-critical config fixed in code during beta unless a specific business need requires a controlled change.

Use `docs/CONFIG_OWNERSHIP_PLAN.md` as the guide for future admin/config migration.

## Consequences

- Current stable beta behavior is protected.
- Future configurability remains possible.
- Admin controls must include validation, permissions, audit history, and rollback before controlling pricing, delivery, tax, or store routing.

## High-risk config areas

```text
pricing tables
tax rate
delivery fee/minimum/radius
store emails
store IDs
store coordinates
ZIP approximations
production form templates
```

## Revisit trigger

Revisit after live beta traffic proves the current flow and the ownership model is clear.
