# Forms and consent audit (2026-10-24)

Read from the code, not the live site. Not legal advice. "Needed" means the ride cannot be done without it.

| Form | Where it sends data | Fields that look unnecessary | Consent / privacy link | Changed in this PR |
|---|---|---|---|---|
| Ride request (`/request`) | Database (`trip_requests`), operator email (Resend), customer auto-reply, reference-only phone alert | Browser string (`user_agent`) stored on every row; last name arguably only "useful" | Text opt-in box: unticked, separate from Terms, names Tassy, says what for, frequency "varies", STOP/HELP, "message and data rates may apply", links Privacy and Terms. Privacy/Terms links are 44px. | Stopped storing the browser string on the ride row. |
| Tassy Scholar parent wizard (`/school/book/...`) | Database (`students`, `standing_orders`, `trip_requests`), Stripe (parent name/email/phone + student reference) | None found; grade and safety note are optional | Text opt-in box: same checks as above, unticked. No guardian statement (added in the next PR). | none here |
| Custom household request (`/school/household-request`) | Database (`scholar_household_requests`), operator email | "age range" invites exact ages; open notes box had no health warning | "May contact me" box has no Privacy/Terms link and is not a text opt-in (next PR) | none here |
| Facility partner sign-up (`/partners/signup`) | Database (`facilities`, `facility_users`), welcome email, operator email | None (name + work email) | No privacy link before this PR | Added a short use-of-email line and a Privacy link. |
| Rating link (`/rate`) | `tassy_archive.trip_ratings` | n/a | n/a | Not changed. It accepts any trip id with no signed token (low risk: a rating only). |
| Careers applications | Another site (tassytrucksops.vercel.app) | not audited | its own text box not auditable here | Not changed. |

Not collected anywhere in this repo: date of birth for storage (kept only as "18 or older" for card rides), photos, uploads, newsletter sign-ups, ad-tracking IDs.
