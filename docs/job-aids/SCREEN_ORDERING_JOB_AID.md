# Screen Ordering Tool Job Aid

## Purpose

This job aid supports department leads and approved admin portal users who create, review, advance, and close custom screen quotes/orders.

This is the source text version. The distributable Word/PDF versions include screenshots and email example images.

## Audience

- Department leads and approved admin portal users receive personal access codes to the admin portal.
- Employees without admin portal access may assist with register ring-up only under store direction.
- The customer-facing quote tool is currently employee-assisted during beta and can later progress to customer-direct use.

## URLs

```text
Customer quote tool: https://www.screens.helpful.place
Staff/admin portal: https://www.screens.helpful.place/staff
```

## Quick reference

| Topic | Standard |
|---|---|
| Screen SKU | `RESCREEN` - one POS line per quote line item, quantity 1, manually entered line-item price. |
| Delivery SKU | `SCREEND10` - add only when delivery is selected. |
| Online payment POS account | `[Store Eagle Number]85009`, e.g. `185009`, `285009`, `385009`, `485009`. |
| Online account name | `ACE Store # Screen Charge`, with the store number matching the store. |
| Online tender type | Charge. |
| Tax variance | If POS tax is less than platform by under $1.00, leave it. If POS tax is more than platform calculation, adjust one `RESCREEN` line-item price to align the POS total. Do not directly manipulate tax. |

## Status definitions

| Status | Meaning | Action standard |
|---|---|---|
| Quote Created / Submitted | Quote has been placed but is not paid or in production yet. | Review details; follow up if unpaid after 2 days. |
| In Production | Payment has been collected or confirmed, and the screen order is ready to be produced. | Submit vendor order form and mark vendor task complete in admin portal. |
| Ready | Screens are complete and ready for pickup or delivery. | Notify/serve customer and prepare handoff. |
| Completed | Customer has received the order. No further normal action needed. | Finalize in platform after customer receives order. |
| Cancelled | Quote/order should not continue. | Do not produce. |
| Expired | Quote is no longer valid or actionable. | Requote if customer wants to proceed. |

## Guide 1 - Create and submit a quote

1. Open the quote tool.
2. Click **Get Started**.
3. Enter customer name, street address, city, state, ZIP, email, and phone number.
4. Confirm the selected store. The tool may select a store automatically, but the store can be manually changed before continuing.
5. Click **Continue to Quote**.
6. On the dashboard, confirm customer details, selected store, pickup/delivery, and quote totals.
7. Click **Add Screen**.
8. Choose window or patio door.
9. Enter quantity and finished outside dimensions to the nearest 1/8 inch.
10. Select frame type, frame color, material type, and material color.
11. For window screens, place hardware using the hardware image tiles and diagram.
12. For window screens, select crossbar details if needed.
13. For patio doors, select roller type, handle orientation, and handle height from bottom.
14. Click **Save Screen**.
15. Review all line items before submitting.
16. Use **Edit** to correct a draft line item before submission.
17. Use **Remove** if a line item should not be included.
18. Check the measurement acknowledgement box.
19. Click **Submit Quote**.
20. On the success screen, verify Quote ID, customer, store, totals, and line items.

## Guide 2 - Manage orders in admin portal

1. Open the staff/admin portal.
2. Sign in with personal access code.
3. Use **Load Recent** or **Search Dashboard** to find the quote/order.
4. Use filters to narrow by store, status, or customer details.
5. Click a row to inspect selected order details.
6. Verify customer details, store, status, total, line items, payment information, and vendor task status before advancing an order.

## Advancing orders

| Scenario | Platform action | POS action | Vendor/task action |
|---|---|---|---|
| Customer pays online | Auto-advances to In Production. No manual paid-status update required. | Create charge sale to the store screen charge account. | Send vendor order form and mark vendor submission/task complete in admin portal. |
| Customer pays in store | Department lead manually marks In Production and enters POS transaction number. | Traditional register sale using `RESCREEN` and `SCREEND10` if delivery applies. | Send vendor order form and mark vendor submission/task complete in admin portal. |
| Screens received / ready | Mark Ready. | No register action unless payment was not completed properly. | Confirm order is available for pickup/delivery. |
| Customer receives order | Mark Completed. | No additional register action. | Order is closed. |

## Guide 3 - POS process: customer pays in store

1. Start a traditional POS sale.
2. Look up the customer by phone number if the customer has ACE Rewards.
3. Use cash customer if the customer does not have ACE Rewards.
4. For each quote line item, ring SKU `RESCREEN` with quantity 1.
5. Type the quote line-item price manually for that `RESCREEN` line.
6. Do not combine the full screen quote into one `RESCREEN` line.
7. If delivery is selected, add SKU `SCREEND10`.
8. Accept any normally accepted tender type.
9. Print the receipt.
10. Keep the quote and receipt together.
11. Department lead marks the order In Production in the admin portal and enters the POS transaction number.
12. Department lead sends/submits the vendor order form and marks the vendor task complete.

## Guide 4 - POS process: customer paid online

Online payment automatically updates the platform order to In Production. The POS step records the sale internally and supports Business Advisor/accounting recordkeeping.

1. Confirm online payment email/confirmation is available.
2. Create the POS transaction as a charge sale to the store screen charge account.
3. Use account format `[Store Eagle Number]85009`: `185009`, `285009`, `385009`, or `485009`.
4. Account name format is `ACE Store # Screen Charge`.
5. For each quote line item, ring SKU `RESCREEN` with quantity 1 and manually enter the quote line-item price.
6. If delivery is selected, add SKU `SCREEND10`.
7. Tender type is Charge.
8. Print invoice.
9. Email/store-confirm that payment was made and retain the online paid confirmation email with the in-store invoice.
10. Department lead sends/submits the vendor order form and marks the vendor task complete in the admin portal.
11. Field leadership satisfies the charge account weekly and verifies records for accuracy.

## Email examples to include in distributable job aid

The Word/PDF versions include fake-data images based on real email subjects and template wording for:

- Customer quote created / action required to place order.
- Store new quote created / follow-up required if unpaid after 2 days.
- Store paid order / vendor submission required.
- Customer ready for pickup.

## Final quality checklist

- Customer, store, Quote ID, and totals are correct before submission.
- Each quote line item is reviewed before Submit Quote.
- Each POS line item uses `RESCREEN` quantity 1 and the quote line-item price.
- Delivery uses `SCREEND10` only when delivery is selected.
- Online-paid orders are processed as charge sales to the correct store screen charge account.
- In-store paid orders are manually marked In Production with POS transaction number.
- Vendor order form is sent/submitted and the task is marked complete.
- Ready means the screens are complete and available for pickup/delivery.
- Completed means the customer has received the order.
