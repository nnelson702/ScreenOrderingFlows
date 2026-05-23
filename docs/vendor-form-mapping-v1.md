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

Critical design constraint: the generated vendor forms must remain tight to the original vendor copy and layout.

The only intentional true layout/content modification currently approved is:

- Frame size + frame color selection method.
- Material + material color selection method.

Everything else should look exactly like the source vendor form unless the user explicitly approves a future change.

Do not redesign the form into a new internal layout. Do not move major sections. Do not add new large sections. Do not change the visual hierarchy. The generated version should feel like the original Screen Fab / PHX form with automated fill behavior.

## Approved modification: frame/material color selection

### Frame size / frame color table

Replace the original separate frame size and frame color selection behavior with a compact table:

- Table has one column per frame size option.
- Top row contains the frame size labels.
- Second row contains empty entry boxes.
- The selected frame is shown by entering the frame color into the box below the selected frame size.
- All non-selected frame-size boxes remain blank.
- Keep this table in the same approximate area and footprint as the original frame section.

Example for white 5/16 x 3/4 frame:

- Column header: `5/16 X 3/4`
- Box below: `WHITE`

### Material / material color table

Replace the original separate material and material color selection behavior with a compact table:

- Table has one column per material option.
- Top row contains the material labels.
- Second row contains empty entry boxes.
- The selected material is shown by entering the material color into the box below the selected material.
- All non-selected material boxes remain blank.
- Keep this table in the same approximate area and footprint as the original fabric/material section.

Example for black fiberglass screen:

- Column header: `FIBERGLASS`
- Box below: `BLACK`

## Not approved without separate confirmation

These are not approved as automatic redesign choices:

- Reordering the lower line-item/drawing area.
- Turning the form into a two-panel internal dashboard style.
- Moving the spreader bar section away from its original area.
- Adding a large hardware/options block if the original form does not already have one.
- Replacing the source form's drawing region with a dominant diagram panel.
- Removing original vendor copy or substituting new wording where not required.

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

Header field placement and labels should match the source vendor form.

### Cut type

- Mark one of `MITRE CUT` or `STANDARD CUT` / `STRAIGHT CUT` depending on the exact label used in the source form.
- Customer-facing `Standard Cut` maps to the vendor form's standard/straight cut selection unless later corrected.
- Keep cut type in the same position as the source form.

### Spreader bar / crossbar

- Use the source form's spreader bar area and labels.
- For the 5/16 x 3/4 frame example, mark/select `5/16X3/4` spreader bar size if that matches the source form option.
- Do not move the spreader bar area unless the user approves it after seeing a visual mockup.

### Window line-item fields

The lower line-item area should stay visually matched to the source form.

Per line:

- Qty
- Width
- Height
- Hardware / notes field as provided by the source form
- Drawing field as provided by the source form

Hardware/crossbar notes should be compact enough to fit the source form row space.

Use initials and side abbreviations, not long prose.

Example:

- `Top:SLS, Bott:PT, Hor:18"`

Do not use multi-line notes like:

- `TOP: STEEL SPRINGS`
- `BOTTOM: PULL TABS`
- `CROSS BAR: HORIZONTAL 18" FROM BOTTOM`

### Window diagram field

The diagram/drawing area should preserve the source form structure as closely as possible.

Current direction:

- Keep the source form's drawing area location and size as the default.
- Use numbered diagrams only as an association aid if multiple diagrams are needed.
- Do not use arbitrary side letters such as A/B/C/D/E/F unless those letters are present in the source form or later required by the vendor.
- If a 2-column x 5-row diagram grid is needed to fit ten diagrams, it must be placed inside the original drawing area/footprint as closely as possible and must not change the overall form layout.

Each diagram should show:

- Screen frame outline
- Hardware initials/marks at the correct side
- Crossbar as a simple horizontal or vertical line at approximate position
- Small line number label if needed to connect diagram to row

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
- Diagram: frame outline with SLS top, PT bottom, horizontal crossbar

## Window pagination/splitting rules

- Window and patio door forms are always separate.
- Group only compatible items on the same form page.
- Start a new window screen page when cut type, frame size, frame color, material type, material color, or spreader bar size changes.
- Flatten identical line items into one row with quantity.
- Leave unused rows blank.
- Maintain the original form's row count and layout unless the source form or user-approved mockup requires otherwise.

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

Header field placement and labels should match the source vendor form.

Option fields:

- Door type: source form's door type area
- Rollers: source form's roller area; default steel when applicable
- Handle placement: source form's handle placement area
- Other: source form's other/comment field
- Fabric/material type and color: use the same approved color-under-material table logic only if it is needed and fits the source form without changing the form structure

Line-item fields:

- Qty
- Width
- Height
- Comments / compact notes using the source form field structure
- Drawing reference / diagram using the source form field structure

Diagram rules:

- Preserve the original patio door form's drawing/comment structure as closely as possible.
- Do not convert to a numbered grid unless the source form cannot support the required item count and the user approves the mockup.
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
- Validate visual layout against the source form, not against redesigned mockups.
- Add staff header-edit fields before final generation.
- Add diagram rendering for hardware initials and spreader/crossbar placement.
- Convert print HTML to PDF/download behavior after source-form-faithful layout is approved.
