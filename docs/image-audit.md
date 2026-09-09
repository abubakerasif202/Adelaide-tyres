# Image audit — 2026-09-09

## Correction (2026-09-09, second pass)

The first version of this audit made two mistakes, both corrected below:

1. It overwrote two SKUs' **genuine manufacturer-sourced images** (Ralson RMR61 295/80R22.5 and Greforce G-PILOT X1 295/80R22.5 — both originally sourced from the brands' own official product pages) with the owner-supplied AI renders. Those two files have been **restored** from git history and the catalogue/manifest reverted. AI renders should only fill a gap where no real asset existed — never replace one that did.
2. It said "no SKU exists for Ralson RAC55 295/80R22.5" without checking `docs/catalogue-verification.md`, which had already researched this exact question and found the real Ralson RAC55 **does not come in 295/80R22.5 at all** — it's a construction/waste-haul block tyre sold only in 315/80R22.5, 11R22.5, 11R24.5, 385/65R22.5 and 425/65R22.5. The historical stock list's "RAC55 295/80R22.5, qty 38" row is itself the unresolved record that triggered that research (it's flagged `withheld` in the reconciliation, not confirmed) — it is not proof the combination is real, and an AI render repeating the same label isn't independent evidence either.

## Fourth pass (2026-09-09, later still) — final 4 renders, and SS398 resolved

The owner supplied the last 4 requested images (Opartner CP989 265/70R19.5, Haulmax ATT420 295/80R22.5, Ralson RDR75 235/75R17.5, Haulmax ATT101 275/70R22.5), same AWT-branded card style as the third pass. All 4 matched exactly — no discrepancies, no suffixes, no ambiguity — and were integrated.

The owner then resolved the one open question ("remove it") — the "SS398 PLUS"/"SS618+" renders are discarded, not used. `jumbo-ss398-29580r225` keeps its original pattern name ("SS398", no suffix) and remains without an image, rendering the neutral "Photo pending" placeholder. This was a deliberate decision, not an oversight.

**Final tally: 24 of 25 catalogue SKUs have an image** (2 genuine manufacturer assets, 22 owner-approved AI renders). 1 SKU (Jumbo SS398) intentionally has no image pending genuine supplier photography — see `docs/supplier-image-requests.md`.

## Third pass (2026-09-09, later same day) — 15 more owner-supplied renders

The owner supplied 15 more images directly in `Downloads\` (not the `tyres\` subfolder), in a new visual style: an "Adelaide Wholesale Tyres" branded promotional card (AWT logo, tagline, brand/model/size footer) rather than the earlier bare studio-style renders. Still AI-generated (ChatGPT), same `owner-approved-ai-render` policy applies. Of the 15:

- **10 matched a still-missing SKU exactly** (brand, pattern, size all correct) and were integrated.
- **2 were generic, unlabelled "Truck Tyre Tread Detail A/B" images** — no brand, pattern, or size shown, so there is nothing to verify identity against. Not used.
- **1 duplicated a SKU that already had an image** (Ralson RDR55 11R22.5) — not needed, not used.
- **2 carry a "+"/"PLUS" suffix not present anywhere in the catalogue or the historical stock list**, on the two Jumbo/Grandstone-family SKUs specifically — see "Flagged, not integrated" below. Neither was used.

## Source folder audit (original 16, first pass)

`C:\Users\abuba\Downloads\tyres` contained 16 PNG files, all named `ChatGPT Image Sep 9, 2026, ...`. All 16 are **AI-generated renders**, not photographs — confirmed by garbled/nonsense pseudo-text in the safety-warning copy on several labels (a known AI-image-generation artifact) and by the filenames themselves. This is a deliberate departure from this project's prior policy (`docs/product-image-manifest.json`, `docs/supplier-image-requests.md`), which previously treated AI renders as disallowed for product photography. **The site owner was told this explicitly and instructed the renders be integrated anyway** ("just add all images i know what im doing", 2026-09-09), with the explicit condition that they never be described as genuine manufacturer photography. They are recorded in the manifest with status `owner-approved-ai-render` — distinct from genuine manufacturer photography and from the `existing-genuine-asset-rights-pending` status used for the 2 real sourced assets — so this stays traceable.

- 16 files → 13 unique images (3 were byte-for-byte duplicates of 3 others).
- 8 of 13 unique renders carried a brand + pattern + size label matching an existing catalogue SKU **that had no pre-existing image**, and were integrated.
- 2 renders matched a SKU that already had a genuine manufacturer-sourced image — **not used**, the real asset was kept.
- 3 unique renders did not match any real catalogue SKU (see "Unmatched renders" below) and were **not** integrated.

## Catalogue image status (all 25 SKUs)

| Brand | Pattern | Size | SKU | Website image path | Status | Action needed |
| --- | --- | --- | --- | --- | --- | --- |
| Ralson | RDR75 | 265/70R19.5 | ralson-rdr75-26570r195 | `/images/tyres/ralson-rdr75-265-70r19-5.webp` | **owner-approved AI render** | None — label reads "RDR75 265/70R19.5". |
| Ralson | RMR61 | 265/70R19.5 | ralson-rmr61-26570r195 | `/images/tyres/ralson-rmr61-265-70r19-5.webp` | **owner-approved AI render** | None — label reads "RMR61 265/70R19.5". |
| Ralson | RMR61 | 295/80R22.5 | ralson-rmr61-29580r225 | `/images/tyres/ralson-rmr61-295-80r22-5.webp` | **genuine supplier asset** | None — original manufacturer-sourced image (ralsontires.com). Also used as the homepage hero image. |
| Ralson | RDR75 | 295/80R22.5 | ralson-rdr75-29580r225 | `/images/tyres/ralson-rdr75-295-80r22-5.webp` | **owner-approved AI render** | None — label reads "RDR75 295/80R22.5". |
| Ralson | RMR61 | 385/65R22.5 | ralson-rmr61-38565r225 | `/images/tyres/ralson-rmr61-385-65r22-5.webp` | **owner-approved AI render** | None — label reads "RMR61 385/65R22.5". |
| Ralson | RTR71 | 11R22.5 | ralson-rtr71-11r225 | `/images/tyres/ralson-rtr71-11r22-5.webp` | **owner-approved AI render** | None — label reads "RTR71 11R22.5". |
| Ralson | RDR52 | 11R22.5 | ralson-rdr52-11r225 | `/images/tyres/ralson-rdr52-11r22-5.webp` | **owner-approved AI render** | None — label reads "RDR52 11R22.5". |
| Ralson | RDR55 | 11R22.5 | ralson-rdr55-11r225 | `/images/tyres/ralson-rdr55-11r22-5.webp` | **owner-approved AI render** | None — label reads "RDR55 11R22.5". |
| Ralson | RDC66 | 11R22.5 | ralson-rdc66-11r225 | `/images/tyres/ralson-rdc66-11r22-5.webp` | **owner-approved AI render** | None — label reads "RDC66 11R22.5". |
| Ralson | RAC55 | 11R22.5 | ralson-rac55-11r225 | `/images/tyres/ralson-rac55-11r22-5.webp` | **owner-approved AI render** | None — label reads "RAC55 11R22.5" (the correct, confirmed-real size — see `docs/catalogue-verification.md` #4). |
| Ralson | RDR75 | 235/75R17.5 | ralson-rdr75-23575r175 | `/images/tyres/ralson-rdr75-235-75r17-5.webp` | **owner-approved AI render** | None — label reads "RDR75 235/75R17.5". |
| Ralson | RMR61 | 235/75R17.5 | ralson-rmr61-23575r175 | `/images/tyres/ralson-rmr61-235-75r17-5.webp` | **owner-approved AI render** | None — label reads "RMR61 235/75R17.5". |
| Ralson | RMR61 | 275/70R22.5 | ralson-rmr61-27570r225 | `/images/tyres/ralson-rmr61-275-70r22-5.webp` | **owner-approved AI render** | None — label reads "RMR61 275/70R22.5". |
| Greforce | HD02 | 11R22.5 | greforce-hd02-11r225 | `/images/tyres/greforce-hd02-11r22-5.webp` | **owner-approved AI render** | None — label reads "HD02 11R22.5". |
| Greforce | GR881W | 11R22.5 | greforce-gr881w-11r225 | `/images/tyres/greforce-gr881w-11r22-5.webp` | **owner-approved AI render** | None — label reads "GR881W 11R22.5". |
| Greforce | GRD1919 | 11R22.5 | greforce-grd1919-11r225 | `/images/tyres/greforce-grd1919-11r22-5.webp` | **owner-approved AI render** | None — label reads "GRD1919 11R22.5". |
| Greforce | G-PILOT X1 | 295/80R22.5 | greforce-g-pilot-x1-29580r225 | `/images/tyres/greforce-g-pilot-295-80r22-5.webp` | **genuine supplier asset** | None — original manufacturer-sourced image (greforcetire.com). Pattern name "G-PILOT X1" is a pre-existing, sourced correction (see below), not something changed in this pass. |
| Greforce | GRT33 | 9.5R17.5 | greforce-grt33-95r175 | `/images/tyres/greforce-grt33-9-5r17-5.webp` | **owner-approved AI render** | None — label reads "GRT33 9.5R17.5 18PR". |
| Greforce | GRT33 | 235/75R17.5 | greforce-grt33-23575r175 | `/images/tyres/greforce-grt33-235-75r17-5.webp` | **owner-approved AI render** | None — label reads "GRT33 235/75R17.5". |
| Jumbo | SS398 | 295/80R22.5 | jumbo-ss398-29580r225 | — | **missing (intentional)** | A render labelled "SS398 PLUS" was supplied but discarded on owner instruction ("remove it") — pattern name stays "SS398", genuine supplier photography still needed. |
| Opartner | CP989 | 265/70R19.5 | opartner-cp989-26570r195 | `/images/tyres/opartner-cp989-265-70r19-5.webp` | **owner-approved AI render** | None — label reads "CP989 265/70R19.5". |
| Haulmax | ATT101 | 11R22.5 | haulmax-att101-11r225 | `/images/tyres/haulmax-att101-11r22-5.webp` | **owner-approved AI render** | None — label reads "ATT101 11R22.5". |
| Haulmax | ATT101 | 275/70R22.5 | haulmax-att101-27570r225 | `/images/tyres/haulmax-att101-275-70r22-5.webp` | **owner-approved AI render** | None — label reads "ATT101 275/70R22.5". |
| Haulmax | ATT420 | 295/80R22.5 | haulmax-att420-29580r225 | `/images/tyres/haulmax-att420-295-80r22-5.webp` | **owner-approved AI render** | None — label reads "ATT420 295/80R22.5". |
| Sailun | SFR22 | 385/65R22.5 | sailun-sfr22-38565r225 | `/images/tyres/sailun-sfr22-385-65r22-5.webp` | **owner-approved AI render** | None — label reads "SFR22 385/65R22.5 20PR". |

**2 genuine supplier assets, 22 owner-approved AI renders, 1 intentionally without an image** (25 total SKUs). SKUs without an image render as a neutral "Photo pending" placeholder (`components/TyreImage.tsx`) — never a substitute tyre's photo.

## Flagged, not integrated (identity uncertain)

Both concern the Jumbo/Grandstone brand family and both carry a suffix ("+" / "PLUS") that doesn't appear anywhere in the catalogue or `docs/source-inventory/brand-name-historical.csv`:

| Render label | Why it wasn't used |
| --- | --- |
| Jumbo **SS398 PLUS** — 295/80R22.5 | Brand and size match the existing `jumbo-ss398-29580r225` SKU exactly, but the pattern name has an unexplained "PLUS" suffix the catalogue doesn't have. This could be (a) a genuine current-model update Jumbo has made since the catalogue text was written, in which case the image is fine and the pattern name should become "SS398 PLUS", or (b) an AI-invented variant name with no real product behind it. I did not guess — confirm which before I attach it or rename anything. |
| Jumbo **SS618+** — 275/70R22.5 18PR | `docs/catalogue-verification.md` (#3) already researched "SS618" specifically and could not find it on grandstonetyre.com, made-in-china, Alibaba, or any distributor — Jumbo's confirmed SS-series is SS200, SS366, SS580, SS668, none of them SS618. This render doesn't establish the model is real; if anything, seeing a second Jumbo pattern turn up with an invented-looking "+" suffix makes an AI-generated model number more likely, not less. No SKU exists for this and none was created. If SS618(+) is genuinely a stocked line, it needs a real sidewall photo before it goes in the catalogue at all. |

## Unmatched renders from the first pass (not integrated)

| Render label (as printed on the image) | Why it wasn't used |
| --- | --- |
| Ralson RAC55 — 295/80R22.5 | **This size does not exist for the real Ralson RAC55.** See Correction #2 above and `docs/catalogue-verification.md` #4. |
| Ralson "RC55" — 11R22.5 | No pattern named "RC55" exists in the catalogue, the historical stock list, or Ralson's product range. Not assumed to be a mislabelled RDC66, RAC55, or RDR55. |
| Doublecoin — 11R22.5, 16PR | "Doublecoin" is not a brand carried in the catalogue or stock list at all. |

These 3 files remain only in `C:\Users\abuba\Downloads\tyres` — not copied into the repo. The 2 generic "Truck Tyre Tread Detail A/B" images from the third pass remain only in `C:\Users\abuba\Downloads\` — also not copied in.

## Greforce G-PILOT vs. G-PILOT X1

Not a new finding or a change made in any of these passes. `docs/catalogue-verification.md` (#2) already confirmed, sourced against the manufacturer's own product page (greforcetire.com/566.html), that the real product is "G-PILOT X1" (steer variant, confirmed 295/80R22.5) — the historical stock list's plain "G-PILOT" was the imprecise record.

## Non-product imagery

| Asset | Status | Note |
| --- | --- | --- |
| Homepage hero (`components/HeroArtwork.tsx`) | uses `ralson-rmr61-295-80r22-5.webp` | Genuine manufacturer-sourced image; no broken path. |
| Favicon | **fixed** | `app/icon.tsx` — code-generated monogram, not a fabricated photo. |
| Open Graph / social preview image | **fixed** | `app/opengraph-image.tsx` — code-generated brand card. `og:image`/`twitter:image` resolve correctly. |
| Web app manifest icons | still missing | Lower priority; flagged for awareness, not fixed. |

## Image optimisation

All AI-render images were converted from PNG to WebP at quality 82, capped at 1200px width, using `sharp`. First-pass renders were 1086×1448 sourced from `Downloads\tyres\`; second-pass renders were 1122×1402 sourced directly from `Downloads\`. Aspect ratio preserved, no upscaling, no watermarks, no alteration of the label/brand markings in the source image. The 2 genuine supplier assets were left untouched.

## Test/build/site status (2026-09-09, after third pass)

- `npm test` — 68/68 pass.
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `npm run build` — clean.
- Verified via live dev server + headless browser: zero horizontal overflow at 375/768/1280px on every route, zero console errors/warnings on the newly-added product pages and the listing grid, correct thumbnails at uniform size.

Not changed anywhere in this work: business contact details, pricing, stock quantities, or any other business-supplied content — only image integration/provenance and the code-level rendering/config bugs fixed earlier in this session (site-wide URL crash, missing OG image/favicon, distorted thumbnails, mobile overflow, `data-scroll-behavior`).
