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

The only intentional true layout/content modifications currently approved are:

- Window frame size + frame color selection method.
- Window material + material color selection method.
- Patio door type + color selection method.
- Patio door material + material color selection method.
- Patio door bottom section uses 6 detail rows aligned to A-F diagram cells.
- Patio door handle measurement is shown as compact side notation in comments and as a double-ended measurement indicator in the diagram.

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

Status: visual layout approved and ready to convert from preview into production generator.

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

Current approved direction:

- Keep the source form's drawing area location and size.
- Use a 2-column x 5-row diagram grid to fit ten diagrams.
- Number diagrams 1-10 to associate with detail rows.
- Blank line rows should have blank same-size diagram boxes.
- Hardware badges should be small, inside the frame, and touching the relevant inside perimeter.
- Hardware badges should be distributed evenly along the selected side.
- Crossbar line should be shown where applicable.

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

Status: visual layout approved and locked from `patio-preview-v1.html` after user review.

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

### Patio door type / color

Use the same color-under-type logic approved for window frame selection.

- Door type table has three frame type columns: `ROLLFORMED STEEL`, `STANDARD ALUMINUM`, `SUPREME ALUMINUM`.
- Top row contains the door type labels.
- Second row contains blank entry boxes.
- Selected door color is entered under the selected door type.
- All non-selected door type boxes remain blank.

Example:

- Column header: `STANDARD ALUMINUM`
- Box below: `WHITE`

### Patio material / color

Use the same color-under-material logic approved for window screens.

- Top row contains material labels.
- Second row contains blank entry boxes.
- Selected material color is entered under the selected material.
- All non-selected material boxes remain blank.

Example:

- Column header: `FIBERGLASS`
- Box below: `BLACK`

### Rollers / handle placement / other

- Rollers section remains its own source-form-style selection area.
- Default rollers are `STEEL` unless stored order data specifies nylon.
- Handle placement remains its own source-form-style selection area.
- `XO / LEFT` means left handle placement.
- `OX / RIGHT` means right handle placement.
- `KD DOOR` and `TOP HUNG` live under the `OTHER` section for visual continuity, but current system data collection does not select them.

### Patio door line-item fields

Use six detail rows only because the patio source form has six drawing cells A-F.

Per line:

- Qty
- Height
- Width
- Comments

Compact comments format:

- `Steel rollers, Right: 40"`
- `Nylon rollers, Left: 38"`

Do not use long prose such as:

- `Latch:40" from bottom`
- `Handle is on right side measured from bottom`

### Patio door diagram field

Use six drawing cells only: A-F.

- Cell A corresponds to row 1.
- Cell B corresponds to row 2.
- Cell C corresponds to row 3.
- Cell D corresponds to row 4.
- Cell E corresponds to row 5.
- Cell F corresponds to row 6.
- Unused cells show blank same-size door outlines.
- Used cells show a door frame outline, handle/latch marker, roller markers, and measurement indicator where applicable.

Handle/latch height measurement:

- Measurement is collected from the bottom of the door frame to the middle of the handle/latch.
- Show a vertical measurement line inside the diagram.
- Top arrow should point to handle/latch midpoint.
- Bottom arrow should point to the bottom of the frame, not to the roller.
- Measurement label should be compact, e.g. `40"`.

## Patio door pagination/splitting rules

- Patio door forms are separate from window screen forms.
- Group only compatible items on the same form page.
- Start a new patio door page when door type, door color, material/fabric type, material color, rollers, or handle placement changes.
- Handle orientation is a pagination trigger.
- Flatten identical line items into one row with quantity.
- Leave unused rows and diagram cells blank.
- Use a maximum of six line rows per patio door page.

## Staff portal flow

1. Staff opens an in-production quote.
2. Staff clicks `Generate Vendor Forms`.
3. Worker/API validates staff session and quote status.
4. System returns generated window and/or patio door vendor forms.
5. Staff can download/print the package.

## Outstanding implementation details

- Convert approved patio preview into reusable generator.
- Build browser-printable unified vendor form package first.
- Validate visual layout against the source form, not against redesigned mockups.
- Add staff header-edit fields before final generation.
- Convert print HTML to PDF/download behavior after source-form-faithful layout is approved.
