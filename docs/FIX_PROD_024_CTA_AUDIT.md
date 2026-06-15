# FIX_PROD_024 — marketing → SaaS CTA audit

Phil: public visitors land in the SaaS admin shell. Root cause: customer CTAs pointed at
`/quick-book` (the AUTHENTICATED admin "log a one-off" tool) instead of `/book` (the public
6-service picker), plus dead `/driver-apply` / `/sales-rep-apply` / `/facility-partners/...`.

All deep-links flow through `lib/saas-links.ts` (one front door). Every CTA carries `?source=web`.

| CTA (where) | BEFORE (broken) | live status | AFTER (fixed) | status |
|---|---|---|---|---|
| "Book a Ride" — Header (sticky) | `/quick-book` (admin shell) | 200 but auth/admin | `book.ride` = `/book` (public picker) | ✅ |
| "Book a Ride" — hero (page.tsx:87) | `/quick-book` | admin | `/book` | ✅ |
| "Book a Ride" — mid CTA (page.tsx:343) | `/quick-book` | admin | `/book` | ✅ |
| "Drive with Tassy" — Footer | `/driver-apply` | **404** | `apply.driver` = `/careers/driver` (NEW public route) | ✅ |
| "Become a sales rep" — Footer | `/sales-rep-apply` | **404** | `apply.salesRep` = `/careers/sales-rep` (NEW public route) | ✅ |
| "Facility partners" — Footer | `/facility-partners/request-access` | **404** | `apply.facility` = `/facility/signup` (one front door) | ✅ |
| "Request a partnership call" — home (page.tsx:249) | `/facility-partners/request-access` | 404 | `/facility/signup` | ✅ |
| "Facility portal" — Footer | `/facility` (auth-walls public) | 200 auth-wall | relabeled **"Existing facility · Sign in"** → `/login?intent=facility` | ✅ |
| "Get started · no credit card" — Footer band / partner CTAs | `/facility/signup` | 200 public ✓ | unchanged | ✅ |
| "Sign in" — Header + Footer | `/login` | 200 ✓ | unchanged | ✅ |
| Service-page hero CTAs (nemt/vip/winnie/recover/renew/school) | `/book/{service}` | 200 ✓ | unchanged (already correct) | ✅ |

## SaaS-side changes (the only SaaS touch this run)
- NEW PUBLIC routes `src/routes/careers.driver.tsx` + `careers.sales-rep.tsx` (no `_authenticated`
  prefix → no auth wall, no sidebar; verified: 0 sidebar, 0 "VIEWING AS", form present).
- `src/lib/careers-public.functions.ts` — `submitDriverApplication` / `submitSalesRepApplication`,
  PUBLIC, degrade to `audit_logs` (the `*_applications` tables don't exist — staged in
  `docs/migrations_pending/FIX_PROD_024_applications.sql`; see FIX_BLOCKED doc).

## Deferred (documented, low-risk)
- `/login?intent=facility` label customization NOT applied — the link works (param ignored);
  skipped touching the auth-critical FIX_PROD_015 login for a purely cosmetic label.

## Result
0 public CTAs land in the admin shell. 0 404 footer links (was 3). `/quick-book` untouched
(still the legitimate admin tool — just no longer linked from public surfaces).
