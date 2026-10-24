# Accessibility changes (2026-10-24)

Found by a read-only sweep of the code (`D_assets_a11y` audit) and then by automated checks (axe-core) on 26 page states.
Not a certification. axe finds roughly a third of real problems; a screen-reader user should still test the site.

## Contrast (same colour family, lightness only)
| Where | Before | After |
|---|---|---|
| Day map road labels | `#39424D` on `#13161B` = 1.78:1 | `#748598` = 4.79:1 |
| Day map hour ticks | `#4B535E` = 2.33:1 | `#7C8491` = 4.81:1 |
| Day map "where" line | `#5A626D` = 2.94:1 | `#7C8491` = 4.81:1 |
| Day map "when" line | `#6B7380` = 3.79:1 | `#7C8491` = 4.81:1 |
| Day map caption | `#5F6773` = 3.17:1 | `#7C8491` = 4.81:1 |
| Day map time bands (graphic) | opacity .55 = 2.3 to 2.8:1 | opacity .8 (3:1 or better) |
| School plan card text on gold | 70% / 60% ink = 3.76 / 3.07:1 | 85% ink = 5.02:1 |
| Careers role label | 70% opacity = 4.36:1 | full ink-mute = 7.52:1 |
| Service page "Most popular" label on gold | 70% = 3.76:1 | 85% = 5.02:1 |
| Input and choice-pill borders | `--line` = 1.35:1 | `rgba(244,239,224,.40)` = 3.5:1 (same as the main form fields) |
| Highlighted option in the breed / address / school lists | background only, 1.3:1 | background plus a 4px gold left bar |
Day-map small text was also raised to 12px.

## Keyboard and screen readers
- "Who pays" and "Preferred contact" choice pills now show a focus ring (the real radio is visually hidden).
- Services menu in the top bar: Escape closes it; reports `aria-expanded`.
- School picker: arrow keys, Enter and Escape now work (`aria-activedescendant`); option buttons are no longer extra Tab stops.
- Partner sign-up inputs use the standard form field style (visible focus ring, 3:1 border).
- Household request errors are tied to their fields (`aria-invalid`, `aria-describedby`).
- Error-summary links on the request form are 44px tall.
- Scrollable tables are keyboard-focusable and named.
- `<main>` can receive focus from the skip link; three pages no longer nest a second `<main>`.
- Logo link has one sensible name; decorative images (service mascots, footer logo) have empty alt text; decorative icons are hidden from screen readers; the compare tables' yes/no icons are `role="img"`.
- Native date pickers and select menus now draw for a dark page (`color-scheme: dark`).
- Footer links, the cookie-settings button and the legal row are at least 44px tall.
- Accessibility page rewritten: no "ADA-compliant" or "built to WCAG" claim, known gaps, how to ask for an accessible alternative.

## Still open (not fixed here)
- Facility portal forms (FacilityWizard, PatientForm) do not tie errors to fields. Behind login; not audited with a screen reader.
- The home page Live Trip Board and day map have no on-screen pause button (they stop under "reduce motion").
- The phone menu (`<details>`) label never changes and may stay open after following a link (not verified in a browser).
- Day map text is SVG-scaled on small screens.
- Real assistive-technology testing (VoiceOver, TalkBack, NVDA) has not been done. Needs a person.
