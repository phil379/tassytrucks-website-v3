-- "Where is my ride" links: /ride/<token>, texted by TassyOps when a trip is assigned.
--
-- token_hash   sha256 (hex) of a 32-byte random token. The raw token is never stored; it exists only
--              in the text message and the rider's address bar. Bound to exactly one trip.
-- expires_at   hard cap set at mint time: scheduled pickup + 24h (at least mint time + 2h). The page
--              also stops working 2h after the trip ends (completed_at), whichever comes first.
-- revoked_at   set when a newer link is minted for the same trip, so only the newest link works.
--
-- Server-only, like the rest of the schema: RLS on and NO policies, so anon/authenticated keys
-- cannot read or write it. The site uses the service role, which bypasses RLS.
-- Additive: nothing existing changes.

create table if not exists public.ride_tracking_tokens (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trip_requests (id) on delete cascade,
  token_hash  text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  audience    text not null default 'rider' check (audience in ('rider', 'family')),
  constraint ride_tracking_tokens_hash_format check (token_hash ~ '^[0-9a-f]{64}$')
);

-- One text per audience per ride (Phil, 2026-11-12): at most one live link per trip and audience.
create unique index if not exists ride_tracking_tokens_one_per_audience
  on public.ride_tracking_tokens (trip_id, audience)
  where revoked_at is null;

create unique index if not exists ride_tracking_tokens_token_hash_key
  on public.ride_tracking_tokens (token_hash);

create index if not exists ride_tracking_tokens_trip_idx
  on public.ride_tracking_tokens (trip_id);

alter table public.ride_tracking_tokens enable row level security;

comment on table public.ride_tracking_tokens is
  'Private "where is my ride" links (/ride/<token>). Only the sha256 of the token is stored. Server-only: RLS on, no policies.';
comment on column public.ride_tracking_tokens.token_hash is
  'sha256 hex of the 32-byte random token. The raw token is never stored.';
comment on column public.ride_tracking_tokens.expires_at is
  'Hard cap: scheduled pickup + 24h (min mint + 2h). The page also expires 2h after trip_requests.completed_at.';
comment on column public.ride_tracking_tokens.audience is
  'rider = the booker (texted at assignment, any hour); family = confirmed family numbers (texted only while the ride is active).';
