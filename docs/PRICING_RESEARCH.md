# Charlotte transport pricing — what the market actually charges

Researched 2026-09-24. Every figure below is quoted from a published competitor
page, with the link. Nothing here is invented, and nothing here is approved.

`lib/quote.ts` holds the proposed rate card built from this. **Do not change a
number in that file without updating this one**, or the next person cannot tell
which figures were researched and which were guessed.

---

## What competitors publish

### Non-emergency medical transport — North Carolina

| | Base | Per mile |
|---|---|---|
| Ambulatory (sedan/SUV) | $30 – $60 | $2.00 – $3.50 |
| Wheelchair (ADA van) | $65 – $110 | $3.00 – $5.50 |
| Stretcher (ambulette) | $295 – $510 | $5.00 – $12.00 |

Surcharges seen: stair assistance $25–$50, oxygen $25–$40, after-hours $10–$25.
Source: [DreamCare Rides — NC NEMT rates](https://dreamcarerides.com/rates/north-carolina)

Industry averages, same shape:

| | Weekday | Weekend / off-hours | Holiday |
|---|---|---|---|
| Ambulatory base | $25 – $30 | $30 – $40 | $35 – $45 |
| Wheelchair base | $45 – $50 | $75 – $90 | $85 – $100 |
| Stretcher base | $100 – $200 | $125 – $225 | $150 – $250 |
| Per mile | $3 – $5 | $5 – $7 | $5 – $10 |

Wait time $15–$30 per 30 min. Extra attendant $5–$10.
Source: [Ecolane — NEMT rates](https://www.ecolane.com/blog/non-emergency-medical-transportation-rates)

### A direct Charlotte competitor, flat-rate

| | |
|---|---|
| Anywhere in Mecklenburg County (Pineville, Matthews, Ballantyne, Mint Hill, Huntersville) | **$120** |
| Weekends | **$150** |
| After hours | **+$45** on top of the regular fare |
| Holidays | **$175** |

No per-mile rate, no wheelchair/ambulatory split, no published minimum.
Source: [Charlotte Metro Transportation — prices](https://www.charlottemetrotransportation.com/non-emergency-medical-transportation-prices/)

**This is the most useful number on the page.** A local operator has decided
that one flat $120 beats a mileage table for this customer. It is simple enough
to say on the phone and simple enough to remember.

### Charlotte black car / chauffeur — the real comp for VIP Concierge

| | Rate | Minimum |
|---|---|---|
| Sedan | $80/hr | 2 hours |
| SUV | $95/hr | 2 hours |
| Sprinter | $150/hr | 3–4 hours |
| CLT airport, sedan | $80+ one way | — |
| CLT airport, SUV | $95+ one way | — |

Quoted rate includes gratuity, tolls, taxes and fees.
Source: [VOY Black Car — Charlotte rates](https://voyblackcar.com/rates/)

**An SUV with a 2-hour minimum is $190 before anyone moves.** That is the floor
VIP Concierge is competing against — not the $45 NEMT floor.

### Pet transport

Local (under 100 miles): **$75 – $200** per trip.
Source: [PetWorks — 2026 pet transportation costs](https://blog.petworks.com/articles/pet-transportation-costs-in-2026/)

A published pet-taxi rate card, for shape rather than for Charlotte pricing:
$25 one way up to 5 miles, $1/mile beyond, $10 per 15 min wait, $5 per extra
pet, $5 off-hours, $10 same-day rush, $10 holiday. Meet-and-greet required
before service.
Source: [Preferred Pet Services — pet taxi rates](https://www.preferredpetservices.com/services-rates/pet-taxi)

The nearest Charlotte pet-transport competitor **publishes no prices at all** and
asks you to phone for a quote.
Source: [Animal People Company — pet transportation](https://animalpeoplecompany.com/pet-transportation-services/)

### Student transport

HopSkipDrive runs a public fare estimator but **discloses no base fare, no
per-mile rate and no minimum** — the estimate is the product, and you must
download the app to act on it.
Source: [HopSkipDrive — fare estimator](https://hello.hopskipdrive.com/fare-estimator-0)

---

## The proposed rate card

Per-trip, à la carte. Cents in `lib/quote.ts`.

| Service line | Base | Per mile | Minimum | Wait included | Wait overage | Extra passenger/pet |
|---|---|---|---|---|---|---|
| Tassy Care (NEMT) | $45 | $3.00 | $65 | 30 min | $20 / 30 min | $10 |
| VIP Concierge | $125 | $3.50 | $185 | 60 min | $30 / 30 min | $15 |
| Tassy Wellness | $95 | $3.25 | $145 | 60 min | $25 / 30 min | $15 |
| Winnie Ride | $45 | $2.25 | $55 | 15 min | $10 / 15 min | $15 |
| Tassy Scholar | $35 | $2.75 | $45 | 10 min | $15 / 30 min | $10 |

Surcharges: after hours (before 6am or from 8pm) **+$25**, weekend **+$20**.
Both sit under the local competitor's +$45 after-hours and +$30 weekend.

### Why each number

- **Care $45 + $3.00/mi, $65 floor.** Sits at the top of the NC ambulatory base
  band and mid-range on miles. A 10-mile trip lands near $75 — well under the
  local flat $120, while a 25-mile run to Concord lands near $120 and matches it.
  Undercut on the short trips people actually take, match on the long ones.
- **VIP Concierge $185 floor.** Deliberately the same as the existing published
  $185 tier, because it is already right: the black-car comp cannot start below
  $190. This is the one existing price that survives contact with the market.
- **Winnie $45 + $2.25/mi, $55 floor.** Beneath the $75–$200 local pet band, and
  far above the $25 hobbyist rate — priced as a professional service that shows
  up, not a favour. The differentiator is not the price, it is that the number
  exists at all when the nearest competitor says "call us".
- **Scholar $35 + $2.75/mi.** The thinnest evidence base of the five, because
  the category leader publishes nothing. Treat as provisional.

### What the engine deliberately does not do

- **It never quotes what it cannot measure.** Typed address instead of a picked
  suggestion means no coordinates, which means no estimate. Not a guess, not a
  city average — nothing.
- **It returns a range.** Straight-line distance scaled by a road factor (1.25
  low, 1.45 high for Charlotte's interstate-cut geography) is not a routed
  distance. A single number would claim a precision nobody has.
- **It rounds the leg, then doubles.** So "$85 each way" adds up to "$170 round
  trip". Customers check that arithmetic.
- **It stores what it showed.** `estimate_shown`, `estimate_low_cents`,
  `estimate_high_cents` on the row. A billing argument six weeks later is
  settled by a record, not by memory.

Upgrade path: swap the haversine for the Google Routes API and the range
narrows to real road miles and live traffic. It costs per call, which is why it
is not the starting point.

---

## The challenge to the current pricing

The current `/pricing` page publishes **15 monthly subscription tiers** across
five service lines, from $39/mo to $1,295/mo, plus VIP flat tiers $185–$695.

Three problems, in order of how much they cost.

**1. Nobody subscribes to a service they have never bought once.**
Subscriptions are a retention instrument. They work on customers who already
know the service is good, which is a set that is currently empty. Asking a
first-time visitor with a mother discharged tomorrow to pick between Companion
Pass, Concierge Pass and Recovery Pass is asking them to make a decision they
have no basis for — and the safe answer to a decision you cannot make is to
close the tab. Per-trip pricing first; offer the pass after trip three, when
the customer can see it saves money.

**2. The tiers are not benchmarked to anything.**
$95/mo for Companion Pass, against a market where one wheelchair trip costs
$65–$110 before mileage. If the pass includes rides it is priced below cost; if
it does not, the buyer cannot tell what they are getting. Every number on that
page needs to be traceable to a line in the table above, or removed.

**3. The one price that is right is the one that looks most aggressive.**
$185 for VIP Concierge reads high next to $39/mo — and it is the only figure on
the page the market supports, because an SUV chauffeur in Charlotte starts at
$190 for two hours. The instinct to discount it would be exactly backwards.

**What the market is actually leaving on the table:** the nearest Charlotte pet
competitor will not publish a price, and the category leader in student
transport hides its number behind an app download. Being the one operator in
this city who shows a real number on the page, before anyone has to call, is a
larger advantage than any individual rate on this list.
