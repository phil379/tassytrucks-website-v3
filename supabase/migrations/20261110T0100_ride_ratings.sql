-- Post-ride ratings (feature flag RATINGS_ENABLED, off by default).
-- Additive only: two new tables, nothing existing is altered.
--
-- ride_ratings        one rating per trip (unique on trip_id), score 1-5, optional plain-text comment.
-- ride_rating_tokens  the private link a rider is sent: /rating/<token>. Only the sha256 of the token
--                     is stored, never the token itself. Each token is bound to one trip and expires
--                     14 days after it is minted (set by the website, lib/ride-ratings.ts).
--
-- Server-only like the rest of the schema: RLS on, NO policies, so only the service role reaches
-- these tables. Ratings never touch driver pay; nothing here references a pay table or column.
--
-- The older smiley flow (/rate, tassy_archive.trip_ratings) is untouched by this file.

create table if not exists public.ride_ratings (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trip_requests (id) on delete cascade,
  score       smallint not null check (score between 1 and 5),
  comment     text check (comment is null or char_length(comment) <= 1000),
  rater_type  text not null default 'customer' check (rater_type in ('customer', 'facility')),
  created_at  timestamptz not null default now(),
  constraint ride_ratings_trip_id_key unique (trip_id)
);

create index if not exists ride_ratings_created_idx on public.ride_ratings (created_at desc);
create index if not exists ride_ratings_score_idx on public.ride_ratings (score, created_at desc);

alter table public.ride_ratings enable row level security;

comment on table public.ride_ratings is
  'Post-ride rating, one per trip. Written only by the website (service role) from /rating/<token>. Never affects driver pay.';
comment on column public.ride_ratings.comment is
  'Optional rider comment, trimmed, max 1000 characters, stored as plain text.';

create table if not exists public.ride_rating_tokens (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trip_requests (id) on delete cascade,
  token_hash  text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  constraint ride_rating_tokens_token_hash_key unique (token_hash)
);

create index if not exists ride_rating_tokens_trip_idx on public.ride_rating_tokens (trip_id);

alter table public.ride_rating_tokens enable row level security;

comment on table public.ride_rating_tokens is
  'Private rating links. token_hash is the hex sha256 of a 32-byte random base64url token; the token itself is never stored.';
comment on column public.ride_rating_tokens.expires_at is
  'Set to created_at + 14 days by the website when the link is minted.';
comment on column public.ride_rating_tokens.used_at is
  'Set when a rating is recorded through this link.';
