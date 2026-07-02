# ADR 0006: Future Affiliate Subdomain Model

## Status

Proposed future-state. Not current beta behavior.

## Context

The current tool is for internal employees managing customer screen quotes. A future business goal is to support affiliate subdomain versions of the tool.

Example: a window washer could offer replacement screens to their customers using an affiliate-branded version of the tool. The customer receives a quote branded for the affiliate, while the affiliate receives cost/margin information from the platform.

## Decision

Document affiliate support as a future architecture direction, not current functionality.

Future affiliate instances should be ACE-agnostic and vendor/platform-branded according to the affiliate context.

## Future goals

Affiliate model may include:

```text
affiliate-specific subdomain
affiliate logo upload
affiliate color/theme controls
affiliate retail markup percentage over platform retail
no negative markup
customer quote branded for affiliate
affiliate email showing platform cost and affiliate margin
customer pays platform/vendor
platform produces screens
affiliate may deliver/install or coordinate service
```

## Constraints

Future affiliate work must include:

```text
tenant isolation
branding isolation
pricing contract
markup validation
affiliate cost logic
customer-facing quote branding
affiliate-facing invoice/cost email
ACE branding removal or suppression
separate test matrix
```

## Consequences

Affiliate support is a meaningful product expansion, not a minor skin/theme change.

It should not be built by cloning the current ACE flow without tenant, pricing, and brand isolation.

## Revisit trigger

Revisit when business is ready to design affiliate onboarding, pricing, subdomain provisioning, branding controls, and fulfillment workflow.
