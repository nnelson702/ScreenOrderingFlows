# Vendor Form Mapping V1

Source forms confirmed current by user:

- `PHX Screen Order Form.pdf`
- `PHX Patio Door Order Form.pdf`

## Build rule

Vendor forms should only be generated from operational orders, not unpaid quotes.

Allowed quote statuses:

- `in_production`
- `ready`
- `completed`

Blocked quote statuses:

- `quote_created`
- `cancelled`
- `expired`

## Window screen form mapping

Template title: `SCREEN ORDER FORM`

Header fields:

- Dealer: Skye ACE Hardware / selected store name
- Date: current generation date
- Phone: selected store phone
- Sales Order: generated internal sales/order reference
- Job Name/P.O.#: quote/order identifier or editable staff value
- Total # of Screens: sum of window screen quantities on the generated form set
- Branch: mark `VEGAS`
- Page: current page and total pages

Option fields:

- Cut type: mark one of `MITRE CUT` or `STRAIGHT CUT`
- Frame color: mark matching frame color
- Frame size: mark matching frame/frame type
- Fabric type: mark material/fabric type and material color
- Spreader bar size: mark `3/4 HG` or `5/16X3/4` when crossbar/spreader bar is needed

Line-item fields:

- Qty
- Width
- Height
- Hardware
- Drawing reference / diagram area

Pagination/splitting rules:

- Window and patio door forms are always separate.
- Group only compatible items on the same form page.
- Start a new window screen page when cut type, frame size, frame color, fabric type/color, or spreader bar size changes.
- Flatten identical line items into one row with quantity.
- Leave unused rows blank.

## Patio door form mapping

Template title: `PATIO DOOR ORDER FORM`

Header fields:

- Dealer: Skye ACE Hardware / selected store name
- Date: current generation date
- Phone: selected store phone
- Sales Order: generated internal sales/order reference
- Job Name/P.O.#: quote/order identifier or editable staff value
- Total # of Doors: sum of patio door quantities on the generated form set
- Branch: mark `VEGAS`
- Page: current page and total pages

Option fields:

- Door type: mark matching door frame/type
- Rollers: mark `NYLON` or `STEEL`; default steel when applicable
- Handle placement: use handle orientation/placement value from quote item
- Other: staff comments / exceptions
- Fabric type: mark material/fabric type and material color

Line-item fields:

- Qty
- Width
- Height
- Comments
- Drawing reference / diagram area

Pagination/splitting rules:

- Patio door forms are separate from window screen forms.
- Group only compatible items on the same form page.
- Start a new patio door page when door type, material/fabric type/color, rollers, or handle placement changes.
- Handle orientation is a pagination trigger.
- Flatten identical line items into one row with quantity.
- Leave unused rows blank.

## Required generation approach

Use the uploaded PDFs as non-fillable visual templates and stamp generated values/checkmarks/text/diagrams onto copies.

Staff portal flow:

1. Staff opens an in-production quote.
2. Staff clicks `Generate Vendor Forms`.
3. Worker/API validates staff session and quote status.
4. System returns window and/or patio door vendor form PDFs.
5. Staff can download/print the package.

## Outstanding implementation details

- Choose server-side PDF generation strategy compatible with Cloudflare Worker constraints.
- Store the source template PDFs or rebuild the forms as generated PDFs.
- Add staff header-edit fields before final generation.
- Add diagram rendering for hardware initials and spreader/crossbar placement.
