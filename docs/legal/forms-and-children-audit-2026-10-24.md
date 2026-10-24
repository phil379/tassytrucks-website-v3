# Audit B: Forms, SMS consent, children's data
Repo: /home/user/tassytrucks-website-v3 (read-only, code facts only, not legal advice)
Rating key: needed = service cannot be delivered without it; useful = helps, could be dropped; not needed = no clear reason.

## 0. Where submitted data goes (applies to all rows below)
- Database: Supabase via `supabaseAdmin()` (lib/supabase-admin.ts, env `SUPABASE_URL`, service-role key). Default tables: `trip_requests`, `students`, `standing_orders`, `scholar_household_requests`, `facilities`, `facility_users`, `facility_patients`, `sales_prospects`. Ratings go to `tassy_archive.trip_ratings` (app/rate/page.tsx).
- Email: Resend (lib/notifications.ts) to the operator mailbox (`OPERATOR_EMAIL`) with full name/phone/addresses/details, and an auto-reply to the customer.
- Push alerts: ntfy.sh and an optional Zapier webhook. Code says these are "PII-free" (reference number and service name only). Verified for new-request, household and facility alerts.
- Google: address typing goes to Google Places from the browser (components/request/AddressAutocomplete.tsx); pickup/dropoff coordinates go server-side to Google Routes (lib/road-distance.ts).
- Stripe: Scholar parent name, email, phone, plus `student_id` in metadata (lib/school-billing.ts:92-107). Child name is not sent.
- Analytics: Vercel Web Analytics script tag only (app/layout.tsx:123-129). No Google Analytics, Meta pixel, or other trackers found.
- Browser storage: Scholar wizard saves parent + child details in `sessionStorage` while typing (SchoolSetupWizard.tsx:149-170); cleared on submit or tab close.
- No newsletter, marketing-email signup, file upload, or photo upload exists on the site.
- Bot checks on every public form: honeypot `hp_token` (hidden, off-screen, aria-hidden) plus `elapsedMs` minimum fill time (3s; 5s for household form). Exception: Scholar wizard sends a hard-coded empty `hp_token` (SchoolSetupWizard.tsx:227), so it has no real hidden field, only the timer.

## 1. FORM AUDIT

### Forms that are NOT on this site (external)
| Item | Where | Note |
|---|---|---|
| Driver / Companion / CNA / Sales-rep applications | /careers links to `https://tassytrucksops.vercel.app/careers/{driver,companion,cna,sales-rep}?source=web` (lib/saas-links.ts:41-46; app/careers/page.tsx:48-75) | EXTERNAL app, not audited. Careers page itself collects nothing; it only has mailto/tel links. The privacy page (app/privacy/page.tsx:31) and terms (app/terms/page.tsx:41) refer to an SMS box "on a careers form". That box is on the other app, so this repo cannot confirm it. |
| Contact (mailto/tel only) | /partners, /partners/veterinary, /nemt, /recover, /vip, /winnie | `mailto:` links only. No form. |
| /community-rate, /pricing, /compare/*, /charlotte/* | Content pages | No inputs found. They link to /request. |

### 1.1 Ride request form: /request (components/request/RequestForm.tsx, TripDetailsFields.tsx, CareIntakeFields.tsx)
Also reached from /nemt, /recover, /vip, /winnie, /renew, /school (`?service=`), and /facility/request (signed-in facility variant).
Handler: app/api/trip-request/route.ts, schema lib/trip-request.ts. Stored in `trip_requests` (columns plus `trip_details` jsonb and `care_intake` jsonb). Operator email via Resend, customer auto-reply if email given, ntfy ref-only alert.

Core fields (all service lines)
| Field | Req? | Why | Judgment | Notes |
|---|---|---|---|---|
| serviceLine (hidden once preselected) | req | Which service | needed | |
| pickupAddress (+pickupUnit, place id, lat/lng) | req (unit opt) | Pickup | needed | Place id/lat/lng stored too |
| dropoffAddress (+dropoffUnit, place id, lat/lng) | req (unit opt) | Destination | needed | For medical trips the destination itself reveals a clinic. |
| requestedAt | req | Time | needed | Must be 4+ hrs ahead |
| returnTrip / returnAt | opt (returnAt req if ticked) | Return leg | needed | |
| passengers | req (default 1) | Vehicle size | needed | For pets it means number of pets |
| mobility | opt | Wheelchair/walker/carrier | useful (needed for wheelchair) | Mobility is health-adjacent |
| vehicleNotes (max 300) | opt | Prep notes | useful | Warning shown under it: "Please do not include medical details, diagnoses, or procedure names." (lib/trip-request.ts:175-176; RequestForm.tsx ~1025) |
| contactFirstName, contactLastName | req | Who to reach | needed | Last name useful, arguably not needed to dispatch |
| contactPhone | req | Reach rider | needed | |
| contactEmail | opt (req if preferredContact=email) | Receipt/confirmation | useful | |
| preferredContact (phone/text/email) | opt (default phone) | Channel | useful | |
| smsConsent checkbox | opt | See SMS section | n/a | |
| hp_token (honeypot), elapsedMs | hidden | Bot filter | n/a | |
| source (page path + utm) and user-agent | auto | Attribution | not needed | Server stores `source` (500 chars) and browser user-agent on every row (route.ts). Not shown to visitor. |
| estimateShown | auto | Quote shown flag | useful | |
| Facility only: facilityRef, authorizedBy, payer, facilityPatientId | opt | Billing | needed for facilities | Behind facility login. Form says not to enter a medical record number. |

Service-specific "trip details" (lib/trip-details.ts; stored in `trip_requests.trip_details`; also printed in the operator email)
| Service | Field | Req? | Judgment |
|---|---|---|---|
| Care | rider_is (me/family/client) | req | useful |
| Care | rider_first_name | opt | useful (greeting) |
| Care | assistance (curb/door/through) | req | needed |
| Care | pickup_steps, escort, flat_round_trip | opt | useful |
| Care (careIntake) | payer (card only enabled; Medicaid/insurance/VA greyed out and refused server-side) | req | useful |
| Care (careIntake) | **Patient date of birth** | **req** | needed only for the 18+ check. Page says "We check it and do not keep the date" (CareIntakeFields.tsx ~117). Code agrees for card rides: only `age_verified_18_plus` + timestamp stored (lib/care-intake.ts buildCareIntakeRecord). But the DOB is still transmitted to the server and the full intake (DOB, member ID, signed HIPAA consent with IP and user-agent) is built and ready to store when a plan payer is switched on. |
| Care (disabled payers) | medicaidBroker, memberId, authorizationNumber, HIPAA ack, transport consent, typed signature | n/a now | Hidden unless a plan payer is chosen; payer refused by server today. If enabled: stores DOB, member ID, signature name, IP, UA. |
| Recovery | patient_is, patient_first_name, responsible_adult (+name), support_to_car, wait_estimate, home_steps, escort | mixed | useful to needed (safe release). Copy: "We do not ask what the procedure was, and you should not tell us." |
| Concierge | occasion (req), airline, flight_number, greeting, bags, child_seat, bulky_items | mostly opt | useful. flight_number is travel data. |
| Winnie (pet) | pet_name, species, rabies status (req), carrier (req); breed, weight, age, rabies_expires, temperament, pet_notes | mixed | needed/useful. pet_notes warns "Please do not include medical details." |
| Scholar via /request | student_first_name, student_last_name, school_name, schedule (req); grade, days_per_week, car_seat, authorized_adults, accommodations | mixed | See children's section (section 3). |

### 1.2 Facility partner sign-up: /partners/signup (components/partners/FacilitySignupForm.tsx -> app/api/facility-signup/route.ts)
| Field | Req? | Why | Judgment | Stored |
|---|---|---|---|---|
| facilityName | req | Account name | needed | `facilities` |
| workEmail | req | Magic-link sign-in | needed | `facility_users`; welcome email via Resend |
| hp_token (honeypot) / elapsedMs | hidden | Bot filter | n/a | |
| rep, kind, prospect (from URL `?rep= ?type=`), source | auto | Sales attribution / commission | useful | rep slug written to `facilities`; links `sales_prospects` row |
Operator gets an email + ntfy (facility name only). No consent checkbox or privacy link on this form (business email only).

### 1.3 Facility console (login required, not public; checked briefly)
- FacilityWizard.tsx: kind, address, phone, website (opt), primaryContactName, primaryContactPhone (opt), team invites (email + role), billingMode, billingEmail, billingContactName, PO flag.
- PatientForm.tsx -> `facility_patients`: displayName (req), mobility, species/breed (vets), facilityRef ("Room 412", warns no MRN), accessNotes (500 chars, "Getting to the door"). Text states: "We never ask for a diagnosis, a procedure, a date of birth or a medical record number" (PatientForm.tsx:215). DB trigger name `facility_patients_ref_not_mrn` blocks MRN-like refs.
- MessageComposer.tsx: free-text message to dispatch. TeamPanel.tsx: invite emails + role. Judgment: needed for the business use; free-text message and accessNotes are where health info could slip in, and only accessNotes/facilityRef have a warning.

### 1.4 Tassy Scholar parent setup wizard: /school/book/[plan] (components/school/SchoolSetupWizard.tsx -> app/api/school-booking/route.ts)
Gated first by SchoolEligibilityGate (checkboxes for nonstandard households; if any ticked, sent to household form).
| Field | Req? | Why | Judgment | Stored |
|---|---|---|---|---|
| Parent first/last name | req | Account | needed | `students.parent_name`, `trip_requests.contact_name`, Stripe customer |
| Parent email | req | Billing/contact | needed | `students.parent_email`, Stripe |
| Parent phone | req | Contact | needed | `students.parent_phone`, Stripe, `standing_orders.passenger_phone` |
| Home address | req | Pickup | needed | `students.home_address`, standing order pickup |
| Parent SMS checkbox | opt | See SMS | n/a | `students.parent_sms_consent(+_at)` and first trip's `trip_details` |
| Child first + last name | req | Roster, release | needed | `students`, `standing_orders.passenger_name`/`label` |
| Grade | opt ("Optional.") | Group runs | useful | `students.grade` |
| School (picker) + school_id | req | Destination | needed | `students` |
| School address | req (auto-filled from list) | Destination | needed | `students.school_address` |
| Emergency contact name + phone | req on server (UI label does not say required) | Safety | needed | `students.authorized_adults` json (see children section for the issue) |
| safety_note ("Anything your driver should know to keep your child safe?") | opt, 1000 chars | Safety | useful | `students.notes` |
| Schedule (AM/PM times, days, program, programTime, programLocation) | req | Pickup schedule | needed | `students` pickup window, `standing_orders`, `trip_requests.trip_details` |
| 7 policy acknowledgements (checkboxes) with timestamp | req | Terms of service | useful | `trip_requests.trip_details.policies` + policy version |
| Commit/auto-renew authorization checkbox | req | Billing authority | needed | not stored separately (gate only) |
| hp_token | hard-coded empty | n/a | | |
Card: Full Year plan sends parent to Stripe-hosted page to save a card (no card data touches this site). /api/school-card builds that redirect from the `students` row; /school/book/card-saved and card-cancelled pages are display only.

### 1.5 Custom Household Request: /school/household-request (components/school/HouseholdRequestForm.tsx -> app/api/school-household-request/route.ts -> `scholar_household_requests`)
| Field | Req? | Judgment |
|---|---|---|
| Parent or guardian name | req | needed |
| Email | req | needed |
| Mobile number | req | needed |
| Home pickup address | req | needed |
| How many children (1-8) | req | needed |
| Per child: school, grade or age range | req | needed (school), useful (grade). "Age range" invites exact ages. |
| When do you need rides (am/pm/round trip) | req | needed |
| Date to start | req | useful |
| Usual school-day schedule (text, 1500) | req | needed |
| Friday differs (checkbox + text) | opt | useful |
| "Activities, dismissal, destinations or anything else we should know" (text, 2000) | opt | useful, but an open box with NO health warning |
| Reasons checkboxes (10: custody schedules, multiple addresses, etc.) | opt | useful. "Different custody or household schedules" is family-situation data. |
| plan_interest (from URL) | opt | useful |
| Consent checkbox "I agree that Tassy Transportation may contact me about this transportation request." (HouseholdRequestForm.tsx:273-274) | req | Stored as `consent_contact: true`; no separate timestamp column in the insert (only row created_at). Not an SMS consent. No privacy/terms link next to it. |
| hp_token / elapsedMs | hidden | Bot filter |
Operator email contains guardian name, email, phone, child count. Page copy: "This is a request, not a booking." No child names are collected here, only school + grade per child.

### 1.6 Other endpoints that take data
| Endpoint | Accepts | Judgment / note |
|---|---|---|
| GET /rate?t=<tripId>&s=bad/ok/great (app/rate/page.tsx) | Rating via link click from rating email; writes `tassy_archive.trip_ratings` | No text comment. The only key is the trip UUID in the URL (no signed token), so anyone holding a trip id can set a rating. Low privacy risk (rating only). |
| GET /pay/[token] (app/pay/[token]/route.ts) | Receipt token -> Stripe checkout redirect | No form. Rate limited. Tokens are random (lib/receipt-token.ts). |
| GET /r/[token] (receipt page) | Token | Shows name, phone, email, pickup/dropoff to whoever holds the link. Marked noindex, no-referrer. |
| POST /api/stripe/webhook | Stripe-signed events | Not user input. Signature verified. |
| GET /api/schools?q= | Search text | Public lookup of the school list. No personal data. |
| POST /api/distance | pickup/dropoff lat-lng | Stateless; calls Google Routes. Not stored. |
| GET /api/price-list | none | Read-only |
| /ops (password) and POST /api/ops/confirm | Staff login, quote entry | Internal only. |
| /api/cron/* | Cron | Internal. |

## 2. SMS CONSENT
Source of truth: lib/sms-consent.ts. Two opt-ins exist on the site. Careers SMS box is on the external app (not auditable here).

### 2.1 Ride request opt-in (components/request/RequestForm.tsx:1216-1239, rendered only when NOT a facility booking)
- Checkbox label (lib/sms-consent.ts:18): "Text me updates about this ride"
- Disclosure under it (lib/sms-consent.ts:20-24): "By checking this box you agree to receive text messages from Tassy Transportation about this ride: confirmation, driver assigned, driver on the way, arrival, and a rating request. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of booking."
- Links: "Privacy" (/privacy) and "Terms" (/terms) shown directly under the text (RequestForm.tsx:1234-1235).
- Unticked by default: YES (plain `<input type="checkbox" name="smsConsent">`, no `defaultChecked`; RequestForm.tsx:1220-1223).
- Separate from accepting Terms: YES. There is no "I accept the Terms" checkbox on this form; the SMS box is its own control and is "never required".
- Says who texts: yes ("Tassy Transportation"). What for: yes, ride updates (list). Frequency: "Message frequency varies" (no number). STOP/HELP: yes. "Message and data rates may apply": yes. Privacy + Terms links: yes.
- Gaps: no support phone/email in the disclosure itself (privacy page gives book@tassytrucks.com). Says "rating request", which is a feedback prompt; fine but make sure it is within the campaign approved with your SMS carrier/provider.
- Stored with timestamp: YES. `buildSmsConsent` (lib/sms-consent.ts:30-50) writes `sms_consent: true`, `sms_consent_at` (ISO time), `sms_consent_v: "v1"` and `sms_consent_phone` into `trip_requests.trip_details`. Consent is tied to the phone number given and is per request. Facility bookings never get consent (`wantsFacilityBooking ? null`). Not stored: IP address, user-agent for the consent itself, or the exact checkbox wording (only a version string).
- Ambiguity: `preferredContact = "text"` is a separate dropdown choice; it does not set consent. The consent flag does.

### 2.2 Scholar parent opt-in (components/school/SchoolSetupWizard.tsx:434-452, step "About you")
- Label (lib/sms-consent.ts:66): "Text me updates about my child's rides"
- Disclosure (lib/sms-consent.ts:68-72): "By checking this box you agree to receive text messages from Tassy Transportation about your child's Tassy Scholar rides: picked up, dropped off, and ride cancelled. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of booking."
- Links: Privacy and Terms (open in new tab) right after the disclosure (SchoolSetupWizard.tsx:447-449).
- Unticked by default: YES, unless the same parent ticked it earlier in the same browser tab (restored from sessionStorage, line 128).
- Separate from Terms: YES (SMS box is on step 1; policy checkboxes and the commit checkbox are on later steps and do not mention texts).
- Who/what/frequency/STOP/HELP/rates/links: all present, same as above.
- Stored with timestamp: YES. `students.parent_sms_consent = true` and `students.parent_sms_consent_at` (app/api/school-booking/route.ts ~181), plus version `scholar-v1` and phone number in the first trip's `trip_details` (lib/sms-consent.ts:84-98). Code comment says no Scholar parent texts are sent until a provider campaign for them is approved.

### 2.3 Other consent-like boxes
- Household request contact consent (see 1.5): about being contacted by Tassy, not a texting opt-in; wording does not mention text/SMS. If staff text this family from the mobile number given, there is no texting consent on record.
- Opt-out record: STOP/HELP handling lives in the other app (TassyOps/SMS provider); no opt-out storage in this repo. The privacy page claims "We honor opt-out requests and keep a record of consent and opt-out" (app/privacy/page.tsx:32); the opt-out half cannot be verified from this repo.

## 3. CHILDREN'S DATA (Tassy Scholar)

### 3.1 Where child data is collected or stored
| Place | Fields | Who it is meant for |
|---|---|---|
| components/school/SchoolSetupWizard.tsx -> app/api/school-booking/route.ts | child first name, last name, grade (opt), school name/id/address, parent name/email/phone, home address, pickup/return times, days of week, program name/location, emergency contact name + phone (required), safety_note (opt, 1000 chars) | Parent. Step 1 heading "About you ... you'll add your child next"; step 2 "Your child". |
| Stored in `students` | first_name, last_name, grade, school_name, school_id, school_address, home_address, parent_*, pickup_window_start/end, authorized_adults (json), notes, parent_sms_consent(+_at) | |
| Stored in `standing_orders` | passenger_name = child's full name, label = "Plan label . child name", passenger_phone = parent's phone, addresses, schedule | |
| Stored in `trip_requests` | contact_* = parent, student_id, trip_details incl. policy acknowledgements with timestamp, school_needs_review | Child name is NOT in the trip row itself, but linked by student_id. |
| /request?service=scholar (components/request/TripDetailsFields.tsx, lib/trip-details.ts:421-495) | student_first_name, student_last_name (req), grade, school_name (req), schedule (req), days_per_week, car_seat, authorized_adults (free text "Names only"), accommodations (free text) + contact name/phone/email + addresses | Whoever fills the ride form (labelled "About the student"; copy says "your child"). Stored in `trip_requests.trip_details`; printed in operator email. |
| components/school/HouseholdRequestForm.tsx -> `scholar_household_requests` | guardian name/email/phone, home address, child_count, per child: school + grade/age range, schedule text, Friday text, extra notes, reasons | Parent or guardian (labelled "Parent or guardian name") |
| Stripe (via lib/school-billing.ts) | parent name/email/phone + student_id | Parent |
| Browser sessionStorage | the whole wizard state while typing | Parent's browser only, cleared on submit |
| Not collected anywhere in code | photo of child, date of birth, IEP, 504, McKinney-Vento/foster status, disability, medication, allergy | |

### 3.2 Who fills it out
All UI copy is addressed to the parent ("your child", "Parent or guardian name", "you'll add your child next", "How we handle your child's information" at SchoolSetupWizard.tsx ~753). No form is aimed at a child. No field asks a child's own email, phone, or login. Marketing copy on /school page says Tassy also does district-contracted "alternative student transportation" (IEP, McKinney-Vento, foster) as a subcontractor to EverDriven (app/school/page.tsx:194-199); that work is dispatched by the district/EverDriven, not by a form on this site.

### 3.3 Parent / legal-guardian confirmation text
- There is NO explicit "I am the parent or legal guardian of this child" checkbox or statement in the Scholar wizard, the household form, or the Scholar branch of /request. Closest items:
  - Household form labels the field "Parent or guardian name" (HouseholdRequestForm.tsx:156).
  - Wizard commit checkbox: "I authorize the {plan} commitment and auto-renewal once pricing is confirmed for my school..." (SchoolSetupWizard.tsx ~747); this is billing authority, not a guardian statement.
  - Eligibility gate (SchoolEligibilityGate.tsx) asks about household shape, not about the signer's relationship.
- The privacy policy has no section about children's information beyond a line on in-vehicle recordings on student transport (app/privacy/page.tsx:40). No age statement, no parent rights wording (access/delete for child data), no mention of school-record data handling.

### 3.4 Sensitive data
- Disability, IEP, medical, McKinney-Vento, foster, medication, allergy: NOT requested by any field. The code deliberately removed those (lib/school-plans.ts header comment, lines ~18-21) and lists forbidden keys (`FORBIDDEN_CLINICAL_KEYS`, line ~356).
- Free-text fields that could still receive it (all optional):
  - safety_note, hint: "Please don't include medical details — for anything medical, call us and we'll arrange a CNA-escorted ride." (lib/school-plans.ts:296-297) -> warning present.
  - /request Scholar `accommodations`: "Seating, noise, routine. Please do not include medical details or diagnoses." (lib/trip-details.ts:493) -> warning present.
  - /request Scholar `authorized_adults` -> "Names only" guidance.
  - Household form "Activities, dismissal, destinations or anything else we should know" -> NO warning.
  - Household form "Different custody or household schedules" checkbox and schedule text capture family-custody context. Not health data, but sensitive.
  - /request `vehicleNotes` (shared by all services) -> warning present.

### 3.5 Issues spotted in children's flow
1. Emergency contact is stored as the only entry in `students.authorized_adults` (route.ts ~170: `relationship: 'emergency_contact'`). The policy text promises the driver releases the child only to "someone on your pickup list" (policies trusted_handoff and curb_to_curb), but the wizard has no step to add pickup adults; the only person on record is the emergency contact. Operationally and for privacy (who is allowed to receive a child) this should be checked by a person.
2. Emergency contact is required by the server (`min(1)`, `min(7)`) but the labels do not show "required". If a parent leaves it blank they get an error after clicking through.
3. Child's full name, school, home address and pickup time are combined in one row (`students`) and the child's name appears in `standing_orders.label` and `passenger_name`. Operator emails for Scholar rides on /request include student name and school (via `detailLines`). Push alerts do not.
4. No retention/deletion statement for child records (privacy page only says trip records are kept "for the period the law requires").

## 4. HEALTH INFO ("medical details") on the site
| Place | What is collected | Warning shown |
|---|---|---|
| Care: mobility, assistance level, steps, escort | Mobility needs (wheelchair, walker) = health-adjacent | "We never ask what the appointment is for." (trip-details.ts:192) |
| Care: patient date of birth | DOB for 18+ check | "We check it and do not keep the date." (CareIntakeFields.tsx ~117). True for card payment per code. |
| Care plan-payer path (switched off now) | Member ID, authorization number, Medicaid broker, HIPAA ack + signature | Consent text in lib/care-intake.ts says Tassy handles "limited protected health information (mobility needs, pickup/dropoff facility, appointment context)" and may share it with a paying broker/plan. Not live now. |
| Recovery: support_to_car, wait time, responsible adult | Post-procedure state (sedated, wheelchair) | "We do not ask what the procedure was, and you should not tell us." (trip-details.ts:259) |
| Pickup/dropoff addresses | Clinic/hospital names reveal care | No warning (addresses are required). |
| vehicleNotes (all services) | Free text | "Please do not include medical details, diagnoses, or procedure names." |
| Pet notes | Free text | "Please do not include medical details." |
| Facility PatientForm accessNotes / MessageComposer | Free text | Only the PatientForm footer; none beside accessNotes or MessageComposer. |
| Privacy page (app/privacy/page.tsx:18) | Says medical trip details "may include health-related information you choose to share (such as appointment type or mobility equipment)". | This conflicts mildly with the forms, which tell people NOT to share appointment type. Wording could be aligned. |

## 5. RECOMMENDED MINIMAL CHANGES (short list)
1. Add one guardian statement to the Scholar flows: e.g. checkbox "I am this child's parent or legal guardian and I am allowed to arrange their transportation." Files: components/school/SchoolSetupWizard.tsx (CommitStep or ParentStep), components/school/HouseholdRequestForm.tsx (next to consent at line ~272), and a guardian line in lib/trip-details.ts SCHOLAR section for /request.
2. Add a "Children's information" section to app/privacy/page.tsx (what is collected for Scholar, who sees it, how long it is kept, how a parent asks for access/deletion, not collected from children directly). Also reconcile line 18 wording with the form warnings.
3. Add the same "no medical details" hint to the household form's open notes box (components/school/HouseholdRequestForm.tsx ~247) and consider reusing lib/school-plans.ts SAFETY_NOTE_HINT.
4. Fix the emergency-contact / authorized-pickup mix-up: either add an "authorized pickup adults" field in the wizard or stop writing the emergency contact into `authorized_adults` (app/api/school-booking/route.ts ~170). Mark emergency contact fields as required in the UI (SchoolSetupWizard.tsx ~531-536).
5. Add a privacy/terms link beside the household consent checkbox, and say whether texting is included (components/school/HouseholdRequestForm.tsx:273). If staff will text the mobile number, add a proper SMS opt-in using lib/sms-consent.ts patterns.
6. SMS: optional hardening only. Store IP and user-agent beside `sms_consent_at` (lib/sms-consent.ts, app/api/trip-request/route.ts) and add a contact email/phone to the disclosure text (bump `SMS_CONSENT_VERSION` when changing wording).
7. Stop storing the visitor's user-agent and raw `source` string on every request unless a use exists (app/api/trip-request/route.ts, `user_agent` and `source` insert fields). They are not needed to deliver a ride.
8. Consider dropping contactLastName as required for plain rides? Only if dispatch does not need it; otherwise leave. (Judgment call, low priority.)
9. Signed rating link: /rate?t=<uuid> accepts any trip id. Add a token like receipt links use (app/rate/page.tsx, lib/rating-email.ts). Low risk but easy.
10. Confirm outside this repo: the careers SMS box and STOP/HELP opt-out record live in the TassyOps app (tassytrucksops.vercel.app). The privacy/terms pages promise both. They need to be audited separately.
