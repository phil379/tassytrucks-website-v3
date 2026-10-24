# Audit C: dark patterns, fees, reviews/claims, email and SMS

Repo: /home/user/tassytrucks-website-v3 (main, working tree as found). Read-only. Facts only, not legal advice.
Paths below are relative to the repo root. "q" = lib/quote.ts.

## Top findings (read this first)

1. **There is NO cancellation fee, no-show fee, late-cancel fee or refund logic anywhere in the code.** Only text exists. The confirmation email and receipt say "No fee if you let us know at least 4 hours ahead" (lib/confirmation-email.ts:192-193, :281; lib/receipt-email.ts:155, :213). /terms says late cancellations or no-shows "may incur a fee, which is disclosed at booking" (app/terms/page.tsx:29). Nothing at booking discloses any such fee, and no amount exists in code.
2. **No self-serve cancel path.** /terms says "by phone or through your booking link". The booking link (/r/[token] receipt page, /pay/[token]) has no cancel control. Cancelling is a phone call to (704) 941-8508.
3. **The final price is typed by a human, not computed from the estimate.** /ops prefills the "agreed" box with the HIGH end of the estimate range (app/ops/page.tsx:327-336) and the operator can change it. No code compares the agreed amount to the estimate shown to the customer. The only disclosure is "a dispatcher confirms the exact price before you're charged".
4. **Tolls: the site promises they are "quoted in advance". No toll logic exists in code.** Same for wait overage: rates exist in q but are never shown to the customer (only in the public JSON /api/price-list).
5. **Reviews: none are shown and no star rating/review/AggregateRating JSON-LD exists.** Good. Remaining unsupported claims are in A3 (15,000+ rides, "24/7", "background-checked", "Licensed & insured", MBE/DBE/SBE, "on time" copy, "HIPAA"/"PHI-compliant", real-time ETA).
6. **No marketing/prospecting email exists in this repo.** All sends are transactional or operator alerts. A guard (lib/marketing-guard.ts) blocks any `kind:'marketing'` send because lib/business.ts has an empty mailing address. There is no unsubscribe table, no suppression check and no List-Unsubscribe header anywhere. Outreach to facilities (the `?src=` prospect link, `sales_prospects` table) is run from a different app.
7. **No Twilio in this repo.** Rider texts are sent by a separate app (TassyOps) via a webhook ping. Consent is captured here (unchecked checkbox) and enforced there.

---

## A1. Dark patterns

### Pre-ticked boxes and consent defaults
- **None found.** Every checkbox starts unchecked.
  - SMS opt-in: components/request/RequestForm.tsx:1214-1224. Comment says "Unchecked by default and never required"; no `checked`/`defaultChecked` attribute. Label "Text me updates about this ride" (lib/sms-consent.ts:18). Disclosure ends "Consent is not a condition of booking." (sms-consent.ts:20-24). Hidden on facility bookings.
  - Parent SMS opt-in: components/school/SchoolSetupWizard.tsx:693-704, state `smsConsent` initial = restored draft value else false (:128).
  - Scholar commitment / auto-renewal box: SchoolSetupWizard.tsx:745, state `commit` = `Boolean(restored?.commit)` (:126). Default false. Minor note: it restores from a tab-scoped sessionStorage draft, so it can come back ticked if the same tab saved it ticked earlier.
  - Scholar policy acknowledgements: SchoolSetupWizard.tsx:122-125, all `false`.
  - HIPAA/transport consent (care intake): lib/care-intake.ts:41 / CareIntakeFields.tsx:41 default `false`; submission refuses unless true (care-intake.ts:135).
  - Household request consent: components/school/HouseholdRequestForm.tsx:57 `useState(false)`.
  - Facility wizard "bridge" and "PO required" boxes: components/facility/FacilityWizard.tsx:413, :440, not consent boxes.
- `useState(true)` found only at components/partners/FacilitySignupForm.tsx:45 (`emailSent`), which is a status flag, not a consent.

### Countdown timers, scarcity, urgency
- **None.** No countdown, "only N left", "limited time", "hurry", "act now" text. The only `setInterval` is components/ops/ElapsedSince.tsx (internal ops "waiting 5m" label) and a Maps poll.
- Closest items, not scarcity: "Best value" badge on the Full School Year plan (app/school/page.tsx:38-39; app/school/book/page.tsx:45 gold pill). A "Priority on weather days" feature bullet (app/school/page.tsx:46).
- Launch offer in code: `WINNIE_LAUNCH_DISCOUNT` "5% off your first month" (q:390-394). It is not used anywhere outside q (not shown, not applied).

### Confirm-shaming
- **None found** (no "No thanks, I don't care about..." decline text).

### Hard-to-cancel flows
- One-off rides: **phone only.** Text: "Need to change or cancel? Call us. No fee if you let us know at least 4 hours ahead." (confirmation-email.ts:192-193 html, :281 text; receipt-email.ts:155 "Call us", :213 "Call (704) 941-8508"). /terms: "You may cancel or reschedule a trip by phone or through your booking link." (app/terms/page.tsx:29). No cancel route, button or API exists (grepped app/, including app/r and app/pay).
- Recurring plans: /terms "billed monthly and can be changed or cancelled with 30 days' notice; changes take effect at the next billing cycle" (app/terms/page.tsx:23). No self-serve cancel UI. Scholar wizard says "I authorize the {plan} commitment and auto-renewal ..." and, for Full Year, "authorize Tassy to charge the card I add" (SchoolSetupWizard.tsx:745-751) with no cancel instructions on that screen, only Privacy/Terms links. The Stripe webhook records Stripe-side `canceled`/`past_due` for standing orders and alerts the operator (app/api/stripe/webhook/route.ts:92). A past-due Scholar account has rides paused after 7 days (lib/school-billing.ts:226, :240).
- Scholar card-on-file page says "Your card is saved, not charged ... billing starts only after that" (SchoolSetupWizard.tsx:737-740; lib/stripe.ts custom_text at ~:473; app/school/book/card-cancelled/page.tsx:39).
- Cancel-friendly statements: post-surgery FAQ "You are not charged a no-show fee because anesthesia recovery took longer than planned." (app/charlotte/post-surgery-transport/page.tsx:195). Scholar sick child "we hold your seat, no penalty" (lib/school-plans.ts:190).

---

## A2. Prices: estimate, confirmation, pay link

### How the price is computed (estimate)
- `estimateTrip()` (q:~870-990). Distance band price from the card, using Google road miles when available (`roadMiles`), else straight-line x ROAD_FACTOR 1.30 / 1.36 / 1.55 (q:~65-67, low/mid/high). Low and high are priced separately, so ZIP-only trips show a range.
- Total = band price (x return factor if round trip) + surcharges (once) + extra passengers + escort (q:927-945). Rounded to $1 steps (q: `roundTo`).
- Quote-only (no number printed): Scholar, wheelchair-beyond-card, anything over the last band (30 miles; 25 for Winnie) (q:~890-910, :930s).
- Shown to the customer while typing: RequestForm.tsx:1242-1300. Label "Your price" only when firm; "Estimated price" for range/ZIP (lib/price-fallback.ts:~60-110). Panel line lists included wait, "both legs included", "Tassy Escort included" and the NAMES of surcharges (no dollar amounts) (RequestForm.tsx:1261-1271).
- Panel notes: firm: "This is your price for the trip as entered. If a toll, a longer wait or a change to the trip moves it, we tell you the new price before you agree to anything." (RequestForm.tsx:1284). Range: "A dispatcher will confirm the exact price before you're charged." (lib/price-fallback.ts:69). ZIP-only: "An estimate, not a final price. A dispatcher confirms the exact figure before your trip is booked." (RequestForm.tsx:1287). Also "Measured between ZIPs ... add the full street address for an exact figure" (:1275-1280).
- The server recomputes and stores the estimate (app/api/trip-request/route.ts:422-529: estimate_low_cents, estimate_high_cents, estimate_miles, estimate_shown).
- Auto-reply email to requester: "Nothing is booked and nothing is charged until you agree to the price." (lib/notifications.ts:~402).

### At confirmation
- A dispatcher types the agreed price on /ops (app/ops/page.tsx:319-336), prefilled agreed -> quoted -> estimate HIGH. `priceInputToCents` caps at $50,000 (lib/ops-price-input.ts:9). There is no check that it matches the estimate.
- `planConfirm` (lib/confirm-plan.ts): a paid or closed trip keeps its stored price; a resent link charges the original attempt amount. So re-confirming cannot silently change a paid amount.
- Confirmation email (lib/confirmation-email.ts:152-160): "This is the agreed price for this trip. It does not change unless you change the trip. Extra wait time beyond what is included is quoted to you before it is charged, never after." Shows trip details; no itemised breakdown (no surcharge lines) of the agreed amount; discount line shown if any.
- The email says "Your driver texts you when they are on the way, and again when they arrive" (confirmation-email.ts:189, :276) to everyone, but texts only go to riders who opted in (decided inside TassyOps). Accuracy gap for non-opt-in riders.

### At the pay link
- /pay/[token] (app/pay/[token]/route.ts) redirects to a Stripe Checkout for exactly `attempt.amount_cents` (or agreed_cents) as ONE line item, `quantity 1` (lib/stripe.ts:321-336). No tip, no card/processing fee, no tax line added by this code. Card only (confirmation email: "Card only. We never ask for payment details over the phone").
- Webhook checks collected amount against the recorded attempt; mismatches and possible double payments alert the operator and are never auto-refunded (app/api/stripe/webhook/route.ts:~148, :195; lib/double-payment.ts:15 "NEVER refunds anything").
- Cancelled/on-account/refunded trips get no live checkout (app/pay/[token]/route.ts:70; lib/pay-guard.ts).

### Can the final amount differ from the estimate?
- **Yes, by design.** (a) ZIP-only and range estimates are labelled estimates; (b) the dispatcher enters the agreed price by hand; (c) wheelchair, over-30-mile, Scholar and untyped-address trips have no estimate and are quoted by phone ("[NEEDS PRICE]" marker, lib/price-fallback.ts:~28-50); (d) tolls/extra wait "quoted in advance". Disclosure points: RequestForm.tsx:1284-1287, price-fallback.ts:69, terms:23, pricing page:267, home page:330, confirmation email:157. The firm-price panel says the price is "as entered". There is no statement of what the dispatcher may change it for, and no cap.

### Surcharges: all in code (q), and where the customer sees them BEFORE confirm/pay
| Surcharge | Amount | Code | Rule | Shown before confirm/pay? |
|---|---|---|---|---|
| After hours | +$25 | q:570; applied q:797-799; hours q:612-613 (`hour < 6 || hour >= 20`) | Per dispatch, not per leg. NOT on Concierge (q:795-796 comment) | Yes: amount on /pricing (app/pricing/page.tsx:234-237: "Before 6am or after 8pm: +$25 (not on Tassy Concierge)"); included in the form total, label only |
| Weekend (Sat/Sun) | +$20 | q:571; q:803-804 | Replaced by Holiday on a holiday | Yes: /pricing:239; in form total, label only |
| Holiday (New Year's Day, Memorial Day, Jul 4, Labor Day, Thanksgiving, Christmas Day) | +$45 | q:581; q:801-802; list q:601-607 | In place of weekend; stacks with after hours; actual date, not observed day | Yes: /pricing:240-243; in form total, label only |
| Extra passenger / pet | Care +$10; Winnie +$15 per extra pet (q:167, :382); Recovery, Concierge, Treatment Day, Care WAV $0 | q:927 | Charged once | Care $10: /pricing:244-248, /nemt:69. Winnie $15: only /winnie:63 ("Second pet $15"); NOT on /pricing |
| Tassy Escort (Recovery only) | +$45 | q:115, :931-932 | Once; ignored on other lines | Yes: /pricing:249-252; form total says "Tassy Escort included" |
| Wait beyond included | Care $20, Recovery $35, Treatment Day $20, Concierge $35, Winnie $25, Care WAV $30, each per 30 min over the included wait | q:166, :212, :262, :310, :372, :503 (`waitOverage`) | Included wait: Care 15 min, Recovery 20, Treatment Day 0, Concierge 0, Winnie 15 (20 on a round trip, q:953-954), WAV 20 | **Amounts not shown to customers.** Only "quoted before charged, never after" (/pricing:253-256; terms:23; home:330; confirmation email). Rates are only in the public JSON /api/price-list (waitOverageCents). Overage is NOT in the estimate or in any invoice code |
| Tolls | none in code | n/a | n/a | Promise only: "Tolls ... are quoted to you in advance" |
| Winnie "pharmacy stop" etc. | included, no code | | | n/a |
Note on wording: code charges at 20:00 exactly (`hour >= 20`); site says "after 8pm".

### Existing fee / cancellation / no-show / refund / waiting rules in code, exact numbers
| Rule | Value | File:line |
|---|---|---|
| Cancellation fee | **NONE in code** | grepped app/, components/, lib/, supabase/ |
| Late-cancel window | Text only: "no fee if 4 hours ahead" | confirmation-email.ts:192, :281; receipt-email.ts:155, :213 |
| No-show fee | **NONE in code**. Terms: "may incur a fee, which is disclosed at booking" | terms/page.tsx:29 |
| Refund logic | **NONE in code.** Code only reads `refunded` as a payment_status and blocks a new link (confirm-plan.ts, pay-guard.ts). Refunds are done by hand in Stripe. No /refunds page exists although lib/business.ts:2 says "Refunds" reads from it | |
| Min lead time | 4 hours (`MIN_LEAD_TIME_MS`) | lib/trip-request.ts:166-167, :303-307; RequestForm.tsx:937 |
| Waiting, Care | 15 min included, then $20 per 30 min | q:165-166 |
| Waiting, Recovery | 20 min included, then $35 per 30 min | q:211-212 |
| Waiting, Treatment Day | 0 min included (driver released), $20 per 30 min | q:261-262 |
| Waiting, Concierge | 0 min included, $35 per 30 min | q:309-310 |
| Waiting, Winnie | 15 min (20 on round trip), then $25 per 30 min | q:371-372, :953-954 |
| Waiting, Care WAV | 20 min, then $30 per 30 min | q:502-503 |
| Overage billed anywhere? | No code bills it. Not in estimate, pay link or webhook | |
| Care bands (one way) | 0-3 mi $49; 4-7 $59; 8-12 $74; 13-17 $89; 18-22 $109; 23-30 $129; over 30 quoted | q:155-163 |
| Recovery bands (round trip incl. wait) | $129 / $149 / $169 / $195 / $225 / $259 on same miles | q:201-209 |
| Treatment Day bands (flat round trip) | $109 / $129 / $159 / $189 / $229 / $269 | q:251-259 |
| Concierge bands | $89 / $99 / $109 / $129 / $155 / $185 | q:299-307 |
| Winnie bands | 0-5 $59; 6-10 $79; 11-15 $89; 16-20 $99; 21-25 $109; over 25 quoted | q:350-381 |
| Care WAV bands | 0-5 $109; 6-10 $129; 11-15 $155; 16-20 $185; 21-30 $225 | q:450-514 |
| Return trip factor | Care 2.0x; Concierge 2.0x; Winnie 1.8x with $106 floor; WAV 1.8x with $180 floor; Recovery and Treatment Day 1.0x (band already round trip) | q:168, :316, :375/:381, :505/:513, :214, :264 |
| Distance fallback factors (ZIP-only) | 1.30 / 1.36 / 1.55 | q:~65-67 |
| Standing Ride Plan (data only, NOT wired) | 15% off, min 8 legs/month, Care and Recovery | q:625-630 |
| Care pack (data only) | 10 rides, 10% off, valid 12 months | q:632 |
| Winnie plans (data only; pricing page does advertise) | 4 rides/mo 10%, 8 rides/mo 15% | q:661-664; pricing page:61-63 |
| Facility tiers (data only; pricing page advertises) | 5% from 10 trips/month, 10% from 25 | q:666-669; pricing/page.tsx:68 |
| Concierge hourly (NOT wired) | $120/hr, 2-hour minimum, full-size SUV | q:653-658 |
| Winnie launch discount (NOT used anywhere) | 5% off first month | q:390-394 |
| Veteran/senior discount (preview page, noindex, switched OFF) | 5% veterans; 5% age 70+ on Tuesdays | app/community-rate/page.tsx:20-24 |
| Discount engine cap | pct must be >0 and <=50 | lib/discounts.ts:96 |
| Scholar 5-minute no-show | Driver waits 5 min then continues route; trusted-handoff wait 10 min then back to school. No fee stated | lib/school-plans.ts:~184-195; app/school/page.tsx:70 |
| Scholar past-due | Rides paused after 7 days unpaid | lib/school-billing.ts:240 |
| Scholar prices (llms.txt) | $45 a leg first child, $20 sibling, third free, $55 route min; after-school 3 days/wk from $660/mo | public/llms.txt:~36-40 |
| Recurring plan cancel | 30 days' notice | terms/page.tsx:23 |
| Dispatcher confirm window | "usually within 2 hours during business hours" | lib/confirmation-promise.ts:7 |

### Other price-consistency findings
- public/llms.txt prices are stale vs q: Winnie listed as "$49-$89 one way, $89-$160 there and back with 20 minutes of wait" (llms.txt:~34); code is $59-$109 one way, round trip 1.8x with $106 floor, 15 min wait (20 on round trip). Also llms.txt says Care "$49 to $129 (23-30 mi)" which matches.
- Pet pages say "2-hour minimum lead time" (charlotte/pet-transport:230, calm-pet-transport:164/:200, dog-grooming-pickup:67/:160, pet-boarding-transport:153, post-surgery-pet-transport:168/:200, partners/veterinary:115) but the form enforces 4 hours (trip-request.ts:166). Not the "2 hours confirm" wording; a different claim.
- Home page: "Flat rates by distance ... it does not move afterwards" (app/page.tsx:127-129) and "What you agreed is what you pay. Tolls and extra wait are quoted to you before they are charged" (page.tsx:330). Pricing page: "no surge, no surprise at the end" (pricing:83). Terms: "no surge pricing and no hidden fees" (terms:23). Note the code DOES add fixed time-of-day/holiday surcharges; they are disclosed as surcharges but a plain "no surge" claim sits next to a +$25/+$20/+$45 time-based add-on. Concierge: "No surge, ever" (vip/page.tsx:28, q:318 comment; pricing/page.tsx:16).
- Concierge from-price: site "from $89", renew page "Flat rates from $89" (renew:8).

---

## A3. Reviews, ratings, awards, superlatives

### Reviews / stars / testimonials
- **No testimonials, stars, review counts or "rated" claims are displayed.** app/page.tsx:294-300 is a comment saying the testimonials slot was removed and "is NOT being filled with invented quotes". The previous "4.9 Google", "Atrium Health Outstanding service", "Dr. Kim, RN", "Janelle R.", "Marcus T." items are gone (CLAIMS_INVENTORY.md section A/F is out of date).
- app/page.tsx:115 `<span>★</span>` is a decorative star in the "Veteran-Owned" pill, not a rating.
- app/page.tsx:396-397 is a code comment only ("the ride COUNT only -- no rating, no cancellation rate"); nothing rendered.
- Ratings are collected, not published: /rate writes to `trip_ratings` (app/rate/page.tsx:33-55; rating email in lib/rating-email.ts).
- **JSON-LD:** schema.org used in app/layout.tsx:59-110 (LocalBusiness, `priceRange: '$$'`, `hasCredential`, OfferCatalog), app/request/page.tsx:24-50 (WebPage/LocalBusiness), app/school/page.tsx:21-32 (Service), components/ServicePage.tsx:49-61 (Service), components/seo/LandingPageShell.tsx:56-91 (Service, FAQPage, BreadcrumbList). **No AggregateRating, Review or reviewRating anywhere** (grepped app/, components/, lib/, public/).
- Awards: "2023 HIRE Vets Medallion Award, Gold -- U.S. Department of Labor" (app/page.tsx:446-458, app/partners/page.tsx:259-272, components/Footer.tsx:44-53). Year is stated. Repo has a seal image but no certificate/evidence file.
- Name-drops of third parties: Atrium Health Carolinas Medical Center / Novant Health Presbyterian as destinations only (charlotte/wheelchair-transport:169-170, dialysis-transport:158-159, post-surgery-transport:178-179, veteran-transport:168; components/CharlotteDayMap.tsx:93-94). Not endorsements.

### Claims table (exact sentence, page:line, evidence in repo?)
| Claim | Where | Evidence in repo |
|---|---|---|
| "15,000+ rides completed since 2022" | app/page.tsx:~424-425 (big stat; supporting comment lines ~398-420 says Uber half evidenced by a statement of 221 trips, student half "is not" evidenced) | Comment admits half is unevidenced. No source file in repo |
| "hundreds of clients monthly" / "serve hundreds of clients monthly" | app/page.tsx:390 | Comment: carried by Aug 2026 Uber statement, 221 trips. 221 trips is not "hundreds of clients" |
| "We've operated these routes since 2022" / "Moving students ... since 2022" / "Four years of student transport" / "four-plus years of mornings" | school/page.tsx:197, :203; page.tsx:96, :98; llms.txt:44 | No contract/evidence in repo. Product does say via EverDriven subcontract |
| "five metros ... plus one outpost in Ohio" | school/page.tsx:215 | none in repo |
| "Four years of student transport · background-checked drivers" | app/page.tsx:98 | no background-check process/vendor documented in repo (careers page says "Clears a background check" for CNA role, careers/page.tsx:70) |
| "Trained, background-checked, and the same standard every trip." | app/vip/page.tsx:37 | none |
| "vetted drivers, dependable vehicles, and routes that complete on time" | school/page.tsx:216 | none |
| "licensed and insured" / "Licensed & insured" chip | vip/page.tsx:37; nemt/page.tsx:54; ServicePage.tsx:38 (chip on every ServicePage); charlotte/family-medical-rides:78; concierge-medical-transport:134 | Terms say "commercial auto and general liability insurance as required" (terms:48). No policy/certificate in repo. Best-nemt page says certificates "available on request" |
| "Licensed and insured for exactly this work." | app/nemt/page.tsx:54 | none |
| "SDVOSB, MBE, DBE and SBE certified" | page.tsx:151, :284-286, :311; nemt:54; partners/page.tsx:274; confirmation-email.ts:229, :297; receipt-email.ts:162, :217 | No certificates in repo. page.tsx:149 says "SBA-certified" for SDVOSB |
| "Certified for institutional procurement" | page.tsx:~279 | same |
| "24/7" / "answered by a person 24 hours a day" / "around the clock" | at least 20 pages: charlotte/*.tsx (e.g. pet-transport:203, post-surgery-pet-transport:167, vet-appointment-rides:73, dialysis-transport:78, concierge-medical-transport:9/:184, post-surgery-transport:9/:151, best-nemt-providers:156, veteran-transport:28/:139, calm-pet-transport:162/:200, dog-grooming-pickup:65/:160, nemt-rides:9/:111, pet-boarding-transport:152/:174, family-medical-rides:75), accessibility:49, compare/tassy-vs-uber-health:61, partners:9/:87, partners/veterinary:128, LandingPageShell.tsx:52/:259 | **Contradicted in code:** lib/business.ts:33-38 says dispatch hours "nobody has told us the real hours"; confirmation promise says "business hours"; notifications.ts:64-75 notes the form takes requests round the clock but staff do not |
| "On-time ... every time" / "shows up on time, every time" | nemt-rides:72 (describes the ideal provider; "If that is you ..."), best-nemt-providers:24, :88 ("On-time performance is the whole product") | facility/reports/page.tsx:122 says on-time performance "is not shown yet" because arrival times are not captured. No on-time data |
| "Every ride reflects our Army values: on time, compliant, and caring." | page.tsx:388 | values statement |
| "HIPAA" / "PHI-compliant messaging" | partners/page.tsx:215-218 ("the portal includes PHI-compliant messaging"); privacy/page.tsx:18 (confidentiality wording) | HIPAA acknowledgment is a consent checkbox (care-intake.ts:54). No BAA/compliance evidence |
| "Trained in transfer and post-procedure passenger assistance. Where your procedure calls for it, we assign an operator with a CNA, LPN or RN background." | recover/page.tsx:61 | layout.tsx comment says Guardian line paused because "no CNA-trained drivers". Conflict worth checking |
| "CNA-escorted ride" | lib/school-plans.ts:297 | same |
| "We text whoever you nominate when we have you, and again when you are home" | recover/page.tsx:64; also renew/page.tsx:56 "Family text on the way home" | texts are sent by TassyOps only for opt-in on 'confirmed'/'paid' events (tassyops-notify.ts: events are only `confirmed` and `paid`). No code sends "on the way"/"home" texts |
| "Your driver texts you when they are on the way, and again when they arrive." | confirmation-email.ts:189, :276 | same: only confirmed/paid events exist here |
| "real-time ETA visibility" / "real-time ETA, visible to your whole team" | partners/page.tsx:95, :200 | facility/trips/page.tsx:72 and facility/page.tsx:90: "There is no GPS feed and trip_events is empty" |
| "You are never left wondering whether the ride actually happened" / photo at pickup | charlotte/pet-transport:99-101; vet-appointment-rides (photo) | not verifiable in repo |
| "guarantee" | only softer: "makes it easier to guarantee your preferred pickup window" (pet-transport:230), "so we can guarantee the right vehicle" (wheelchair-transport:231) | n/a |
| "Best" / "#1" | only "Best value" badge (school/page.tsx:38) and "Best NEMT Providers in Charlotte: How to Actually Choose One" page title; page text says "We will not tell you we are the best NEMT provider" (best-nemt-providers:146) | n/a |
| "No surge, ever" / "no surge, no hidden fees, no booking fees" | vip/page.tsx:28; pricing:16, :83; page.tsx:386 area, :476 ("upfront pricing, no surge, no booking fees"); terms:23; wheelchair-transport:184 | Matches code (no surge multiplier), but fixed time-based add-ons exist (see A2) |
| "ambulatory SUV/full-size SUV" Concierge vehicle | vip/page.tsx, quote.ts:318 comment | n/a |
| "Female drivers on request", "Photo + chip verification", "Owner gets real-time updates" | **Not found anywhere now** (removed from page.tsx verticals) | |
| "VA", "VA Community Care Network" content | charlotte/veteran-transport/page.tsx:59-75, :183 | Page says "we cannot authorize VA benefits ourselves". Handled by another PR per brief; left alone |
| "98% on-time", "< 30 min", "Avg. response 8 min", "Dispatchers online now" | **Not found now** (removed) | |
| "SDVOSB certified" in header/hero/JSON-LD | page.tsx:114, layout.tsx:56-71 (`hasCredential`) | no certificate in repo |

Remaining USDOT/MC, "VA-verified", CCN, 2-hour wording: another PR handled them. Still present occurrences found: "2 hours" confirmation promise in lib/confirmation-promise.ts:7, public/llms.txt:54, lib/notifications.ts:115 (all the standard sentence); best-nemt-providers mentions USDOT/MC generically as advice to readers (best-nemt-providers:24, :34, :170, :178), not as Tassy's numbers. layout.tsx:~72 carries a TODO noting USDOT 3808299 / MC-1373369 are Inactive and are not published. scripts/banned-claims/{foreign-dot-mc,va-verified}.json guard them.

---

## B. Emails and SMS this repo can send

### Providers
- **Email: Resend** via direct fetch to https://api.resend.com/emails (lib/notifications.ts:224, :258). `FROM_ADDRESS` = env `RESEND_FROM_EMAIL` or "Tassy Transportation <dispatch@tassytrucks.com>" (notifications.ts:40). No `headers` are sent, so no List-Unsubscribe, no Reply-To.
- **SMS: no Twilio or SMS provider in this repo.** Rider texts: `pingTassyOpsEvent` POSTs `{tripId, event}` (events: `confirmed`, `paid`) to TassyOps (`TASSYOPS_NOTIFY_URL`) with a bearer secret (lib/tassyops-notify.ts). Consent, quiet hours, opt-out/STOP, dedupe are enforced inside TassyOps, not here. Called from lib/ops-confirm.ts:177 and app/api/stripe/webhook/route.ts:283.
- Operator alerts also go to ntfy.sh (public topic) and an optional Zapier SMS webhook (lib/notifications.ts:162-210). These go to the owner, not to customers.
- **No suppression list, unsubscribe table or unsubscribe check exists** (grepped lib/, app/, supabase/migrations/). `lib/marketing-guard.ts` only checks a mailing address string and an unsubscribe URL argument, for `kind:'marketing'`.

### Marketing guard
- `assertEmailAllowed(kind)` runs on every send (notifications.ts:219, :251). `kind` defaults to 'transactional', and **no caller in the repo passes 'marketing'**. For marketing it demands a non-empty `BUSINESS_MAILING_ADDRESS` (lib/business.ts:23, currently `''`) and an unsubscribe URL (marketing-guard.ts:30-37). It does not add the address or link to the message, and does not check any suppression list.
- Business location shown in emails is "Charlotte, NC" only (Phil's decision, business.ts:4-7).

### Per-message table
| # | Message | Trigger (file:line) | Recipient | Type | Business name | Postal address | Unsubscribe / prefs | Sender/subject honesty |
|---|---|---|---|---|---|---|---|---|
| 1 | Auto-reply "We have your request" (plain text) | Rider submits /request, app/api/trip-request/route.ts via `fireNotifications` -> `notifyRequester` (notifications.ts:442-446) | Customer (their email, optional field) | Transactional | "— Tassy Transportation" sign-off | No ("Charlotte, NC" not even present) | None | Subject "We have your request — ref {trip#}" accurate; says nothing is booked or charged |
| 2 | Operator new-request alert | Same trigger (notifications.ts:342-344) | Owner (OPERATOR_EMAIL) | Internal | n/a | n/a | n/a | Subject "NEW REQUEST — ..." contains customer name |
| 3 | Booking confirmation + pay link (HTML+text) | /ops "Confirm & send payment link" or TassyOps one-tap (lib/ops-confirm.ts:148-154; app/api/ops/confirm) | Customer | Transactional | Footer "Tassy Transportation · Charlotte, NC" plus "Veteran-owned. SDVOSB, MBE, DBE and SBE certified." (confirmation-email.ts:226-232) | City/state only | None | Subject "Booked — {service} {time} — {code}". "Booked" is sent before payment; accurate as booking |
| 4 | Payment receipt (HTML+text) | Stripe webhook after paid (app/api/stripe/webhook/route.ts:268-272) | Customer | Transactional | "Tassy Transportation · Charlotte, NC · Operated by Tassy Trucks LLC" (receipt-email.ts:161) | City/state only | None | "Receipt — {service} — {ref} — $X paid" |
| 5 | Rating request "How was your Tassy trip?" | /ops status set to completed (app/ops/actions.ts:217-241) | Customer, if an email is on file | Transactional-style survey, but sent to every completed trip with an email, with no check of SMS consent or any opt-out | Header/footer "Tassy Transportation" (rating-email.ts:75, :102) | "Charlotte, NC" only | None | Subject honest. Body "We read every one. Your feedback is how we keep the good drivers and coach the rest" |
| 6 | Facility sign-in link "Finish setting up your Tassy Transportation account" | POST /api/facility-signup (app/api/facility-signup/route.ts:105-110) | Whoever typed their work email on /partners/signup | Transactional (account) | "Tassy Transportation" header | No | None; "reply and we will send another" | Honest. Sent to an address typed by a visitor (could be a third party) |
| 7 | Team invite "You have been added to {facility} on Tassy Transportation" | Facility admin adds teammate (lib/facility-team.server.ts:74) | Invited colleague | Transactional | Yes (header) | No | None | Honest |
| 8 | Operator alert: new facility sign-up | notifyOperatorFacilitySignup (notifications.ts:608) | Owner | Internal | n/a | n/a | n/a | n/a |
| 9 | Operator alert: household request | notifications.ts:672 | Owner | Internal | | | | |
| 10 | Operator alerts: facility message (app/facility/messages/actions.ts:45), paid, payment mismatch, possible double payment (notifications.ts:696-800), Scholar billing | various | Owner | Internal | | | | |
| 11 | Rider text "booking confirmed + payment link" and "paid + receipt link" | `pingTassyOpsConfirmed` / `'paid'` events | Rider's phone, only if TassyOps decides (consent etc.) | Transactional text | Unknown (template lives in TassyOps) | Unknown | STOP/HELP language appears in the checkbox disclosure only (lib/sms-consent.ts:20-24; terms:43; privacy:33-35) | Not verifiable from this repo |

Scholar parent texts ("picked up, dropped off, ride cancelled") are promised in the consent label (lib/sms-consent.ts:68-70) but no sender exists in this repo.

### Is any marketing / prospecting email in THIS repo?
- **No.** There is no newsletter, drip, broadcast, subscribe form, campaign or cold-outreach sender. Every send is a response to a customer or facility action, or an alert to the owner.
- Evidence of outreach happening elsewhere: facility sign-up accepts `?src=<uuid>` and `rep` and updates a `sales_prospects` row (app/api/facility-signup/route.ts:78-89; lib/facility.server.ts:233-247; app/partners/signup/page.tsx:42; lib/facility.ts:245-255; scripts/test-prospect-link.ts). The prospect list and the emails that carry these links are not in this repo.
- Gaps if marketing email is ever turned on from here: no suppression/unsubscribe store, no List-Unsubscribe header support in the send functions, no postal address (empty on purpose), no consent record for email (only SMS consent is stored: lib/sms-consent.ts, trip_details.sms_consent*).
- Privacy page says "stop non-essential communications" by emailing book@tassytrucks.com (privacy/page.tsx:47).

### Other observations
- Cron routes (app/api/cron/escalate-stale-requests, materialise-standing-orders) alert the owner only.
- The rating email, receipt and confirmation have no "reply to unsubscribe" line. For transactional mail that is typical; the rating survey is the one closest to the marketing line.
