-- Staff Access Management V1
-- Run this in Supabase SQL Editor before enabling database-managed staff access.

create extension if not exists pgcrypto;

create table if not exists public.staff_access_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  store_id text,
  store_name text,
  role text not null check (role in ('store', 'top_admin')),
  access_hash text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by_access_key_id uuid references public.staff_access_keys(id) on delete set null,
  rotated_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz
);

create table if not exists public.staff_sessions (
  id uuid primary key default gen_random_uuid(),
  access_key_id uuid references public.staff_access_keys(id) on delete set null,
  role text not null check (role in ('store', 'top_admin')),
  label text not null,
  store_id text,
  store_name text,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_staff_access_keys_active_role on public.staff_access_keys(is_active, role);
create index if not exists idx_staff_access_keys_store on public.staff_access_keys(store_id);
create index if not exists idx_staff_sessions_token_hash on public.staff_sessions(token_hash);
create index if not exists idx_staff_sessions_active on public.staff_sessions(expires_at, revoked_at);

alter table public.staff_access_keys enable row level security;
alter table public.staff_sessions enable row level security;

comment on table public.staff_access_keys is 'Shared store/admin staff access phrases stored as hashes only. Actual phrases are never stored.';
comment on table public.staff_sessions is 'Temporary staff portal sessions. Browser stores only the session token; database stores token hash.';
