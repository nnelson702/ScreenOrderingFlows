# Helpful ACE Screen Ordering Tool

Foundational build of the multi-phase screen quoting and ordering system.

This repo implements a static single-page app (SPA) served via Cloudflare Pages.
It follows the Screen Tool Product Constitution and is designed to be extended
with Google Sheets/Drive, email, and Stripe integrations.

## Project Structure

```text
/
  index.html      - main SPA markup with all views
  styles.css      - layout and styling
  app.js          - state management, routing, and core logic shell
  _headers        - HTTP headers for Cloudflare Pages (CSP, framing, etc.)
  data/
    config.json   - placeholder config for stores, frame/material options
