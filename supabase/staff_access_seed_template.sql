-- Staff Access Seed Template
-- Run AFTER supabase/staff_access_v1.sql.
-- Replace the placeholder phrases before running.
-- The actual phrases are not stored. Supabase stores only cryptographic hashes.

insert into public.staff_access_keys (label, store_id, store_name, role, access_hash)
values
  ('Top Admin Access', null, null, 'top_admin', encode(digest('REPLACE_WITH_TOP_ADMIN_PHRASE', 'sha256'), 'hex')),
  ('Tropicana Store Access', '18228', 'Helpful ACE - Tropicana', 'store', encode(digest('REPLACE_WITH_TROPICANA_PHRASE', 'sha256'), 'hex')),
  ('Horizon Ridge Store Access', '18507', 'Helpful ACE - Horizon Ridge', 'store', encode(digest('REPLACE_WITH_HORIZON_RIDGE_PHRASE', 'sha256'), 'hex')),
  ('Rainbow Store Access', '18690', 'Helpful ACE - Rainbow', 'store', encode(digest('REPLACE_WITH_RAINBOW_PHRASE', 'sha256'), 'hex')),
  ('Green Valley Store Access', '19117', 'Helpful ACE - Green Valley', 'store', encode(digest('REPLACE_WITH_GREEN_VALLEY_PHRASE', 'sha256'), 'hex'))
on conflict (access_hash) do nothing;

select id, label, store_id, store_name, role, is_active, created_at
from public.staff_access_keys
order by role desc, store_id nulls first, label;
