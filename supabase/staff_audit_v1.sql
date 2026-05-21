-- Staff Audit + Access Guardrails V1
-- Run in Supabase SQL Editor.
-- This migration is intentionally database-level so audit/guardrails remain durable even if the UI changes.

create extension if not exists pgcrypto;

create table if not exists public.staff_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  quote_id uuid,
  access_key_id uuid references public.staff_access_keys(id) on delete set null,
  session_id uuid references public.staff_sessions(id) on delete set null,
  staff_label text,
  staff_role text,
  store_id text,
  old_status text,
  new_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_staff_audit_events_created_at on public.staff_audit_events(created_at desc);
create index if not exists idx_staff_audit_events_quote_id on public.staff_audit_events(quote_id);
create index if not exists idx_staff_audit_events_access_key_id on public.staff_audit_events(access_key_id);
create index if not exists idx_staff_audit_events_event_type on public.staff_audit_events(event_type);
create index if not exists idx_staff_audit_events_store_id on public.staff_audit_events(store_id);

alter table public.staff_audit_events enable row level security;

comment on table public.staff_audit_events is 'Durable audit log for staff/admin access actions and quote status lifecycle changes.';

-- Prevent accidental lockout by blocking deactivation of the final active top-admin access value.
create or replace function public.prevent_last_top_admin_access_deactivation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'top_admin'
     and old.is_active is true
     and new.is_active is false then
    if not exists (
      select 1
      from public.staff_access_keys
      where role = 'top_admin'
        and is_active is true
        and id <> old.id
      limit 1
    ) then
      raise exception 'Cannot deactivate the last active top admin access value';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_last_top_admin_access_deactivation on public.staff_access_keys;
create trigger trg_prevent_last_top_admin_access_deactivation
before update of is_active on public.staff_access_keys
for each row
execute function public.prevent_last_top_admin_access_deactivation();

-- Audit access key creation and changes.
create or replace function public.audit_staff_access_key_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_name text;
begin
  if tg_op = 'INSERT' then
    event_name := 'staff_access_created';
  elsif old.is_active is distinct from new.is_active then
    event_name := case when new.is_active then 'staff_access_reactivated' else 'staff_access_deactivated' end;
  elsif old.access_hash is distinct from new.access_hash then
    event_name := 'staff_access_rotated';
  else
    event_name := 'staff_access_updated';
  end if;

  insert into public.staff_audit_events (
    event_type,
    access_key_id,
    staff_label,
    staff_role,
    store_id,
    metadata
  ) values (
    event_name,
    new.id,
    new.label,
    new.role,
    new.store_id,
    jsonb_build_object(
      'store_name', new.store_name,
      'is_active', new.is_active,
      'created_by_access_key_id', new.created_by_access_key_id,
      'rotated_at', new.rotated_at,
      'revoked_at', new.revoked_at,
      'operation', tg_op
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_audit_staff_access_key_insert on public.staff_access_keys;
create trigger trg_audit_staff_access_key_insert
after insert on public.staff_access_keys
for each row
execute function public.audit_staff_access_key_change();

drop trigger if exists trg_audit_staff_access_key_update on public.staff_access_keys;
create trigger trg_audit_staff_access_key_update
after update on public.staff_access_keys
for each row
when (
  old.access_hash is distinct from new.access_hash
  or old.is_active is distinct from new.is_active
  or old.label is distinct from new.label
  or old.store_id is distinct from new.store_id
  or old.store_name is distinct from new.store_name
  or old.role is distinct from new.role
)
execute function public.audit_staff_access_key_change();

-- Audit quote status lifecycle changes. This catches status updates from staff, Stripe webhook, or future tools.
create or replace function public.audit_quote_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.staff_audit_events (
      event_type,
      quote_id,
      store_id,
      old_status,
      new_status,
      metadata
    ) values (
      'quote_status_changed',
      new.id,
      new.store_id,
      old.status,
      new.status,
      jsonb_build_object(
        'customer_name', new.customer_name,
        'customer_email', new.customer_email,
        'store_name', new.store_name,
        'payment_method', new.payment_method,
        'pos_receipt_number', new.pos_receipt_number,
        'paid_at', new.paid_at,
        'ready_at', new.ready_at,
        'completed_at', new.completed_at,
        'cancelled_at', new.cancelled_at,
        'expired_at', new.expired_at,
        'status_updated_at', new.status_updated_at
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

-- Quick verification queries.
select 'staff_audit_events ready' as result, count(*) as existing_audit_events
from public.staff_audit_events;

select id, label, role, is_active
from public.staff_access_keys
where role = 'top_admin'
order by created_at;
