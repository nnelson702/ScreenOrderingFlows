# Staff Access Worker Manual Patch

This document is intentionally stored as documentation because direct Worker replacement may be blocked by the connector. It defines the next backend implementation work.

## Goal

Move staff access from a raw passphrase sent on every request to session-based access:

1. Staff enters access phrase.
2. Worker hashes phrase.
3. Worker checks `staff_access_keys.access_hash`.
4. Worker creates a random session token.
5. Worker stores only `staff_sessions.token_hash`.
6. Browser stores temporary session token in `sessionStorage`.
7. Admin endpoints validate session token.
8. Top admin sessions can manage store access keys.

## Backend endpoints to add

- `POST /api/staff/login`
- `POST /api/staff/logout`
- `POST /api/staff/access/list`
- `POST /api/staff/access/create`
- `POST /api/staff/access/rotate`
- `POST /api/staff/access/deactivate`
- `POST /api/staff/access/reactivate`

## Authorization header

Frontend should send:

```http
Authorization: Bearer <session_token>
```

The Worker should accept either the new session token or the legacy `STAFF_API_KEY` during migration so the dashboard does not break while we transition.

## Required Worker helper functions

- `sha256Hex(value)`
- `newSessionToken()`
- `loginStaff(request, env)`
- `logoutStaff(request, env)`
- `requireStaff(request, env)` upgraded to validate sessions
- `requireTopAdmin(request, env)`
- `listStaffAccess(request, env)`
- `createStaffAccess(request, env)`
- `rotateStaffAccess(request, env)`
- `setStaffAccessActive(request, env, active)`

## UI changes after Worker routes are live

- `staff.html` login calls `/api/staff/login`.
- Store returned session token, not raw phrase.
- Display session label/role in header.
- If role is `top_admin`, show Access Management panel.
- Store users do not see Access Management.
