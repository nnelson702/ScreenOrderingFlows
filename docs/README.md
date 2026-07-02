# Documentation Index

## Purpose

This folder contains the operational, technical, testing, and decision documentation for the Screen Ordering Flow.

The current documentation standard is:

```text
Enterprise-grade operational documentation for a beta-stage custom internal ordering tool.
```

This means the documentation is structured for future employees, operators, developers, and AI coding agents. It does not claim the product is enterprise-scale software yet.

## Start here

| Reader | Start with | Purpose |
|---|---|---|
| Future ChatGPT / Copilot / coding agent | `SCREEN_ORDERING_FLOW_RUNBOOK.md` | Project memory and safe-change rules |
| Developer or contractor | `ARCHITECTURE.md` | System structure and file responsibilities |
| Store employee / operator | `STORE_BETA_TEST_CHECKLIST.md` | How to validate store-facing use |
| Business/admin owner | `CONFIG_OWNERSHIP_PLAN.md` | What can move to admin/config later |
| Release reviewer | `RELEASE_REGRESSION_CHECKLIST.md` | What to test before/after deployment |
| Incident responder | `TROUBLESHOOTING.md` | What to check when something breaks |

## Core docs

```text
SCREEN_ORDERING_FLOW_RUNBOOK.md      durable project handoff and safe-change rules
ARCHITECTURE.md                      system architecture and component responsibilities
DATA_CONTRACT.md                     quote, line item, fulfillment, status, and affiliate data fields
API_CONTRACT.md                      backend route contracts and side effects
DEPLOYMENT.md                        hosting, Worker, environment, and deployment notes
CHANGE_CONTROL.md                    change type, approval, testing, and rollback rules
TROUBLESHOOTING.md                   debugging guide by failure type
TEST_MATRIX.md                       formal smoke/regression test matrix
```

## Existing operational docs

```text
CONFIG_OWNERSHIP_PLAN.md             ownership plan for pricing, delivery, tax, store data, and config
STORE_BETA_TEST_CHECKLIST.md         store/operator beta test checklist
STORE_EMAIL_ROUTING_PROTOCOL.md      store email routing expectations and defect severity
PRODUCTION_FORM_STATUS_AUDIT.md      production form and status transition audit
RELEASE_REGRESSION_CHECKLIST.md      release validation checklist
CODING_EXECUTION_STANDARD.md         coding execution expectations
```

## Decision records

Decision records live in:

```text
docs/decisions/
```

Current decision records:

```text
0001-delivery-rule.md
0002-store-email-routing.md
0003-hardware-tile-selector.md
0004-worker-production-entrypoint.md
0005-config-ownership-during-beta.md
0006-future-affiliate-subdomain-model.md
```

## Current confirmed URLs

Current confirmed application URLs:

```text
Customer/internal quote flow: https://www.screens.helpful.place
Staff portal:                 https://www.screens.helpful.place/staff
```

Older references to `/screens` or `/screensadmin` should be treated as historical unless deliberately restored.

## External systems

Known systems and vendors:

```text
GitHub                 source repository and documentation
Cloudflare Pages       likely static app hosting target / edge hosting layer
Cloudflare Workers     API runtime, configured through api/wrangler.jsonc
Supabase               quote, item, staff, session, and status data
Stripe                 payment path / checkout / webhook
Resend                 email sending
Helpful.Place          public/company web property and screen subdomain
Squarespace            current business website context
GoDaddy                domain/DNS/vendor account context
```

If deployment reality differs from this list, update `DEPLOYMENT.md` and this index before changing code.

## Audience model

This system currently serves internal employees managing customer quotes. Future versions may serve external customers directly and affiliate subdomain users.

Current documentation should remain accurate for the internal tool while explicitly marking affiliate behavior as future-state only.

## Documentation maintenance rule

Any change that affects pricing, delivery, tax, store routing, status behavior, emails, production forms, deployment, or affiliate architecture must update the relevant docs in the same PR or commit series.
