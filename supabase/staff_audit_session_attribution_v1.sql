-- Staff Audit Session Attribution V1
-- Run in Supabase SQL Editor.
-- This upgrades quote status audit events to attach the most likely staff session.
-- The Worker updates staff_sessions.last_used_at immediately before staff-protected actions,
-- so this trigger uses the most recent active session as the attribution source.
-- This is a durable bridge until Worker-level explicit audit inserts are added.

create or replace function public.audit_quote_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_session public.staff_sessions%rowtype;
begin
  if old.status is distinct from new.status then
    select *
    into matched_session
    from public.staff_sessions
    where last_used_at is not null
      and last_used_at >= now() - interval '30 seconds'
      and revoked_at is null
    order by last_used_at desc
    limit 1;

    insert into public.staff_audit_events (
      event_type,
      quote_id,
      access_key_id,
      session_id,
      staff_label,
      staff_role,
      store_id,
      old_status,
      new_status,
      metadata
    ) values (
      'quote_status_changed',
      new.id,
      matched_session.access_key_id,
      matched_session.id,
      matched_session.label,
      matched_session.role,
      coalesce(matched_session.store_id, new.store_id),
      old.status,
      new.status,
      jsonb_build_object(
        'customer_name', new.customer_name,
        'customer_email', new.customer_email,
        'store_name', new.store_name,
        'quote_store_id', new.store_id,
        'payment_method', new.payment_method,
        'pos_receipt_number', new.pos_receipt_number,
        'paid_at', new.paid_at,
        'ready_at', new.ready_at,
        'completed_at', new.completed_at,
        'cancelled_at', new.cancelled_at,
        'expired_at', new.expired_at,
        'status_updated_at', new.status_updated_at,
        'attribution_method', case when matched_session.id is null then 'none' else 'recent_staff_session' end,
        'matched_session_last_used_at', matched_session.last_used_at
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_audit_quote_status_change on public.quotes;
create trigger trg_audit_quote_status_change
after update of status on public.quotes
for each row
execute function public.audit_quote_status_change();

create or replace view public.staff_audit_events_recent as
select
  created_at,
  event_type,
  quote_id,
  staff_label,
  staff_role,
  store_id,
  old_status,
  new_status,
  metadata
from public.staff_audit_events
order by created_at desc
limit 200;

select 'staff audit session attribution ready' as result;
