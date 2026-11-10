-- Text-to-book (app/api/sms/inbound, lib/text-to-book.ts). Server-only tables: RLS on, no policies,
-- so only the service role reads or writes them. The phone number itself is never stored: a
-- sha256 of the pepper (env TEXT_TO_BOOK_PHONE_PEPPER) and the E.164 number, plus the last 4
-- digits for support.

create table if not exists public.text_to_book_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  phone_hash text not null,
  phone_last4 text,
  direction text not null check (direction in ('in', 'out')),
  body text,
  parse_result jsonb,
  reply_body text,
  mode text not null check (mode in ('off', 'dry_run', 'live')),
  link_token text,
  link_opened_at timestamptz
);

create index if not exists text_to_book_messages_phone_created_idx
  on public.text_to_book_messages (phone_hash, created_at desc);
create index if not exists text_to_book_messages_link_token_idx
  on public.text_to_book_messages (link_token) where link_token is not null;

alter table public.text_to_book_messages enable row level security;

create table if not exists public.text_opt_outs (
  phone_hash text primary key,
  opted_out_at timestamptz,
  opted_in_at timestamptz
);

alter table public.text_opt_outs enable row level security;
