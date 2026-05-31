-- Vendor packet / vendor order workflow tracking
-- Run this in the Supabase SQL editor before enabling automatic vendor packet emails.

alter table public.quotes
  add column if not exists vendor_packet_status text not null default 'not_sent',
  add column if not exists vendor_packet_token text,
  add column if not exists vendor_packet_token_hash text,
  add column if not exists vendor_packet_token_created_at timestamptz,
  add column if not exists vendor_packet_sent_to_store_at timestamptz,
  add column if not exists vendor_packet_sent_to_store_email text,
  add column if not exists vendor_packet_opened_at timestamptz,
  add column if not exists vendor_packet_opened_by text,
  add column if not exists vendor_packet_last_error text,
  add column if not exists vendor_order_sent_to_vendor_at timestamptz,
  add column if not exists vendor_order_sent_to_vendor_by text,
  add column if not exists vendor_order_sent_to_vendor_method text,
  add column if not exists vendor_order_sent_to_vendor_notes text;

create unique index if not exists quotes_vendor_packet_token_hash_idx
  on public.quotes (vendor_packet_token_hash)
  where vendor_packet_token_hash is not null;

create index if not exists quotes_vendor_packet_status_idx
  on public.quotes (vendor_packet_status);

alter table public.quotes
  drop constraint if exists quotes_vendor_packet_status_check;

alter table public.quotes
  add constraint quotes_vendor_packet_status_check
  check (vendor_packet_status in (
    'not_sent',
    'sent_to_store',
    'opened_by_store',
    'sent_to_vendor',
    'send_failed'
  ));
