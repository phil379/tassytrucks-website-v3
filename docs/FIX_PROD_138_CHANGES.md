# FIX_PROD_138 · Founder bio copy refresh (content-only)

- **Section:** `app/page.tsx` #founder, under heading "Built by a veteran. Held to a higher standard." (UNCHANGED).
- Replaced the single old bio `<p>` with the Phil-provided **4-paragraph** block, verbatim.
- Curly quotes on "Phil" (&ldquo;/&rdquo;), curly apostrophes (Master&rsquo;s, didn&rsquo;t, that&rsquo;s), em-dashes (&mdash;) — all render as real glyphs (verified: no escape artifacts).
- Closer paragraph in `serif italic` gold (var(--gold)) — matches the motto voice (optional treatment, applied).
- Typography: text-lg (18px) · leading-relaxed (1.625) · mt-4 between paras · mt-5 before closer · `max-w-2xl` cap for readability (copy is ~150 words).
- NO change to: heading, photo/image treatment/position, layout (photo-left/text-right grid), brand tokens, fonts, other sections.
- Verified: PARA_COUNT=4, curly quotes ✓, em-dashes ✓, closer ✓, no escape artifacts ✓; build green; shots 375/768/1440 in test-results/fix_prod_138/.
