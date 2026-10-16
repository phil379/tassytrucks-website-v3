-- Receipt link: a private, unguessable address for each trip's payment receipt.
--
-- receipt_token         24 random URL-safe characters (144 bits). The receipt page lives at
--                       /r/<token>, so the link in the receipt email, the Stripe "after payment"
--                       redirect and the rider text all point at the same page. Whoever holds the
--                       link can read that one receipt, nothing else. Generated server-side only.
-- payment_method_label  "Visa •••• 4242", looked up from Stripe after payment (best effort). Kept so
--                       the receipt page never has to call Stripe. Brand and last 4 only.
--
-- Additive and nullable: existing rows and old payment links are untouched.

alter table public.trip_requests
  add column if not exists receipt_token text,
  add column if not exists payment_method_label text;

create unique index if not exists trip_requests_receipt_token_key
  on public.trip_requests (receipt_token)
  where receipt_token is not null;

comment on column public.trip_requests.receipt_token is
  'Unguessable token for the private receipt page /r/<token>. Server-generated; never derived from other data.';
comment on column public.trip_requests.payment_method_label is
  'Card brand and last 4 shown on the receipt, e.g. "Visa •••• 4242". Set by the Stripe webhook, best effort.';
