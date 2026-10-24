-- STAGED, NOT APPLIED. Phil applies this by hand, to the TASSY database only
-- (never the T-Gigs database). Idempotent. After it is applied, set
-- SUPPRESSION_TABLE_READY = true in lib/email-suppression.ts.
--
-- The do-not-email list. Marketing / outreach email is never sent to an address in this
-- table, and the one-click unsubscribe link adds the address here. Closed to the public:
-- RLS on, NO policies, so only the server's service-role key can read or write it.

BEGIN;

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email       text        PRIMARY KEY CHECK (email = lower(email)),
  created_at  timestamptz NOT NULL DEFAULT now(),
  source      text        NOT NULL DEFAULT 'unsubscribe_link'
);

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_suppressions FROM anon, authenticated;

COMMENT ON TABLE public.email_suppressions IS
  'Do-not-email list for marketing/outreach email. Service role only.';

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verify after applying (read-only):
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'email_suppressions';         -- expect: t
--   SELECT count(*) FROM pg_policies WHERE tablename = 'email_suppressions';           -- expect: 0
--   SELECT has_table_privilege('anon', 'public.email_suppressions', 'SELECT');         -- expect: f
