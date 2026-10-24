-- STAGED, NOT APPLIED. Phil applies this by hand, to the TASSY database only
-- (never the T-Gigs database). Idempotent. After it is applied, set
-- STORE_PRIVACY_REQUESTS = true in lib/privacy-requests.ts so the site starts saving requests.
--
-- A request to see, correct or delete personal information, or to stop messages.
-- Closed to the public: RLS is on and there are NO policies, so only the server's
-- service-role key can read or write it. Anonymous and signed-in website users cannot.

BEGIN;

CREATE TABLE IF NOT EXISTS public.privacy_requests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       text        NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  requester_name  text        NOT NULL,
  requester_email text,
  requester_phone text,
  request_type    text        NOT NULL
                  CHECK (request_type IN ('access','correct','delete','stop_texts','stop_emails','other')),
  details         text,
  status          text        NOT NULL DEFAULT 'received'
                  CHECK (status IN ('received','checking_identity','in_progress','completed','declined')),
  due_at          timestamptz,
  handled_at      timestamptz,
  handled_note    text,
  CONSTRAINT privacy_requests_contact_present
    CHECK (requester_email IS NOT NULL OR requester_phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS privacy_requests_status_due_idx
  ON public.privacy_requests (status, due_at);

ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.privacy_requests FROM anon, authenticated;

COMMENT ON TABLE public.privacy_requests IS
  'Website privacy requests (access/correct/delete/stop messages). Service role only. Nothing deletes customer data automatically.';

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verify after applying (read-only):
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'privacy_requests';          -- expect: t
--   SELECT count(*) FROM pg_policies WHERE tablename = 'privacy_requests';            -- expect: 0
--   SELECT has_table_privilege('anon', 'public.privacy_requests', 'SELECT');          -- expect: f
