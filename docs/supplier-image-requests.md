# Supplier imagery requests

2026-09-09 update (fourth pass): the owner supplied all requested images across four rounds. **24 of 25 catalogue SKUs now have an image** (2 genuine manufacturer assets, 22 owner-approved AI renders). Only 1 SKU remains without an image, and it's not a "send a photo" problem — it's a naming/identity question that needs an answer.

## Only remaining gap: Jumbo SS398 vs "SS398 PLUS"

`jumbo-ss398-29580r225` (Jumbo, 295/80R22.5) has no image. A render was supplied labelled **"SS398 PLUS"** — brand and size match this SKU exactly, but the pattern name carries a "PLUS" suffix that appears nowhere in the catalogue or `docs/source-inventory/brand-name-historical.csv`. A second render (also supplied) for a related but different SKU-less pattern was labelled "SS618+" — the same suffix pattern. `docs/catalogue-verification.md` (#3) already researched "SS618" specifically and could not confirm it exists anywhere (grandstonetyre.com, made-in-china, Alibaba, distributors) — Jumbo's confirmed SS-series is SS200, SS366, SS580, SS668.

Two ways this resolves:
- **If "SS398 PLUS" is the tyre's real, current model name** (manufacturers do update pattern names), say so and I'll rename the catalogue pattern to "SS398 PLUS" and attach the already-supplied render.
- **If "SS398 PLUS" isn't a real distinction** (i.e. it's the same SS398 already in the catalogue, and "PLUS" is just how the render came out), say so and I'll attach the render as-is without renaming anything.

Either way takes one word from you — I'm not guessing given the AI generator has now produced two suffixed Jumbo pattern names in a row with nothing in prior research to corroborate either.

## Unmatched renders (not integrated, for the record)

From the first upload (`Downloads\tyres\`, 2026-09-09):

| Render label (as shown on image) | Why it wasn't used |
| --- | --- |
| Ralson RAC55 — 295/80R22.5 | **Not a real product configuration.** `docs/catalogue-verification.md` (#4) established the real Ralson RAC55 is sold only in 315/80R22.5, 11R22.5, 11R24.5, 385/65R22.5 and 425/65R22.5 — 295/80R22.5 does not exist for RAC55. The correct-size RAC55 11R22.5 render supplied later was used instead. |
| Ralson "RC55" — 11R22.5 | No pattern named "RC55" exists anywhere in the catalogue, the historical stock list, or Ralson's product range. |
| Doublecoin — 11R22.5, 16PR | "Doublecoin" is not a brand carried anywhere in the catalogue or stock list. |

From the second upload (`Downloads\`, 2026-09-09):

| Render label | Why it wasn't used |
| --- | --- |
| "Truck Tyre Tread Detail A" / "Truck Tyre Tread Detail B" | No brand, pattern, or size shown — nothing to verify identity against. |
| Ralson RDR55 — 11R22.5 | Duplicate of a SKU that already had an image. |
| Jumbo "SS618+" — 275/70R22.5 18PR | See "Only remaining gap" above — no SKU exists for this and none was created. |

## Greforce G-PILOT vs. G-PILOT X1 (resolved, not a new change)

The catalogue's `greforce-g-pilot-x1-29580r225` SKU already used the pattern name "G-PILOT X1", not the historical list's plain "G-PILOT" — a deliberate, sourced correction from a prior session (`docs/catalogue-verification.md` #2, confirmed against greforcetire.com/566.html). Not touched in this session.
