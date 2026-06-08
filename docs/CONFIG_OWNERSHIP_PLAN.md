# Config Ownership Plan

## Purpose

This plan defines who should own the values that control the Screen Ordering Flow and where those values should eventually live.

The goal is not to move configuration immediately. The goal is to avoid breaking a working beta flow by moving business-critical values before ownership and controls are clear.

## Current state

The hardened beta app currently keeps several business-critical values inside `app.js`.

Current embedded values include:

- API endpoint
- Tax rate
- Delivery fee
- Delivery minimum
- Delivery radius
- Store list
- Store contact details
- Store coordinates
- ZIP coordinate approximations
- Material color overrides
- Window pricing table
- Patio door pricing table
- Swatch maps

This was acceptable for alpha hardening because it removed fragile post-load patch scripts and made the approved business rules canonical.

## Ownership principles

1. Business-critical values require top-admin authority.
2. Operational values should not be editable by normal store users.
3. Pricing and delivery rules should not change without deliberate approval.
4. Production stability matters more than configurability during beta.
5. Admin controls should be added only after the live beta flow proves stable.

## Business-owner decisions

### Pricing authority

Pricing changes require top-admin authority.

Normal store users should not be able to change pricing.

### Store email authority

Store email changes require top-admin authority.

Incorrect store routing can create operational failure, so this should remain restricted.

### Delivery rule authority

Delivery fee, delivery minimum, and delivery radius require top-admin authority.

These rules directly affect margin, customer promise, and store workload.

### Tax ownership

Tax should eventually be backend-controlled.

The backend should determine the applicable tax rate from controlled tax settings, not from casual front-end edits.

For beta, the existing fixed tax rate can remain in place until backend tax ownership is implemented and tested.

### Store coordinates

Store coordinates should remain fixed for beta.

Future feature: top-admin-managed location controls that allow adding, removing, or editing store locations.

### Product option ownership

Future feature: top-admin admin controls for materials, frame options, screen options, screen door options, colors, and related product choices.

This would make the tool closer to a commercial-grade system, but should not be rushed before beta traffic validates the current flow.

## Ownership matrix

| Area | Current location | Beta decision | Future owner |
|---|---|---|---|
| API endpoint | `app.js` | Keep fixed | Developer/admin |
| Tax rate | `app.js` | Keep fixed for beta | Backend/top admin |
| Delivery fee | `app.js` | Keep fixed | Top admin |
| Delivery minimum | `app.js` | Keep fixed | Top admin |
| Delivery radius | `app.js` | Keep fixed | Top admin |
| Store list | `app.js` overrides | Keep fixed | Top admin/admin UI |
| Store emails | `app.js` overrides | Keep fixed | Top admin/admin UI |
| Store phones | `app.js` overrides | Keep fixed | Top admin/admin UI |
| Store addresses | `app.js` overrides | Keep fixed | Top admin/admin UI |
| Store coordinates | `app.js` | Keep fixed | Top admin/admin UI |
| ZIP approximations | `app.js` | Keep fixed | Backend/geocoding later |
| Material colors | `app.js` overrides | Keep fixed | Top admin/admin UI |
| Frame options | Config plus overrides | Keep fixed | Top admin/admin UI |
| Pricing tables | `app.js` overrides | Keep fixed | Top admin/admin UI |
| Swatch maps | `app.js` | Keep fixed | Developer/admin |
| Email templates | Backend/templates | Audit before changing | Backend/admin |
| Status rules | Backend/admin flow | Audit before changing | Backend/admin |
| Production forms | Backend/templates/forms | Audit before changing | Backend/admin |

## Recommended future admin sections

A commercial-grade version should eventually include a restricted admin section for:

### Locations

- Add store
- Remove store
- Edit store name
- Edit store email
- Edit store phone
- Edit address
- Edit service radius
- Edit coordinates only with validation

### Materials

- Add material
- Remove material
- Edit material name
- Edit available colors
- Edit material description
- Set material availability by screen type

### Frame options

- Add frame profile
- Remove frame profile
- Edit frame display name
- Edit frame colors
- Map frame profile to pricing key
- Set availability by window or patio door

### Pricing

- Edit retail per-inch rates
- Separate window pricing from patio door pricing
- Require top-admin approval
- Keep audit history
- Show last changed date and changed-by user

### Delivery and tax

- Edit delivery fee
- Edit delivery minimum
- Edit delivery radius
- Tax settings controlled by backend
- Keep audit history

### Email and production templates

- Preview customer email
- Preview store email
- Preview paid/production email
- Preview Screen Fab forms
- Test-send template to admin

## What not to change yet

Do not move these values immediately just because they are hardcoded:

- Pricing tables
- Tax rate
- Delivery rules
- Store coordinates
- Material/color overrides

Reason: these are now working in beta. Moving them before admin controls and regression tests exist would create more risk than value.

## Recommended sequence after beta stabilization

### Phase 1: Run real beta traffic

Let the stabilized system process real orders and capture defects.

Only fix observed defects or clear operational friction.

### Phase 2: Email/template detail improvements

Improve customer/store email detail only if real users or stores need more information directly in emails.

Production forms are currently the build source of truth.

### Phase 3: Architecture cleanup

Move configuration only after the desired admin ownership model is clear.

Start with low-risk values:

1. Store contact display fields
2. Material display colors
3. Frame/material option labels

Delay high-risk values:

1. Pricing
2. Tax
3. Delivery rules
4. Production form templates

### Phase 4: Admin controls

Build restricted admin controls after the data model is stable.

Admin controls should include:

- Permission boundaries
- Validation
- Audit history
- Rollback path

### Phase 5: Automated regression tests

Add automated checks after the highest-value flows are stable.

Automation should cover:

- Quote creation
- Delivery eligibility
- Totals
- Payload shape
- Basic template output

## Strategic recommendation

After this plan is merged, the recommended order is:

1. Improve email/template detail if stores or customers need it.
2. Begin architecture cleanup only in small, low-risk steps.
3. Run broader live beta traffic before moving pricing, tax, or delivery ownership.
4. Add automated regression tests after the system stops changing rapidly.

This balances the business desire to improve the product with the operational need to avoid breaking a working ordering path.

## Decision rule

A value should move out of `app.js` only when all of the following are true:

- Its long-term owner is clear.
- Its validation rules are clear.
- Its failure mode is understood.
- The release checklist covers the change.
- A rollback path exists.

## Operating principle

Commercial-grade software is not defined by how editable everything is. It is defined by whether the right people can safely change the right things without damaging orders, pricing, customer trust, or store execution.
