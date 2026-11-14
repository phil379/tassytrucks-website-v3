# PR 2 is blocked: PR 1 (Renew) is not merged yet

Date: 2026-11-14. Written by Muse under the PR 2 contract (Phase 0, step 1).

## The blocker

PR 2 (clinic-confirmation question on the /request form for Renew visitors)
requires PR 1 to be merged first. PR 1 is open as
[PR #92](https://github.com/phil379/tassytrucks-website-v3/pull/92)
(branch `fix/muse-renew-pr1-2026-11-14`, commit `714fbafd`), **not merged**
as of this writing. The live /renew page therefore does not yet carry
`utm_source=renew` on its CTAs, so the question PR 2 adds would have no
Renew visitors to trigger on. Per the PR 2 contract: STOP, do not build PR 2.

## What PR 1 contains (for the re-run)

- Tassy Wellness & Med-Spa naming, clinic-first wording, `utm_source=renew`
  on all three /renew CTAs via a new `requestRenew` export in
  `lib/request-links.ts`, honest soft standing-plan line.
- 5 files: `app/renew/page.tsx`, `lib/request-links.ts`, `public/llms.txt`,
  `scripts/test-renew-links.ts` (new), `package.json` (test:unit chain).
- Local verification Nov 14: typecheck clean, test:unit pass including the
  new renew-links test. No production bookings created by PR 1 itself.

## What still holds for the PR 2 re-run (verified Nov 14)

- `RequestForm` stamps page path + query onto `trip_requests.source`
  (`components/request/RequestForm.tsx:335-336`, `:788`;
  `app/api/trip-request/route.ts:431`, `:596`).
- `trip_details` is JSONB on `trip_requests`; the board in tassytrucksops
  reads it. PR 2's keys (`clinic_confirmation`, `needs_dispatch_call`)
  belong in the concierge and recovery tripDetails zod schemas.
- PR 1's attribution is being verified live separately (a marked test
  booking via `/request?service=concierge&utm_source=renew`, no payment,
  no ride). Its result does not unblock PR 2; only the PR 1 merge does.

## Not yet verified — do on the re-run

- Phase 0 step 2: how `validateDetails` handles unknown keys for concierge
  and recovery (strict vs passthrough), and the exact schema lines to add
  the two keys to.
- Phase 0 step 3: how the form reads `utm_source` from the URL today.
- Whether the concierge/recovery confirmation email lists ride details
  (decides change 5).

## Unblock

1. Phil reviews PR #92 against ChatGPT's requirements and merges it.
2. Confirm the deploy: live /renew CTAs carry `utm_source=renew`.
3. Re-run the PR 2 contract from Phase 0. Do not reuse this branch for the
   PR 2 work; start a fresh branch from the then-current main.
