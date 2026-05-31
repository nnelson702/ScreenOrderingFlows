# Vendor Packet Workflow V1

## Goal

When an order moves into `in_production`, the system should email the store a secure link to generate/download the vendor forms. The link click should be tracked separately from the email send. Store staff remains responsible for saving/printing the forms and sending them to the vendor.

## Workflow

1. Quote/order status changes to `in_production`.
2. API creates or reuses a quote-specific vendor packet token.
3. API emails the store a vendor packet link.
4. Quote is marked `vendor_packet_status = sent_to_store`.
5. Store opens the link.
6. API validates the token, records `vendor_packet_opened_at`, and returns quote + items for form rendering.
7. Store saves/prints the vendor forms and sends them to the vendor manually.
8. Staff clicks `Mark Sent to Vendor` in the staff portal.
9. Quote is marked `vendor_packet_status = sent_to_vendor` and `vendor_order_sent_to_vendor_at` is recorded.

## Status meanings

- `not_sent`: no vendor packet link has been emailed.
- `sent_to_store`: system emailed the store a vendor packet link.
- `opened_by_store`: store opened the vendor packet link.
- `sent_to_vendor`: staff confirmed the order was sent to the vendor.
- `send_failed`: email send failed.

## Tracking fields

Migration file:

- `supabase/vendor_packet_v1.sql`

Fields added to `quotes`:

- `vendor_packet_status`
- `vendor_packet_token`
- `vendor_packet_token_hash`
- `vendor_packet_token_created_at`
- `vendor_packet_sent_to_store_at`
- `vendor_packet_sent_to_store_email`
- `vendor_packet_opened_at`
- `vendor_packet_opened_by`
- `vendor_packet_last_error`
- `vendor_order_sent_to_vendor_at`
- `vendor_order_sent_to_vendor_by`
- `vendor_order_sent_to_vendor_method`
- `vendor_order_sent_to_vendor_notes`

## Link format

Preferred frontend link:

```text
https://screen-ordering-flow.nnelson.workers.dev/vendor-forms.html?packet_token=<token>
```

Existing staff-session link should remain supported:

```text
https://screen-ordering-flow.nnelson.workers.dev/vendor-forms.html?quote_id=<quote_id>
```

## API endpoints needed

### Public/tokenized packet view

```text
GET /api/vendor-packet/view/<packet_token>
```

Behavior:

- Hash token.
- Lookup quote by `vendor_packet_token_hash`.
- Only allow statuses `in_production`, `ready`, `completed`.
- Load quote + quote_items.
- If packet is not already `sent_to_vendor`, update:
  - `vendor_packet_status = opened_by_store`
  - `vendor_packet_opened_at = now`
  - `vendor_packet_opened_by = store_email or packet_link`
- Return `{ ok: true, quote, items }`.

### Staff mark sent to vendor

```text
POST /api/vendor-packet/mark-sent-to-vendor
```

Requires staff authorization.

Request body:

```json
{
  "quote_id": "...",
  "method": "email",
  "notes": "optional"
}
```

Behavior:

- Require staff session.
- Update quote:
  - `vendor_packet_status = sent_to_vendor`
  - `vendor_order_sent_to_vendor_at = now`
  - `vendor_order_sent_to_vendor_by = staff.label or staff.store_name`
  - `vendor_order_sent_to_vendor_method = method || 'email'`
  - `vendor_order_sent_to_vendor_notes = notes || null`

### Optional manual resend

```text
POST /api/vendor-packet/send-to-store
```

Requires staff authorization.

Behavior:

- Create/reuse token.
- Email the link to `quote.store_email`.
- Update sent fields and status.

## Backend trigger

Inside `updateQuoteStatus`:

- Detect transition into `in_production`.
- Send vendor packet link only on transition, not on every update while already in production.
- Do not overwrite `sent_to_vendor` if already marked.

Inside Stripe webhook:

- When Stripe changes the quote to `in_production`, also trigger the vendor packet email.

## Email copy

Subject:

```text
Vendor Forms Ready - <customer_name>
```

Body should include:

- Customer name
- Store name
- Quote ID
- Order total
- Open Vendor Forms link
- Instruction: save/print vendor packet and send it to ScreenFab/vendor, then mark sent in the staff portal.

## Staff portal UI

In selected quote detail, show a vendor packet badge:

- `Vendor Packet: Not Sent`
- `Vendor Packet: Sent to Store`
- `Vendor Packet: Opened by Store`
- `Vendor Packet: Sent to Vendor`
- `Vendor Packet: Send Failed`

Add staff action buttons where selected quote status is operational:

- `Resend Packet to Store`
- `Mark Sent to Vendor`

Keep existing backup button:

- `Generate Vendor Forms`

## Guardrails

- Link click means opened by store, not sent to vendor.
- Only manual staff confirmation means sent to vendor.
- Do not auto-email vendor directly in V1.
- Do not require staff session for packet-token link viewing.
- Do not expose packet token in dashboard tables unless needed for debugging.
