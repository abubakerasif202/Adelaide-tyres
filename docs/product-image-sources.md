# Product image sources

Provenance for every product photo used in the catalogue (`lib/catalogue.ts`).
Accuracy policy: a product only gets a photo when the exact model/pattern could be
verified against manufacturer imagery. Where it could not, the neutral placeholder
(`components/TyreImage.tsx`) is kept and the reason is recorded below.

Dates accessed: 2026-09-06 (RMR61), 2026-09-07 (G-PILOT X1 + catalogue verification).
See `docs/catalogue-verification.md` for the full model-name / size research on the
four questionable SKUs.

---

## Greforce G-PILOT X1 295/80R22.5 — REAL IMAGE ✅

Local file:
`public/images/tyres/greforce-g-pilot-295-80r22-5.webp` (1000×1000, WebP, ~42 KB)

Source page:
https://www.greforcetire.com/566.html — official Greforce (Shandong Greforce Tire
Co. / Shandong Kaixuan Tire Co.) product page for the **G-PILOT X1**.

Direct image URL (original, before crop/convert):
https://vhost-ln-s03-cdn.hcwebsite.com/35ae9121d02756c703a7014bef37bbd9/data/thumb/res/en/20240716/x1_0682265b.jpg_20240716141549_800x800.jpg
(800×800 JPEG, white background, hosted on Greforce's own CDN)

Verification:
- Image is published on Greforce's own G-PILOT X1 product page.
- That page lists the size **295/80R22.5** (and 315/80R22.5), **steer** position,
  long-haul highway application, and a "four straight grooves / wide running
  surface" rib tread — all matching our catalogue entry.
- The tyre sidewall in the photo is moulded `GREFORCE`. The photo is a studio
  render on white and does not show the size text, but its provenance (the exact
  model's official page) is unambiguous.
- Cross-checked the G-PILOT family: X1 = steer (this one), X3 = drive, X5 = light
  truck — so the steer/rib match is specifically to X1.

Optimisation performed:
- Cropped out the "GREFORCE / together and better" logo banner across the top of
  the source image, re-centred the tyre, padded to a 680×680 white square,
  added a 30 px white margin, resized to 1000×1000.
- Encoded WebP q88 (method 6). No background removal, no stretching, aspect
  ratio preserved, tyre not cropped.

Licensing / usage rights:
Manufacturer product image for a tyre being resold. Not confirmed royalty-free —
usage rights should be confirmed with Greforce before commercial launch.

---

## Ralson RMR61 295/80R22.5 — REAL IMAGE ✅

Local file:
`public/images/tyres/ralson-rmr61-295-80r22-5.webp` (1200×1200, WebP, ~59 KB)

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
- Cropped from the 2500×1026 marketing render around the tyre, squared to
  1:1 with a seamless edge-stretched gradient fill (no letterbox bars),
  resized to 1200×1200 and encoded to WebP q85 (method 6).
- No background removal, no stretching; aspect ratio preserved; tyre not cropped.

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

## Greforce G-ARMOR 11R22.5 — PLACEHOLDER (model unverified — needs physical photo)

Why no image:
- No result anywhere for a Greforce pattern called "G-ARMOR" / "G-ARMOUR" —
  not on greforcetire.com (product list, pages /563–/572, G-PILOT related links),
  not on any distributor. Greforce **does** use a "G-" family ("G-PILOT"), so a
  parallel "G-ARMOR" family is plausible but unproven.
- Substituting any other Greforce pattern is forbidden. Placeholder kept.
- **Action for owner:** see `docs/catalogue-verification.md` — take a sidewall
  photo (brand, moulded pattern code, size, load index) + straight-on tread.

## Jumbo SS618 275/70R22.5 — PLACEHOLDER (model unverified — needs physical photo)

Why no image:
- "Jumbo" is a real brand (Qingdao Grandstone Tyre) and the SS-series is real
  (SS200, SS366, SS580, SS668 verified on grandstonetyre.com), but no listing or
  photo for "SS618" specifically could be found.
- SS668 (11R22.5 drive) is the closest by number but is a different size and a
  different block pattern — substituting it would misrepresent the product.
- **Action for owner:** see `docs/catalogue-verification.md` — take a sidewall
  photo (brand "JUMBO", moulded "SS___" code, size, ply) + straight-on tread.

## Ralson RAC55 295/80R22.5 — PLACEHOLDER (catalogue data is INCORRECT for RAC55)

Why no image:
- RAC55 is a real Ralson pattern (https://ralsontires.com/tires/rac55/) but it is
  an **all-position construction / waste-haul open-shoulder block tyre** offered in
  315/80R22.5, 11R22.5, 11R24.5, 385/65R22.5, 425/65R22.5 — **not 295/80R22.5**,
  and **not the "steer-axle rib" tread** the catalogue describes. Deep 24/32 tread.
- Ralson's real 295/80R22.5 steer rib tyre is the **RMR61** (already a separate
  SKU here). The "RAC55 295/80R22.5 steer rib" line cannot be photographed
  accurately because it does not correspond to a real product as written.
- **Action for owner:** see `docs/catalogue-verification.md` — the SKU needs to be
  identified from the physical tyre before it gets a photo or a corrected entry.

---

## Summary

| Product | Status | Source |
|---|---|---|
| Ralson RMR61 295/80R22.5 | ✅ real photo | ralsontires.com official |
| Greforce G-PILOT X1 295/80R22.5 | ✅ real photo | greforcetire.com official |
| Greforce GR881W 11R22.5 | placeholder | no isolatable GR881W photo (and see verification doc: real GR881 is a steer rib, not the drive block currently described) |
| Greforce G-ARMOR 11R22.5 | placeholder | pattern unverified — needs physical photo |
| Jumbo SS618 275/70R22.5 | placeholder | SS618 not found — needs physical photo |
| Ralson RAC55 295/80R22.5 | placeholder | catalogue size/position/tread are wrong for RAC55 — needs physical photo |

**Licensing note:** all candidate imagery is manufacturer/distributor marketing
material for products being resold. None of it is confirmed royalty-free. Usage
rights should be confirmed with each manufacturer before commercial launch.
