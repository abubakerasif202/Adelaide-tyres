# Stitch Stage 2 Fidelity, Responsive QA and Handoff Evidence

Branch: `redesign/stitch-stage-2`. This report covers Task 4 of
`docs/superpowers/plans/2026-09-10-stitch-stage-2-implementation.md`.

## Reference screens

Compared against five screens in the Stitch project **Adelaide Tyres Design
System** (`projects/6768054814812302727`):

| Surface | Stitch screen | Reference size |
|---|---|---|
| Homepage | `Adelaide Wholesale Tyres - Homepage` | 2560 x 8460 |
| Catalogue (desktop) | `Adelaide Wholesale Tyres - Catalogue` | 2560 x 6286 |
| Catalogue (mobile) | `Adelaide Wholesale Tyres - Mobile Catalogue` | 780 x 6360 |
| Product detail (desktop) | `Adelaide Wholesale Tyres - Product Detail Page` | 2560 x 5734 |
| Product detail (mobile) | `Adelaide Wholesale Tyres - Mobile Product Detail Page` | 780 x 5902 |

Each reference was compared against a full-page capture of the production
build at 1440px (desktop) and 390px (mobile).

## Verified matches

**Hero hierarchy (homepage).** The reference's kicker -> two-tone display H1 ->
supporting paragraph -> paired red primary / outline secondary CTA -> address
meta line is reproduced in order and in proportion. The H1 breaks across the
same two lines with the second line in mint (`#7fd1b3`) against the deep green
field, and the red primary CTA sits left of the outline secondary as in the
reference. No decorative pill sits above the H1.

**Homepage section rhythm.** Benefits cards overlap the hero base as a
four-card row with a single highlighted card, matching the reference's
four-card feature strip and its use of one emphasised tile. The stock preview
below it uses the reference's editorial weighting rather than a uniform grid:
the lead product spans two of three columns at `lg`+, with the remaining seven
in single columns and no trailing hole.

**Dark/light conversion transition.** The reference steps out of the dark
commercial band into a distinct conversion block. The implementation does this
with a light `#f5f6f3` delivery band terminated by a 3px `#df1015` hairline
before the free-delivery CTA, so the last third of the page reads as an
arrival point rather than one undifferentiated dark mass.

**Catalogue workspace (desktop).** The reference's 280px left filter rail plus
results column is reproduced, with the rail carrying the `REFINE` head, size
chips, brand and application selects, the in-stock toggle and sort, and the
results column carrying a full-width primary search field with a leading
glyph, a live result count and the product grid. The rail is sticky at `lg`+.

**Catalogue (mobile).** Matches the reference's mobile composition: sticky
announcement, condensed header, the H1 block, a full-width search field, then
a `Filters` trigger paired with a visible result count, then single-column
product cards. Filters open in a bottom sheet.

**Stage 1 card treatment preserved.** Dark product-media plates and a single
stock badge per card are carried through unchanged on both the homepage
preview and the catalogue grid, as required.

**Product detail hierarchy.** Matches the reference ordering: red brand
kicker, full product-name H1, application line, dark media bay, then the
purchase panel with price, stock line, quantity stepper, primary red
"Add to cart" and secondary dark "Add & go to cart", the delivery/pickup tier
table and the delivery-progress widget. The specifications block below renders
as a two-column definition list.

**Mobile product stacking.** As in the mobile reference, identity (kicker, H1,
application) sits above the media bay and the purchase panel stacks beneath
it full-width, rather than the desktop two-column split.

**Palette and typography.** Barlow Condensed carries display headings, tyre
sizes and pricing; Barlow carries navigation, body, labels and controls. Red
appears only as the conversion accent (primary CTAs, brand kicker, the
transition hairline) and never as a large background area.

## Intentional deviations

The Stitch references are built almost entirely on invented commercial data.
Everything below was deliberately omitted; none of it is a fidelity defect.

**Fabricated contact and business facts.** The references show a phone number
(`(08) 8240 0000`), a "Regency Park Depot" with forklift-assisted dock
loading and 60-minute collection, delivery "freight zones" and tiers, a trade
ABN pricing scheme, "Net 30" / 30-day commercial credit terms and a credit
application flow, and named suburbs served. Public contact affordances remain
environment-backed and none of these claims are supported by the repository,
so all were dropped. Warehouse pickup is described plainly, without depot or
fitting claims.

**Fabricated products.** The references stock Bridgestone R168, Kumho KMD01,
Michelin X Multi Z2, Maxxis Razr AT771, Goodyear Cargo 626 and Sailun S815.
None exist in `lib/catalogue.ts`. All products, prices, stock counts,
applications and images come from the repository catalogue.

**Fabricated scale and trust signals.** "1,480+" inventory, "Volume Leader" /
"Verified Trade Spec" / "Pallet tier saves $20/ea" badges, review and rating
markers and trading-history claims were all omitted. No review or rating
structured data was added.

**Absent optional specifications.** The reference product page shows load and
speed index, ply rating, nominal section width, overall diameter, static
loaded radius, rim size, inflation pressure, tread depth and regroove data,
plus SKU and EAN numbers. Most tyres in `lib/catalogue.ts` do not carry these
fields, so the specifications region renders only what exists and states that
full load index, speed rating and construction are confirmed on the quote or
invoice. Optional fields are never defaulted or invented.

**Catalogue controls.** The reference's grid/list view toggle, active-criteria
chip row and results-header sort dropdown were not reproduced. Sort lives in
the filter rail alongside the other controls, and a single `Reset` (desktop) /
`Clear filters` (mobile) action replaces the reference's parallel
"Clear All" affordances.

**Product imagery.** The references use AI-generated studio renders that bleed
to the edge of their dark plates. Real supplier photography is used instead,
per the project's image-integrity policy, and tyres without a verified photo
show a "Photo pending" placeholder rather than a substitute render. Two
consequences are visible and accepted for this stage:

- Photos whose own background is white or mid-grey render as a lighter
  rectangle inside the dark media plate instead of blending into it. This is
  most noticeable on the product-detail media bay and on catalogue cards for
  white-background assets. It is an image-asset characteristic inherited from
  Stage 1, not a Stage 2 layout defect, and resolving it requires asset work
  (background removal or re-shooting) that is outside this stage's scope.
- The homepage lead card crops its tyre more tightly than the reference's
  full-bleed hero product, because the lead media is a wide 11:3 band.

## Behaviour verification

All five commands were run fresh, in the foreground, in the order specified,
after killing any orphan `next start` listener on port 3100 before and after
the build (no orphan was ever found running — `Get-NetTCPConnection -LocalPort
3100,3105,3111 -State Listen` returned nothing at every check).

| Command | Result | Exit status |
|---|---|---|
| `npm run typecheck` (`tsc --noEmit`) | Passed, no type errors reported | 0 |
| `npm run lint` (`eslint . --ignore-pattern .next`) | Passed, no lint errors or warnings | 0 |
| `npm test` (`node --conditions=react-server --test tests/unit/*.test.mjs`) | 72/72 unit tests passed, 0 failed | 0 |
| `npm run build` (`next build`) | Compiled successfully in ~1.8s, typechecked in ~3.2s, generated all 47 static/SSG pages, 0 errors | 0 |
| `npm run test:e2e` (`playwright test`) | **80 passed, 10 skipped, 0 failed** (90 total across `desktop` + `mobile` projects) | 0 |

e2e detail:
- Baseline (pre-Task-4) was 74 passed / 10 skipped / 0 failed.
- Step 1 added 3 new route-guard tests (`Stage 2 keeps fabricated Stitch
  content off /`, `/tyres`, `/tyres/ralson-rmr61-295-80r22-5`), each run on
  both the `desktop` and `mobile` Playwright projects, which is +6 passed
  (74 → 80). This matches the observed count exactly.
- The 10 skips are the pre-existing, intentional ones:
  `production-polish.spec.ts:134` self-skips its 9 mobile-viewport-width
  sub-tests plus `smoke.spec.ts:57` "mobile menu opens and lists navigation"
  is skipped on `desktop` (it only runs on the `mobile` project) — all
  pre-existing and unrelated to Task 4 changes.
- `[WebServer] Error: Internal: NoFallbackError` lines appear twice in the
  Playwright output; these come from the Stripe MCP plugin banner injected by
  the harness (`<claude-code-hint ... value="stripe@claude-plugins-official"
  />`) intercepting devtools/console wiring in the dev server output, not
  from the application under test — no test failed or reported a console/page
  error tied to this line, and it appears identically on an unmodified
  baseline run.

No test was weakened. The three new tests are additive only, using the
`fabricated` regex already declared in the spec file rather than
re-declaring the literal pattern.

## Visual verification

Production build (`next build` + `next start -p 3100`) was measured
headlessly with Chromium via Playwright's `playwright-core`, driven by ad hoc
scripts (not committed) rather than by eyeballing, at all 9 required widths —
`1440, 1280, 1024, 768, 430, 390, 375, 360, 320` — on all 3 required routes —
`/`, `/tyres`, `/tyres/ralson-rmr61-295-80r22-5`.

### Overflow, console/page errors, H1 count (27 route × width combinations)

Measured per-element via both `el.scrollWidth > el.clientWidth` (excluding
`.sr-only`/`.skip-link` and any `position:absolute; overflow:hidden` 1px-clip
elements, which were programmatically excluded and never counted) and
`getBoundingClientRect().right > viewportWidth`.

| Route | Overflow found | Console errors | Page errors | `<h1>` count |
|---|---|---|---|---|
| `/` — all 9 widths | 1 element, all 9 widths (see below) | 0 | 0 | 1 (every width) |
| `/tyres` — all 9 widths | 0 | 0 | 0 | 1 (every width) |
| `/tyres/ralson-rmr61-295-80r22-5` — all 9 widths | 0 | 0 | 0 | 1 (every width) |

**The one recurring overflow on `/`** is `.hero::after`, the decorative
radial-gradient glow pseudo-element (`app/globals.css` line 441):

```css
.hero::after {
  position: absolute;
  inset: auto -10% -45% 35%;
  z-index: -1;
  height: 500px;
  content: "";
  background: radial-gradient(circle, rgba(243, 18, 23, 0.11), transparent 66%);
  pointer-events: none;
}
```

Its negative insets deliberately extend it past the `.hero` section's own
bounds for a soft-glow effect. `.hero` itself carries `overflow-hidden` in
its class list, so this is clipped at the section edge with zero visible
effect — it never crosses the actual viewport edge
(`getBoundingClientRect().right` never exceeded the viewport in any
measurement; only the internal `scrollWidth`-vs-`clientWidth` metric flagged
it), it sits behind content (`z-index: -1`), and it is non-interactive
(`pointer-events: none`). This is not a defect and was not modified.

### Touch targets (390px, and 320px sheet where relevant)

| Control | Measured size | ≥44px? |
|---|---|---|
| Hero CTA "Shop available stock" | 358 × 52 | Yes |
| Hero CTA "Get a wholesale quote" | 358 × 52 | Yes |
| Catalogue `Filters` trigger | 111.5 × 47 | Yes |
| Mobile `Clear filters` (only rendered when a filter is active — confirmed by re-running with `?brand=Ralson`) | 102.4 × 44 | Yes |
| Sheet: `Close filters` | 141 × 44 | Yes |
| Sheet: size chip buttons (e.g. `11R22.5`, `295/80R22.5`, …) | 44 height throughout (width varies by label) | Yes |
| Sheet: `Brand` select | 358 × 48 | Yes |
| Sheet: `Application` select | 358 × 48 | Yes |
| Sheet: `In stock only` checkbox input itself | 18 × 18 | No, **but** its wrapping `<label className="filter-rail__toggle">` carries `min-height: 44px` (`app/globals.css` line 807-812), so the actual tappable region is ≥44px. Verified by reading the CSS rule directly. |
| Sheet: `Sort results` select | 358 × 48 | Yes |
| Sheet footer: `Show N results` | 358 × 52 | Yes |
| PDP quantity `−` | 44 × 44 | Yes |
| PDP quantity `+` | 44 × 44 | Yes |
| PDP `Add N to cart` | 350 × 52 | Yes |
| PDP `Add & go to cart` | 350 × 52 | Yes |
| PDP "Request a wholesale quote" text link | 350 × 19.5, **now 44** | Fixed after this measurement. The identical defect (a 20px `Clear filters`) was treated as a blocking spec violation in the Task 2 review, so this was raised to `min-h-[44px]` for consistency rather than accepted as secondary. The `All stock` link beside the "Related tyres" heading was raised the same way. Full quality gate re-run green afterwards. |

### Mobile filter sheet functional flow (390px, `/tyres`)

1. Open sheet via `Filters` trigger → `role="dialog" name="Tyre filters"` becomes visible. Pass.
2. Change `Brand` to `Ralson` inside the sheet → URL updates to
   `?brand=Ralson` immediately (before closing). Pass.
3. Sheet footer live count updates from `Show 25 results` to
   `Show 13 results` on the same interaction, with no separate close/reopen
   needed. Pass.
4. Close via `Show N results` → dialog unmounts (`waitFor state: hidden`
   resolves), URL retains `?brand=Ralson`. Pass.
5. Reopen, close via `Close filters` → dialog unmounts, URL still retains
   `?brand=Ralson`; article grid on the page shows Ralson results after both
   close paths. Pass.
6. Reopen, press `Escape` → dialog unmounts and focus returns to the
   `Filters` trigger (`document.activeElement` resolves to the element whose
   `aria-label`/text is `Filters`). Pass.
7. Filter state survives across the whole open/close/reopen sequence
   (`filterStateSurvivedAfterClose: true`). Pass.

`clearing filters on mobile preserves sort` and the 320px sheet
open/close-cleanly path are additionally covered by the existing
`tests/e2e/stitch-stage-2.spec.ts` suite, which passed (see Behaviour
verification above).

### URL restoration (`/tyres?brand=Ralson&stock=in&sort=price-asc`, cold load, 1280px)

| Field | Expected | Observed |
|---|---|---|
| Brand select | `Ralson` | `Ralson` — match |
| In-stock checkbox | checked | checked — match |
| Sort select | `price-asc` | `price-asc` — match |
| Result count | matches filtered set | 13 articles rendered, first article text confirms `Ralson` / `235/75R17.5` / in current stock — match |

### Multi-word search (`Ralson RDR`, 1280px, `/tyres`)

- Input value after a single fill event: `Ralson RDR` (interior space intact).
- URL: `?q=Ralson+RDR` (space round-trips through the URL param).
- Result set: 5 articles rendered (non-zero, matching). Pass.

### Product cards at 320px (`/tyres`)

Sampled the first 5 cards. None had `boundingBox().x + width > 320`
(no horizontal overflow), and each card's full text content — stock badge,
brand, size, pattern, price, quantity control, add-to-cart button, delivery
note — was present and non-empty in the rendered text snapshot. No clipped
price, size, stock badge or button was observed.

### PDP quantity / add-to-cart / stock cap (`/tyres/ralson-rmr61-295-80r22-5`, 1280px)

- Quantity `+` clicked once: input goes from `1` to `2`. Pass.
- Repeated `+` clicks (bounded loop, checking `isDisabled()` before each
  click): the button becomes disabled at input value `51`, after 49 further
  clicks from `2` — i.e. the ceiling is exactly the SKU's real stock (51
  units, matching `lib/catalogue` data for this SKU). `qtyIncrementDisabledAtCap: true`.
- Repeated `−` clicks from the capped value: input floors at `1` and does not
  go below it (`qtyAfterDecrementBelowMin: "1"`).
- Purchase buttons: `Add N to cart` and `Add & go to cart`, both 52px tall,
  350px wide — both present and correctly reflect the live quantity in their
  label (`Add 2 to cart` observed after the single increment).

### Check 1 — `.product-detail-media` border on the dark plate

`.product-detail-media` (`app/globals.css` line 915) supplies only the dark
radial/linear gradient background; the 1px light border
(`border: 1px solid var(--color-border)` = `#d6dad7`) comes from the
`surface-card` utility class also applied to the same element
(`app/globals.css` line 250). Screenshots taken at 1280px and 390px, cropped
tightly to the media bay with a small margin:

- 1280px: `pdp-media-1280.png` (attached below)
- 390px: `pdp-media-390.png` (attached below)

**Observation:** at both widths the hairline reads as a very faint, subtle
outline that defines the plate's rounded corners against the page — it does
not appear as an obvious pale halo or visual defect at normal viewing
distance. It is more noticeable on close inspection than at a glance,
because the border color (`#d6dad7`, a light warm gray) sits between the
near-black plate and the page's `#F5F6F3`/white surrounding surface, so it
reads as a soft edge transition rather than a glaring ring.

**Comparison point:** Stage 1's `.product-card__media` (the catalogue-card
dark plate, `app/globals.css` line 269) has no border rule of its own, but it
is nested inside `.product-card`/`.surface-card`, which also carries
`overflow-hidden` and the same 1px light border along the card's outer
perimeter — the media sits flush against that edge with no internal padding
between them. So the same effect (a light hairline tracing the outer edge of
a dark plate) already exists in Stage 1 today; Stage 2's product-detail media
bay is consistent with that established pattern rather than introducing a
new one.

**Recommendation:** no change needed. The border is visually inert at both
measured widths and matches the existing Stage 1 precedent rather than
deviating from it. Reported only, per instructions — not modified.

### Check 2 — Homepage lead-card grid tiling and button→note gap (1024/1280/1440)

Grid: `.grid ... sm:grid-cols-2 md:mt-12 lg:grid-cols-3 ...` with the first
(lead) card given `lg:col-span-2`. 8 preview cards total.

| Width | Card count rendered | Tiling | Button-bottom → delivery-note-top gaps (8 cards, px) |
|---|---|---|---|
| 1024 | 8 | Row 1 = lead (2-wide) + card 2 (1-wide) = 3 slots filled exactly; rows 2-3 = 3 cards each (cards 3-8) — no trailing hole | `14, 16, 14, 14, 14, 14, 14, 14` |
| 1280 | 8 | Same tiling, no trailing hole | `14, 15, 14, 14, 14, 14, 14, 14` |
| 1440 | 8 | Same tiling, no trailing hole | `14, 15, 14, 14, 14, 14, 14, 14` |

All 24 measured gaps (8 cards × 3 widths) are 14-16px, i.e. within 2px of the
documented 14px baseline (the `app/globals.css` comment at the
`.product-card--feature.is-lead .product-card__media { aspect-ratio: 11/3 }`
rule states this was tuned to bring the residual gap from ~195-239px down to
~14-20px — the measured values here confirm that tuning holds across all 8
cards at all 3 widths, not just the lead card).

## Defects found

None. No `app/globals.css` change was made by this task — the only
`app/globals.css`/`app/tyres/[slug]/page.tsx` changes present in the working
tree are the pre-existing duplicate `.product-detail-layout` block removal
that was already in progress before this task started (orchestrator's edit,
kept as instructed, not authored here).

## Commands used for this QA (not committed)

Ad hoc Playwright driver scripts were written to the session scratchpad
(outside the repository) to take the above measurements against the
production build served on `localhost:3100`; they are not part of the
committed diff. The only repository file changed by this task is
`tests/e2e/stitch-stage-2.spec.ts` (Step 1's route-guard loop) plus this
report.

## Tracked follow-ups (not blocking the owner gate)

Raised by the final whole-branch review. None were fixed on this branch;
each is recorded here so the decision is the owner's.

**1. Delivery copy is textually duplicated, though the numbers cannot drift.**
`deliveryRuleSummary()` is called from only three files (`Footer.tsx`,
`Header.tsx`, `ProductCard.tsx`). Roughly fifteen other rendered surfaces
build their own sentence around `order.delivery.feeAud` /
`order.delivery.freeQualifyingTyres` directly — `app/about`, `app/checkout`,
`app/commercial`, `app/contact`, `app/delivery`, `app/layout`, `app/terms`,
`app/tyres`, `app/tyres/[slug]`, `Benefits.tsx`, `FreeDeliveryCTA.tsx`,
`Hero.tsx`, `ProductPurchasePanel.tsx`, `lib/seo.ts`.

Verified: every one of those reads the live config fields, so changing
`freeQualifyingTyres` or `feeAud` today produces **no numeric drift on any
surface** — the stated goal of the two fix rounds is met. What remains is
that the *wording* around the numbers is authored independently in each
place, so a change to the phrasing or pluralisation of the rule would need
fifteen manual edits with nothing forcing them into sync. Most of those
files are outside Stage 2's scope, which is why this was not swept up here.

**2. Design-token drift in Stage 2 files.**
- `components/ProductCard.tsx:93` uses a raw `bg-[#e2e5e1]` for the lead-card
  divider while the compact variant at `:141` solves the same seam with
  `bg-[var(--color-border)]`.
- `components/ProductCard.tsx:88` uses `rounded-lg` (Tailwind, 8px) while
  `:131` uses `rounded-[8px]`; identical today, two mechanisms.
- `components/HeroArtwork.tsx:22,36` use `rounded-[28px]` and `rounded-2xl`,
  neither on the declared 6/10/14/20 radius scale.
- Eyebrow and label sizes are arbitrary `text-[Npx]` values (10-13px) across
  the three surfaces rather than a shared token.

Left alone deliberately: the `HeroArtwork` radii and the `rounded-lg` /
`rounded-[8px]` pair cannot be moved onto the token scale without changing
rendered values, which is a design decision rather than a cleanup, and the
divider colour was not changed because the visual QA evidence in this report
was captured against the current rendering.

**3. Mobile filter sheet does not mark background content `aria-hidden`.**
`components/MobileSheet.tsx` has a verified Tab focus trap, Escape handling,
scroll lock and focus restoration, and sets `aria-modal="true"`, but does not
apply `aria-hidden`/`inert` to sibling content. A screen-reader user driving a
virtual cursor rather than Tab could still read into the backdrop. The Task 2
reviewer assessed `aria-modal` without `inert` as acceptable given the trap
holds and the background is not Tab-reachable; the final reviewer disagreed.
Recorded as an open disagreement for the owner.

**4. Pre-existing race in the catalogue search input.**
`components/CatalogueBrowser.tsx` binds the search input's `value` to
`filters.query`, which derives from `useSearchParams()`, and commits each
keystroke through `router.replace`. Because the displayed value follows the
async URL commit rather than local state, a keystroke landing before the
previous commit re-renders can be silently dropped. Confirmed byte-identical
on `origin/master`, so it is **not** introduced by this branch, and it is
distinct from the multi-word `.trim()` bug fixed here (that one is fixed and
covered by unit and E2E regression tests).

Unlikely to fire at normal typing speed on a responsive desktop, but it is not
debounced, it degrades on slower devices and with fast typists, and it fails
silently. Fixing it properly means debouncing the URL commit or holding local
input state reconciled against the URL — the latter conflicts with this
stage's ruling that URL state stays authoritative with no second store, which
is why it was left. Recommended as a tracked ticket, not waved through.

**5. Dismissed on measurement.** The final review raised the lead card's
`sizes` hint as possibly under-declared at 1440px (computed box ~845px against
an `800px` hint). Measured against the production build, the lead media box is
618px at 1024, 775px at 1280, 767px at 1440 and 758px at 1920 — it shrinks
above 1280 because the container is capped — with `naturalWidth` 800 and a
served `w=828` at every width. No upscale at any viewport; the hint is correct.
