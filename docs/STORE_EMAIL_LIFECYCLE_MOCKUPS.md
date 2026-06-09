# Store Email Lifecycle Mockups

## Purpose

This document defines the store-facing email lifecycle before any code changes are made.

Store emails should be plain, operational, and action-focused. They are not customer marketing emails.

## Design rule

Use a simple layout:

```text
STATUS NAME
Primary signal
Action required
Next steps
Customer/search details
Order/store details
Links/forms where applicable
```

No heavy imagery, marketing blocks, or visual service tiles.

## Data rule

These mockups use only existing quote/order data points already collected by the flow.

No new schema fields are assumed.

## Fake data used in mockups

```text
Quote ID: Q-TEST-1042
Customer: Taylor Morgan
Phone: (702) 555-0148
Email: taylor.morgan@example.com
Address: 5574 Oak Bend Drive, Las Vegas, NV 89135
Store: SKYE-ACE Tropicana
Store email: ACE_18228@skyecos.com
Fulfillment: Pickup or Delivery
Payment method: online or in_store
Total: $224.84
```

---

# 1. Quote Created

## Purpose

A customer screen quote has been created. The customer may or may not complete payment without store assistance.

If the customer has not yet paid on their own, a store representative must make contact within 2 days to ensure the customer does not require assistance and to answer any questions.

## Subject

```text
New Screen Quote Created - Customer Follow-Up Required
```

## Mockup

```text
NEW SCREEN QUOTE CREATED
Customer follow-up required if not paid within 2 days

A customer screen quote has been created.

Action required:
If the customer has not yet paid on their own, a store representative must make contact within 2 days to ensure the customer does not require assistance or have any questions.

Do not begin production until the quote is accepted and paid for.

Customer/search details:
Customer: Taylor Morgan
Phone: (702) 555-0148
Email: taylor.morgan@example.com
Address: 5574 Oak Bend Drive, Las Vegas, NV 89135

Quote details:
Quote ID: Q-TEST-1042
Status: quote_created
Fulfillment: Pickup
Total: $214.84
Selected store: SKYE-ACE Tropicana

Next steps:
1. Watch for payment or dashboard status change.
2. If unpaid after 2 days, contact the customer.
3. Answer questions or assist with order placement.
4. Do not submit vendor forms until the order is paid/in production.
```

---

# 2. Paid / In Production

## Purpose

A customer quote has been accepted and paid for.

This email may be triggered either by:

1. The quote being updated manually to paid/in production within the dashboard.
2. The customer making payment online.

The store must now validate the order and submit to the vendor.

## Subject

```text
Paid Screen Order - Production Started / Vendor Submission Required
```

## Mockup

```text
PAID SCREEN ORDER - PRODUCTION STARTED
Vendor submission required

A customer quote has been accepted and paid for.

Action required:
Use the link in this email to generate the vendor forms, validate that the order matches the dashboard, and submit the order to the vendor.

After vendor submission:
Update the submission status in the dashboard.

Important payment note:
This email may signal either a manual paid/in-production update in the dashboard or automatic online payment by the customer.

If online payment was made, process the sale through POS so the sale is recorded in Business Advisor.

Customer/search details:
Customer: Taylor Morgan
Phone: (702) 555-0148
Email: taylor.morgan@example.com
Address: 5574 Oak Bend Drive, Las Vegas, NV 89135

Order details:
Quote ID: Q-TEST-1042
Status: in_production
Fulfillment: Delivery
Payment method: online
Total: $224.84
Selected store: SKYE-ACE Tropicana

Vendor forms:
Open vendor forms: [Vendor Forms Link]

Dashboard:
Open order in dashboard: [Dashboard/Admin Link if available]

Steps to complete:
1. Open the order in the dashboard.
2. Open/generate the vendor forms from this email.
3. Validate the vendor forms match the dashboard.
4. Submit the order to the vendor.
5. Update vendor submission status in the dashboard.
6. If payment was made online, process the sale through POS for Business Advisor.
```

## Implementation note

Today the system may send a separate vendor packet email. Final implementation should avoid unnecessary confusion. The preferred operating design is for the Paid/In Production store email to clearly surface the vendor forms link and dashboard action path, or for the vendor packet email to be renamed/positioned so it is unmistakably the operational vendor-submission email.

---

# 3. Ready for Pickup / Ready for Delivery Scheduling

## Store email decision

No store email is needed for this stage.

Reason:

The advancement to Ready is done through the dashboard by the employee. The employee already owns the next step and must contact the customer from that workflow. The email should not be their reminder.

## Implementation requirement

When an order is advanced to Ready:

- Continue sending the appropriate customer-facing ready email.
- Do not send a store-facing ready email.

---

# 4. Completed

## Purpose

The store receives a simple confirmation that the order was marked completed in the dashboard.

This email should include customer/search information so the record can be found later in email by customer name, phone, email, address, or quote ID.

## Subject

```text
Screen Order Completed - Q-TEST-1042 - Taylor Morgan
```

## Mockup

```text
SCREEN ORDER COMPLETED
Order Q-TEST-1042 has been marked completed in the dashboard.

No further store action is required from this email.

Customer/search details:
Customer: Taylor Morgan
Phone: (702) 555-0148
Email: taylor.morgan@example.com
Address: 5574 Oak Bend Drive, Las Vegas, NV 89135

Order details:
Quote ID: Q-TEST-1042
Status: completed
Fulfillment: Delivery
Total: $224.84
Selected store: SKYE-ACE Tropicana

Dashboard:
Open order in dashboard: [Dashboard/Admin Link if available]
```

---

# Store email implementation summary

## Send store emails for

```text
Quote Created
Paid / In Production
Completed
```

## Do not send store emails for

```text
Ready for Pickup
Ready for Delivery Scheduling
```

## Acceptance criteria

- Store emails are plain and operational.
- Quote Created email clearly requires customer follow-up within 2 days if unpaid.
- Paid/In Production email clearly requires vendor form generation, dashboard validation, vendor submission, and dashboard status update.
- Paid/In Production email clearly instructs POS processing for online payments so the sale is recorded in Business Advisor.
- Ready status sends no store email.
- Completed email is simple, searchable, and includes customer information.
- No schema changes are required.
