# Staff Access Worker Implementation Notes

The Supabase schema and seed data are in place. The next implementation step is to update `api/worker.js` to support session-based staff access.

Target endpoints:

- POST /api/staff/login
- POST /api/staff/logout
- POST /api/staff/access/list
- POST /api/staff/access/create
- POST /api/staff/access/rotate
- POST /api/staff/access/deactivate
- POST /api/staff/access/reactivate

The quote endpoints should then validate the temporary staff session token instead of sending the raw passphrase on every request.
