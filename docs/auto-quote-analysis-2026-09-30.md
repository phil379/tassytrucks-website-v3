# Auto-quote — the analysis

**Date:** 2026-09-30 · **Status:** analysis only, nothing built, no pricing touched.

---

## The headline

**Nothing needs building. The number is already computed, already shown to the customer, already stored — and then thrown away.**

`/request` runs `estimateTrip()` on every submission and writes `estimate_low_cents`, `estimate_high_cents`, `estimate_miles` and `estimate_shown` to the row. It has never written `quoted_cents`. So a dispatcher opens `/ops` and types a number the system already calculated and already displayed.

This is not a feature to build. It is a value to stop discarding.

---

## What the two real rows say

| | Blake Smith | John Malcom |
|---|---|---|
| line | winnie | care |
| estimate low / high | **8400 / 8400** | **4900 / 4900** |
| shown to customer | yes | yes |
| pickup picked from autocomplete | yes | yes |
| dropoff picked from autocomplete | **yes** | **no** |
| coordinates stored | **yes** | **no** |
| miles | 7.2 | 2.0 |
| what a human later typed | **`agreed_cents` = 8400** | — |

Two things worth sitting with:

**Low equals high.** On both rows the engine produced a *single firm number*, not a range. The "estimate" is only an estimate in its wording.

**The human agreed with the machine, exactly.** Blake Smith's trip was quoted by a person at `8400` — the identical figure the engine had already produced and already put on screen. One data point, not a proof. But it is the only data point that exists, and it points one way.

---

## The gate

Every condition below reads a column that is **already stored**. Nothing new to persist.

```sql
estimate_low_cents IS NOT NULL
AND estimate_low_cents = estimate_high_cents   -- the engine is firm, not banded
AND estimate_shown = true                      -- the customer SAW this number
AND pickup_place_id  IS NOT NULL               -- address picked, not typed
AND dropoff_place_id IS NOT NULL
```

**It already discriminates correctly on the live data.** Blake Smith passes. John Malcom fails on the dropoff — his address was typed, not picked, so there are no coordinates and the $49 came from an entry-band / ZIP-derived estimate. That trip *should* reach a human, and this gate sends it there.

### Why each condition earns its place

**`low = high`** — the engine already decides when it can be firm. `estimateTrip()` returns `kind: 'quote-only'` for scholar, wellness, guardian, wheelchair Care, and anything beyond the bands. Those never produce an estimate at all, so they can never pass this gate. No separate service-line allowlist is needed; the engine's own judgment is the allowlist.

**`estimate_shown = true`** — this is the consent signal, and it is the one that matters most. It means the figure was on the customer's screen when they submitted. Filling `quoted_cents` with it is honoring what they already saw, not springing a new price on them.

**Both `place_id`s** — the durable proof that the distance came from real picked addresses rather than ZIP centroids. `exact` and `distanceMeasured` exist on the in-memory `Quote` but are never persisted; the place ids are the stored evidence, and arguably the better one.

**Not needed:** surcharges and the $45 escort are **already inside** `lowCents` (`surchargeTotal + escortCents` are summed into the total). The stored number is all-in. Nothing to add.

---

## What the dispatcher step becomes

It does not disappear, and that matters.

`/request` promises in writing that *"a dispatcher comes back to you with a price."* Auto-quoting fills `quoted_cents`. It does **not** confirm, does **not** mint a payment link, and does **not** charge. `confirmAndSend` still requires a human click.

So the promise holds exactly. What changes is that the dispatcher **confirms a number instead of computing one** — one click instead of opening the trip, reading the addresses, working out the price and typing it.

That is the whole win, and it is aimed squarely at the real constraint: no trip can move until Phil personally types a figure, at whatever hour the request arrives.

---

## What breaks, and how it gets corrected

| Risk | Reality | Correction |
|---|---|---|
| Auto-quote is too low | The figure is the one already shown to the customer. Quoting it is not a new mistake — the page made that promise the moment it rendered. | Dispatcher edits `agreed_cents` before Confirm & Send, exactly as today. |
| Auto-quote is too high | Same. | Same. |
| Distance was wrong | Both place ids present means real geocoded addresses. This is the case most likely to be right. | Dispatcher edits. |
| Surcharge missed | Already included in the stored total. | — |
| Wheelchair priced as ambulatory | Impossible. `cardFor()` returns null for `care` + `wheelchair`, so no estimate exists to promote. | — |
| Scholar auto-quoted | Impossible. Scholar is `quote-only` by line. | — |

**Every failure mode lands in the same place: a dispatcher changes a number before confirming, which is the step they already take today.** Nothing becomes unrecoverable, because nothing is charged.

---

## Honest limits

- **n = 2.** One human-versus-machine comparison. It agreed exactly. It is not a sample.
- **Every record is test data.** No real customer has run this path.
- **The word "estimate" stays true** — the gate does not make a promise the page has not already made on screen.
- **Not proposed:** charging at request time. That would break the page's written promise, and for dialysis and discharge passengers it is the wrong instinct entirely.

---

## Recommendation

Ship the gate. It is a small change in `app/api/trip-request/route.ts` — write `quoted_cents` when the five conditions hold — plus a line in `/ops` showing the dispatcher where the figure came from, so a pre-filled number never looks like one a human typed.

**Sequencing:** do it *after* the end-to-end test card run. Today the chain from request to payment has still never completed once. Optimising a step in a pipeline that has not been proven end to end is the wrong order.

---

## One thing found on the way

`trip_requests` stores `estimate_*` but `/ops` appears not to surface it. If that is right, a dispatcher has been typing a number the row was already carrying — which would explain why this gap survived this long. Worth a look when someone is in that file.
