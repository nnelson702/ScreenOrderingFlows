-- Normalize legacy submitted quote statuses.
-- Run in Supabase SQL Editor after staff dashboard durability cleanup is deployed.
-- This keeps old test/customer quotes visible under the formal Quote Created status.

update public.quotes
set
  status = 'quote_created',
  status_updated_at = coalesce(status_updated_at, now())
where status = 'submitted';

select
  status,
  count(*) as quote_count
from public.quotes
group by status
order by status;
