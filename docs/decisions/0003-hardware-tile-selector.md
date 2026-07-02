# ADR 0003: Hardware Tile Selector

## Status

Accepted.

## Context

The original hardware selector was too abstract for reliable customer/store use. The business needed image-based hardware selection so users could identify the correct hardware visually.

## Decision

Use image tiles for window hardware selection while keeping the original `#hardwareType` field as the canonical data source.

## Consequences

- Users get a more visual, understandable hardware selector.
- Existing hardware placement and payload logic continues to work.
- `hardware-tiles.js` is now production enhancement code, not disposable patch code.

## Current hardware options

```text
slide_leaf_spring     Slide Leaf Spring      SLS
standard_leaf_spring  Standard Leaf Spring   LS
pull_tab              Pull Tab               PT
bale_clip             Bale Clip              BC
tension_spring        Tension Spring         TS
plunger               Plunger                PL
```

## Current implementation areas

```text
hardware-tiles.js
assets/hardware/*.svg
app.js hardware assignment logic
styles.css hardware layout overrides
```

## Revisit trigger

Revisit if hardware assignment is rebuilt natively in `app.js`, if additional hardware types are added, or if affiliate versions need different hardware catalogs.
