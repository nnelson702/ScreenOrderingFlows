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

## Generation approach

Use Option A: rebuild clean generated HTML/PDF forms that visually match the current vendor forms closely enough for operational use.

Do not stamp onto the uploaded PDFs as the primary approach.

The generated forms must preserve the vendor workflow layout and fit ten line items/diagrams per page.

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

### Window option table structure

The generated window form should not use separate checkmark rows for frame size/color or material/color.

Instead, use two compact selection tables.

#### Frame size / frame color table

- Table has eight columns, one column per frame size option.
- Top row contains the frame size labels.
- Second row contains empty entry boxes.
- The selected frame is shown by entering the frame color into the box below the selected frame size.
- All non-selected frame-size boxes remain blank.

Example for white 5/16 x 3/4 frame:

- Column header: `5/16 X 3/4`
- Box below: `WHITE`

#### Material / material color table

- Table has one column per material option.
- Top row contains the material labels.
- Second row contains empty entry boxes.
- The selected material is shown by entering the material color into the box below the selected material.
- All non-selected material boxes remain blank.

Example for black fiberglass screen:

- Column header: `FIBERGLASS`
- Box below: `BLACK`

### Cut type

- Mark one of `MITRE CUT` or `STANDARD CUT` / `STRAIGHT CUT` depending on final label used in the generated form.
- Customer-facing `Standard Cut` maps to the vendor form's standard/straight cut selection unless later corrected.

### Spreader bar / crossbar

- Horizontal crossbar is represented in the line-item note field with compact notation.
- If frame-size-specific spreader bar size is required, mark the correct spreader bar size in the page-level spreader bar section.
- For the 5/16 x 3/4 frame example, mark/select `5/16X3/4` spreader bar size.

### Window line-item fields

Each page must support ten rows.

Per line:

- Line number
- Qty
- Width
- Height
- Compact hardware/crossbar notes

Hardware/crossbar notes must be short enough to fit one row.

Use initials and side abbreviations, not long prose.

Example:

- `Top:SLS, Bott:PT, Hor:18"`

Do not use multi-line notes like:

- `TOP: STEEL SPRINGS`
- `BOTTOM: PULL TABS`
- `CROSS BAR: HORIZONTAL 18" FROM BOTTOM`

### Window diagram field

The drawing field should not be one skinny column with ten tiny stacked diagrams.

Use a dedicated diagram block below or beside the ten line rows with:

- 2 columns
- 5 rows
- 10 total compact diagrams per page
- Each diagram numbered `1` through `10`
- Diagram number corresponds to the matching line-item row number

Do not use arbitrary side letters such as A/B/C/D/E/F on the drawings unless those letters come from a specific vendor requirement. The generated diagrams should use the line number as the association key.

Each diagram should show:

- Screen frame outline
- Hardware initials/marks at the correct side
- Crossbar as a simple horizontal or vertical line at approximate position
- Small line number label in the corner

Example diagram label:

- `#1`

Example hardware marks:

- `SLS` at top edge
- `PT` at bottom edge
- Horizontal crossbar line with small `18"` label if space allows

### Example scenario

- Frame size: `5/16 X 3/4`
- Frame color: `WHITE`
- Material: `FIBERGLASS`
- Material color: `BLACK`
- Hardware: steel springs top, pull tabs bottom
- Cut: standard/straight
- Crossbar: horizontal at 18 inches

Generated vendor notation:

- Frame table: `WHITE` under `5/16 X 3/4`
- Material table: `BLACK` under `FIBERGLASS`
- Cut: standard/straight selected
- Spreader bar: `5/16X3/4`
- Line notes: `Top:SLS, Bott:PT, Hor:18"`
- Diagram: numbered `#1`, not lettered, with SLS top, PT bottom, horizontal crossbar

## Window pagination/splitting rules

- Window and patio door forms are always separate.
- Group only compatible items on the same form page.
- Start a new window screen page when cut type, frame size, frame color, material type, material color, or spreader bar size changes.
- Flatten identical line items into one row with quantity.
- Leave unused rows blank.
- Each page must be capable of ten line items and ten corresponding compact diagrams.

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
- Fabric type: use material/fabric type and material color

Line-item fields:

- Line number
- Qty
- Width
- Height
- Comments / compact notes

Diagram rules:

- Use the same 2-column x 5-row numbered diagram grid concept when diagrams are needed.
- Diagram number corresponds to the patio door line number.
- Do not use arbitrary A/B/C/D/E/F labels.

Pagination/splitting rules:

- Patio door forms are separate from window screen forms.
- Group only compatible items on the same form page.
- Start a new patio door page when door type, material/fabric type/color, rollers, or handle placement changes.
- Handle orientation is a pagination trigger.
- Flatten identical line items into one row with quantity.
- Leave unused rows blank.

## Staff portal flow

1. Staff opens an in-production quote.
2. Staff clicks `Generate Vendor Forms`.
3. Worker/API validates staff session and quote status.
4. System returns generated window and/or patio door vendor forms.
5. Staff can download/print the package.

## Outstanding implementation details

- Build browser-printable HTML forms first.
- Validate visual layout and ten-row/ten-diagram fit.
- Add staff header-edit fields before final generation.
- Add diagram rendering for hardware initials and spreader/crossbar placement.
- Convert print HTML to PDF/download behavior after layout is approved.
