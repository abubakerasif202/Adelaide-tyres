# Product image sources

Provenance for every product photo used in the catalogue (`lib/catalogue.ts`).
Accuracy policy: a product only gets a photo when the exact model/pattern could be
verified against manufacturer imagery. Where it could not, the neutral placeholder
(`components/TyreImage.tsx`) is kept and the reason is recorded below.

Date accessed: 2026-09-06.

---

## Ralson RMR61 295/80R22.5 — REAL IMAGE ✅

Local file:
`public/images/tyres/ralson-rmr61-295-80r22-5.webp` (1200×879, WebP, ~41 KB)

Source page:
https://ralsontires.com/tires2/rmr61/ (Ralson Tire North America — official manufacturer site)

Direct image URL (original, before crop/convert):
https://ralsontires.com/wp-content/uploads/2024/02/Untitled-design-81.png (2500×1026 PNG)

Source website / company:
Ralson Tire North America — official brand site for Ralson truck & bus tyres.

Verification:
- The official RMR61 product page hosts this render.
- The tyre sidewall in the render is legibly moulded `RALSON  RMR61  295/80R22.5` —
  the exact brand, exact pattern, and the exact size in our catalogue.
- Cross-checked that RMR61 295/80R22.5 154/149M is a real cataloged size via
  independent distributors: agrigear.ie, ak24parts.com, intercars24.ee.
- Tread: five-rib all-position highway rib pattern — consistent with our
  "all-position radial, even wear" description.

Optimisation performed:
- Cropped from the 2500×1026 marketing render to 1400×1026 to remove dead
  background and centre the tyre (ImageMagick, lossless crop).
- Resized to 1200 px wide and encoded to WebP q82 (method 6).
- No background removal, no stretching; aspect ratio preserved.

Licensing / usage rights:
Manufacturer marketing render of a product being resold. Usage rights should be
confirmed with Ralson Tire North America before commercial launch.

---

## Greforce GR881W 11R22.5 — PLACEHOLDER (not verified)

Why no image:
- "Greforce" (Shandong Kaixuan Rubber) is a real brand and "GR881W" appears as a
  model name in distributor listings
  (e.g. https://kxtyre.en.made-in-china.com/product/fFoAmjISHxGv/ ), but every
  listing only shows a single shared catalogue photo for a group of ~10 models
  (GR881, GR881W, GR998, …) with no individually identifiable GR881W tread photo.
- The official Greforce site (greforcetire.com/product.html) does not list GR881W
  at all.
- No manufacturer photo of GR881W could be confidently isolated. Placeholder kept.

## Greforce G-ARMOR 11R22.5 — PLACEHOLDER (model could not be found)

Why no image:
- No web result anywhere for a Greforce pattern called "G-ARMOR". Greforce's real
  naming scheme is GR###, GRD##, LWD## (verified on greforcetire.com).
- This pattern name could not be verified as a real product. Using any Greforce
  photo would be a knowing substitution, which the brief forbids. Placeholder kept.
- **Action for owner:** confirm the correct Greforce pattern name for this SKU.

## Greforce G-PILOT 295/80R22.5 — PLACEHOLDER (model could not be found)

Why no image:
- Same as G-ARMOR: no evidence of a Greforce pattern called "G-PILOT". Greforce
  steer patterns found in searches are GR998, GR662, etc.
- Could not be verified. Placeholder kept.
- **Action for owner:** confirm the correct Greforce pattern name for this SKU.

## Jumbo SS618 275/70R22.5 — PLACEHOLDER (specific model not found)

Why no image:
- "Jumbo" is a real brand (Qingdao Grandstone Tyre) and the SS-series is real
  (SS200, SS366, SS580, SS668 verified on grandstonetyre.com), but no listing or
  photo for "SS618" specifically could be found.
- SS668 (11R22.5 drive) exists and is close in numbering, but it is a different
  pattern — substituting it would misrepresent the product. Placeholder kept.
- **Action for owner:** confirm whether this SKU is SS618 or a neighbouring
  SS-series pattern, then a Grandstone/Jumbo product photo can be sourced.

## Ralson RAC55 295/80R22.5 — PLACEHOLDER (model verified, but data mismatch)

Why no image, despite the model being real:
- RAC55 is a real Ralson pattern with an official page:
  https://ralsontires.com/tires/rac55/ — a clean render exists.
- BUT the official RAC55 is an **open-shoulder all-position block tyre for
  construction / waste haul**, offered in 315/80R22.5, 11R22.5, 11R24.5,
  385/65R22.5, 425/65R22.5 — **not** 295/80R22.5, and **not** the "steer-axle rib
  tread" our catalogue currently describes.
- Putting the real RAC55 photo (which shows `315/80R22.5` on the sidewall and an
  aggressive block tread) next to our "295/80R22.5 steer rib" copy would
  misrepresent the product.
- **Action for owner:** correct this catalogue entry — either the size/description
  are wrong, or the pattern code is wrong. Once the real spec is known, the
  matching Ralson render can be dropped in from ralsontires.com.

---

## Summary

| Product | Status | Source |
|---|---|---|
| Ralson RMR61 295/80R22.5 | ✅ real photo | ralsontires.com official |
| Greforce GR881W 11R22.5 | placeholder | no isolatable GR881W photo |
| Greforce G-ARMOR 11R22.5 | placeholder | pattern name unverifiable |
| Greforce G-PILOT 295/80R22.5 | placeholder | pattern name unverifiable |
| Jumbo SS618 275/70R22.5 | placeholder | SS618 not found (SS-series is real) |
| Ralson RAC55 295/80R22.5 | placeholder | model real but catalogue size/desc mismatch |

**Licensing note:** all candidate imagery is manufacturer/distributor marketing
material for products being resold. None of it is confirmed royalty-free. Usage
rights should be confirmed with each manufacturer before commercial launch.
