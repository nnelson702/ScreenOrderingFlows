# Beta Release and Regression Checklist

## Purpose

Use this checklist before and after every production-facing change to the Screen Ordering Flow. The goal is to protect the business process, not just confirm that the page loads.

This checklist should be run for any change that touches:

- `index.html`
- `app.js`
- `styles.css`
- `data/config.json`
- Backend quote creation
- Email routing
- Payment/status handling
- Production form generation

## Release rule

Do not merge or deploy a change if any critical check fails.

A failed critical check means the issue must be fixed, retested, and documented before proceeding.

## Test setup

Use a hard refresh or private browser window before testing.

Record the following for each test pass:

- Date and time
- Tester name
- Environment or URL tested
- Browser and device
- Test quote ID
- Selected store
- Pickup or delivery
- Pass/fail result
- Notes or defects found

## Critical business rules

### Alpha delivery law

Delivery is only available when all of the following are true:

- Screen subtotal is at least `$35`
- Customer address is within `15 miles` of the selected store
- Delivery fee is exactly `$10`

Pickup must remain available even when delivery is not available.

### Pricing rule

Screen pricing must use the approved per-inch pricing logic.

The quoted line item must match:

```text
rounded_up_width_plus_height x retail_per_inch x quantity
```

Tax, delivery, and total must calculate consistently across the app, customer email, store email, backend/admin view, and production forms.

## Pre-merge checklist

### 1. App load

- [ ] Page loads without a blank screen.
- [ ] Header and logo display.
- [ ] `Get Started` button works.
- [ ] No red JavaScript errors appear in the browser console.
- [ ] Configuration-driven options populate.

### 2. Customer information

- [ ] Customer name is required.
- [ ] Customer phone is required.
- [ ] Customer email is required.
- [ ] Address fields accept normal input.
- [ ] Customer form submits successfully.
- [ ] Dashboard opens after customer submit.

### 3. Store selection

- [ ] Store auto-select works from ZIP/address.
- [ ] Manual store override works.
- [ ] Selected store remains stable after continuing.
- [ ] Store shown on dashboard matches selected store.
- [ ] Store shown on success screen matches selected store.

Suggested ZIP spot checks:

```text
89121 -> Tropicana path
89012 -> Horizon Ridge path
89103 -> Rainbow path
89014 -> Green Valley path
```

### 4. Window screen line item

- [ ] Window screen path opens.
- [ ] Quantity input works.
- [ ] Width whole inches input works.
- [ ] Width fraction input works.
- [ ] Height whole inches input works.
- [ ] Height fraction input works.
- [ ] Frame profile selection works.
- [ ] Frame color selection works.
- [ ] Material type selection works.
- [ ] Material color selection works.
- [ ] Hardware type selection works.
- [ ] Hardware quantity controls work.
- [ ] Hardware side placement works.
- [ ] Hardware diagram updates.
- [ ] Crossbar step works.
- [ ] Crossbar recommendation appears for large openings.
- [ ] Saved line item appears on dashboard.
- [ ] Remove line item button works.
- [ ] Line item price calculates.

### 5. Patio door line item

- [ ] Patio door path opens.
- [ ] Door flow does not show the wrong window-only step.
- [ ] Quantity input works.
- [ ] Width and height inputs work.
- [ ] Frame selection works.
- [ ] Material selection works.
- [ ] Roller type selection works.
- [ ] Handle orientation works.
- [ ] Handle height works.
- [ ] Saved line item appears on dashboard.
- [ ] Door summary displays handle data clearly.
- [ ] Line item price calculates.

### 6. Delivery eligibility

Run three targeted tests:

- [ ] Subtotal under `$35`: delivery unavailable.
- [ ] Subtotal `$35+` and within `15 miles`: delivery available.
- [ ] Subtotal `$35+` and outside `15 miles`: delivery unavailable.
- [ ] Delivery selected: `$10` fee appears.
- [ ] Pickup selected: delivery fee is `$0`.
- [ ] Total updates when fulfillment method changes.

### 7. Quote summary

- [ ] Customer summary is correct.
- [ ] Store summary is correct.
- [ ] Fulfillment method is correct.
- [ ] Line item table is correct.
- [ ] Subtotal is correct.
- [ ] Tax is correct.
- [ ] Delivery fee is correct.
- [ ] Total is correct.
- [ ] Measurement acknowledgement is required before submit.

### 8. Quote submit

- [ ] Submit button sends quote successfully.
- [ ] Backend returns quote ID.
- [ ] Success screen appears.
- [ ] Success screen quote ID matches backend/admin record.
- [ ] Success screen totals match dashboard totals.
- [ ] Payment link appears when backend returns one.
- [ ] Payment link is not shown as active when backend does not return one.

## Post-merge / production checklist

### 9. Customer email

- [ ] Customer email is received.
- [ ] Customer name is correct.
- [ ] Customer contact info is correct.
- [ ] Selected store is correct.
- [ ] Quote ID is correct.
- [ ] Line items are correct.
- [ ] Subtotal, tax, delivery, and total are correct.
- [ ] Payment language is correct.
- [ ] No outdated pilot/internal wording appears.

### 10. Store email routing

- [ ] Selected store receives the quote or production packet.
- [ ] Wrong stores do not receive the packet.
- [ ] Store email includes usable customer information.
- [ ] Store email includes usable quote information.
- [ ] Store email includes usable production information.
- [ ] Store team knows who owns next action.

Store inboxes to validate during beta:

- [ ] 18228 — Tropicana
- [ ] 18507 — Horizon Ridge
- [ ] 18690 — Rainbow
- [ ] 19117 — Green Valley

### 11. Payment and status flow

- [ ] Quote can advance to paid.
- [ ] Paid status is visible in backend/admin process.
- [ ] Quote can advance to production.
- [ ] Production status is visible in backend/admin process.
- [ ] Status changes do not alter quote totals.
- [ ] Status changes do not alter line item details.

### 12. Production forms

- [ ] Production forms generate successfully.
- [ ] Production forms regenerate successfully.
- [ ] Quote ID matches.
- [ ] Customer details match.
- [ ] Store details match.
- [ ] Line items match.
- [ ] Quantities match.
- [ ] Dimensions and fractions match.
- [ ] Frame selections match.
- [ ] Material selections match.
- [ ] Hardware details match.
- [ ] Crossbar details match.
- [ ] Door handle and roller details match.
- [ ] Subtotal, tax, delivery, and total match.
- [ ] Paid/production status is correct.

### 13. Final release decision

- [ ] All critical checks passed.
- [ ] Any defects are documented in GitHub.
- [ ] Failed checks have linked fix issues.
- [ ] Business owner approves release or merge.
- [ ] PR or deployment notes include validation result.

## Defect severity

### Critical

Blocks merge or deployment.

Examples:

- App does not load.
- Quote cannot submit.
- Store routing is wrong.
- Delivery law is wrong.
- Totals are wrong.
- Production forms are wrong.
- Payment/status flow is broken.

### Major

Should be fixed before broad beta use unless explicitly accepted.

Examples:

- Confusing but recoverable UI behavior.
- Missing helper text.
- Formatting issue on generated email/form.
- Store confirmation unclear but data is present.

### Minor

Can be queued.

Examples:

- Cosmetic spacing issue.
- Non-blocking wording improvement.
- Small display inconsistency that does not affect operations.

## Validation record template

```text
Date:
Tester:
Environment/URL:
Browser/device:
Quote ID:
Selected store:
Fulfillment method:

Pre-merge checklist result:
Post-merge checklist result:
Critical defects found:
Major defects found:
Minor defects found:

Release decision:
Notes:
```

## Operating principle

This tool is operational software. A release is not successful because the code merged. A release is successful only when the quote, email, payment/status, store routing, and production packet all match the same business truth.
