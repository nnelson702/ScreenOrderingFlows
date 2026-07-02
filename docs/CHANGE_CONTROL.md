# Change Control

## Purpose

This document defines how changes should be planned, approved, tested, and rolled back for the Screen Ordering Flow.

The current system is beta-stage but operationally sensitive. Quote accuracy, store routing, customer emails, and production forms affect real store/customer work.

## Change risk levels

### Low-risk changes

Examples:

```text
copy edits
minor CSS spacing
documentation-only updates
non-functional visual polish
```

Direct commits are acceptable when the scope is clear.

Required testing:

```text
open affected screen
verify no obvious layout regression
```

### Medium-risk changes

Examples:

```text
customer form layout
hardware tile behavior
crossbar warning behavior
staff portal display changes
email wording without data changes
```

Direct commits may be acceptable if narrow. PR preferred when multiple files are involved.

Required testing:

```text
affected customer/staff flow
quote submit if payload could be affected
hardware/crossbar smoke test if relevant
```

### High-risk changes

Examples:

```text
pricing
tax
delivery eligibility
store routing
quote payload shape
status workflow
emails with side effects
Stripe webhook
Supabase schema assumptions
vendor/production forms
Worker entrypoint
staff authentication
future affiliate pricing/branding
```

PR or explicit owner approval strongly preferred.

Required testing:

```text
release regression checklist
relevant test matrix sections
post-deploy smoke test
rollback plan
```

## Approval rules

Business-owner approval required for:

```text
pricing changes
delivery rule changes
tax changes
store routing changes
affiliate pricing model changes
customer-facing payment behavior
```

Technical review required for:

```text
Worker entrypoint changes
status/email side effects
Stripe webhook changes
Supabase data contract changes
staff auth/session changes
vendor form generation changes
```

## Documentation rule

Any change that affects behavior must update relevant docs in the same change set.

Examples:

```text
delivery logic change -> CONFIG_OWNERSHIP_PLAN.md, DATA_CONTRACT.md, TEST_MATRIX.md
new route -> API_CONTRACT.md
new deployment target -> DEPLOYMENT.md
new status behavior -> API_CONTRACT.md, TEST_MATRIX.md, TROUBLESHOOTING.md
future affiliate behavior -> ARCHITECTURE.md, DATA_CONTRACT.md, decision record
```

## Required pre-change questions

Before coding, answer:

```text
What user/operator problem is being solved?
What files are expected to change?
Does it affect pricing, tax, delivery, store routing, emails, or forms?
Does it affect quote payload shape?
Does it affect status or payment behavior?
What smoke test proves it works?
What is the rollback path?
```

## Direct commit policy

Direct commits are acceptable for:

```text
documentation-only changes
small contained UI fixes
narrow non-critical copy changes
verified one-file fixes
```

Direct commits are not preferred for:

```text
pricing/delivery/tax changes
Worker entrypoint changes
payment or webhook behavior
status email side effects
schema/data contract changes
affiliate architecture changes
```

## Pull request policy

Use a PR when:

```text
more than 3 production files change
logic changes are high-risk
multiple systems are involved
rollback would be non-trivial
review context is needed
```

PR description should include:

```text
summary
files changed
risk level
testing performed
docs updated
rollback plan
```

## Testing rule by change type

| Change type | Required tests |
|---|---|
| Documentation only | verify docs render and links/paths are accurate |
| CSS/layout | affected viewport and screen flow |
| Hardware UI | hardware tile smoke test and line item save |
| Crossbar | crossbar warning smoke test |
| Delivery | delivery eligible/ineligible tests |
| Pricing/tax | quote total regression tests |
| Store routing | selected-store email test |
| Status/email | duplicate same-status test |
| Worker/API | affected API route and post-deploy smoke test |
| Vendor forms | production form audit |
| Affiliate future work | tenant/brand/pricing isolation test plan before implementation |

## Rollback rule

Every high-risk change must have a rollback path before deployment.

Rollback options:

```text
revert commit
restore previous Worker entrypoint
restore previous static deployment
revert environment variable change
disable feature behind explicit flag if implemented
```

## Incident documentation

For production/beta incidents, record:

```text
date/time
reported by
quote ID if applicable
affected store/customer
description
severity
root cause
fix commit
rollback if used
follow-up prevention
```

## Change-control principle

Move fast only where failure is cosmetic. Move deliberately where failure affects customer money, store routing, production build data, or customer trust.
