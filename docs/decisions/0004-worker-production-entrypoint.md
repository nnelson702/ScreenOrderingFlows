# ADR 0004: Durable Worker Production Entrypoint

## Status

Accepted.

## Context

During hardening, a temporary `worker-diagnostics.js` wrapper was used to diagnose quote creation and protect vendor packet behavior.

After the system stabilized, leaving a diagnostic wrapper as the production entrypoint was not appropriate long term.

## Decision

Remove the temporary diagnostics wrapper and use a durable production entrypoint:

```text
api/worker-production.js
```

Wrangler should point to:

```text
"main": "worker-production.js"
```

## Consequences

- Diagnostic quote-create headers/logging are no longer part of the production entrypoint.
- Required production guard behavior remains in a purposeful entrypoint file.
- Core `worker.js` remains the main API implementation.

## Preserved behavior

`worker-production.js` preserves:

```text
same-status lifecycle email idempotency
in_production vendor packet suppression behavior
```

## Removed file

```text
api/worker-diagnostics.js
```

## Revisit trigger

Revisit if the same-status email guard and vendor packet behavior are moved cleanly into `api/worker.js` with tests.
