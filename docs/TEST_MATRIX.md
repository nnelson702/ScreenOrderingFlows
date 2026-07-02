# Test Matrix

## Purpose

This matrix defines the minimum tests required to validate the Screen Ordering Flow by change type and release risk.

Use this with:

```text
docs/RELEASE_REGRESSION_CHECKLIST.md
docs/STORE_BETA_TEST_CHECKLIST.md
docs/PRODUCTION_FORM_STATUS_AUDIT.md
```

## Test severity

```text
P0 critical: must pass before production/beta use
P1 major: should pass before broader rollout
P2 minor: queue if not blocking
```

## Core customer quote tests

| ID | Test | Setup | Expected result | Severity |
|---|---|---|---|---|
| CQ-01 | App load | Open `https://www.screens.helpful.place` | Tool loads without console-blocking errors | P0 |
| CQ-02 | Customer info | Enter name, phone, email, address | Customer data appears correctly in summary | P0 |
| CQ-03 | Store selection | Use valid local address/ZIP | Selected store appears and can be overridden | P0 |
| CQ-04 | Window item | Add window screen with qty, dimensions, frame, material | Line item saves with correct data | P0 |
| CQ-05 | Patio door item | Add patio door with roller and handle height | Line item saves with correct data | P1 |
| CQ-06 | Mixed quote | Add window and patio door | Summary shows both items and correct totals | P1 |
| CQ-07 | Submit quote | Submit valid quote | Success screen and quote ID appear | P0 |

## Delivery tests

| ID | Test | Setup | Expected result | Severity |
|---|---|---|---|---|
| DL-01 | Delivery eligible | Subtotal >= $35 and within 15 miles | Delivery available for $10 | P0 |
| DL-02 | Subtotal ineligible | Subtotal < $35 | Delivery unavailable | P0 |
| DL-03 | Distance ineligible | Outside 15 miles | Delivery unavailable | P0 |
| DL-04 | Pickup fallback | Any quote | Pickup remains available | P0 |
| DL-05 | Totals | Delivery selected | Delivery cents and total match UI/email/backend | P0 |

## Pricing/totals tests

| ID | Test | Setup | Expected result | Severity |
|---|---|---|---|---|
| PT-01 | Window price | Known window dimensions/material/frame | Unit and line total are reasonable and stable | P0 |
| PT-02 | Quantity | Qty > 1 | Line total = unit price x qty | P0 |
| PT-03 | Tax | Submitted quote | Tax matches configured logic | P0 |
| PT-04 | Surface match | Compare UI, success, email, staff, form | Totals match everywhere | P0 |

## Hardware tests

| ID | Test | Setup | Expected result | Severity |
|---|---|---|---|---|
| HW-01 | Tile images | Step 5 / Hardware | All six tile images load | P1 |
| HW-02 | Tile selection | Select each tile | Selected state changes and canonical value updates | P0 |
| HW-03 | Standard Leaf Spring | Select Standard Leaf Spring and add | Diagram/summary shows LS | P0 |
| HW-04 | Quantity/side | Add hardware with qty and side | No overlap; data saves correctly | P0 |
| HW-05 | Production form | Submit quote with hardware | Hardware appears correctly on form | P0 |

## Crossbar tests

| ID | Test | Setup | Expected result | Severity |
|---|---|---|---|---|
| CB-01 | Recommended trigger | Large window opening | Label/helper indicate crossbar recommended | P0 |
| CB-02 | Warning timing | Enter Step 6 with No Crossbar | Alert appears on page entry | P0 |
| CB-03 | No duplicate | Save after alert | Save Screen does not show duplicate alert | P1 |
| CB-04 | Crossbar yes | Select Yes and enter details | Details save and appear on summary/form | P0 |

## Email routing tests

| ID | Test | Setup | Expected result | Severity |
|---|---|---|---|---|
| EM-01 | Customer quote email | Submit quote | Customer receives quote email | P0 |
| EM-02 | Store quote email | Submit quote | Selected store receives quote email | P0 |
| EM-03 | Wrong store check | Submit quote for known selected store | Other stores do not receive operational quote | P0 |
| EM-04 | Paid/In Production email | Mark in_production | Expected lifecycle email behavior occurs | P0 |
| EM-05 | Ready email | Mark ready | Expected ready email behavior occurs | P0 |
| EM-06 | Duplicate guard | Repeat same status | No duplicate lifecycle email | P0 |

## Staff portal tests

| ID | Test | Setup | Expected result | Severity |
|---|---|---|---|---|
| ST-01 | Staff load | Open `https://www.screens.helpful.place/staff` | Staff portal loads | P0 |
| ST-02 | Login | Valid staff access | Session created and dashboard opens | P0 |
| ST-03 | Search recent | Load recent/search by quote | Quote appears | P0 |
| ST-04 | Status update | Mark in_production | Status changes and persists | P0 |
| ST-05 | Repeat status | Mark same status again | No duplicate lifecycle email | P0 |
| ST-06 | Sign out/lock | Sign out or lock | Session access is restricted | P1 |

## Vendor/production form tests

| ID | Test | Setup | Expected result | Severity |
|---|---|---|---|---|
| VF-01 | Vendor link | In-production quote | Vendor packet path opens | P0 |
| VF-02 | Window form | Window line item | Dimensions, frame, material, hardware, crossbar match | P0 |
| VF-03 | Door form | Patio door line item | Dimensions, frame, material, roller, handle match | P0 |
| VF-04 | Totals | Production form | Totals match quote | P0 |
| VF-05 | Regeneration | Reopen/regenerate forms | No data loss or mutation | P0 |

## API tests

| ID | Test | Setup | Expected result | Severity |
|---|---|---|---|---|
| API-01 | Health | GET `/health` | Returns ok without secrets | P1 |
| API-02 | Quote create | POST valid quote | Quote and items created | P0 |
| API-03 | Admin view | Staff auth + quote ID | Quote and items returned | P0 |
| API-04 | Status update | Staff auth + valid status | Status changes | P0 |
| API-05 | Same-status guard | Repeat lifecycle status | Email status skipped or no duplicate email | P0 |
| API-06 | Vendor packet | Valid packet token | Packet returns for operational status | P0 |

## Deployment smoke test

Run after any deployment-affecting change:

```text
open customer URL
open staff URL
submit test quote
confirm customer email
confirm selected store email
mark in_production
repeat in_production
mark ready
repeat ready
open vendor form path
confirm totals and build-critical data
```

## Future affiliate test requirements

Future-state only. Before affiliate subdomains go live, add tests for:

```text
affiliate subdomain resolution
affiliate logo/theme display
affiliate retail markup percent
no negative markup
affiliate customer-facing quote branding
affiliate cost/invoice email
affiliate margin display
tenant isolation
ACE branding removal in affiliate context
```

Affiliate work must not be tested only against the internal ACE flow.
