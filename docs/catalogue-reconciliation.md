# Historical inventory reconciliation — 2026-09-08

Source: `docs/source-inventory/brand-name-historical.csv`, a verbatim
transcription of the supplied historical `Brand name.pdf`. The PDF binary was
not available locally. Current catalogue source: `lib/catalogue.ts`.

| Category | Rows | Units | Publication result |
| --- | ---: | ---: | --- |
| Exact raw brand/pattern/normalised-size match | 24 | 491 | Published, current quantity equals historical quantity; prices are repository-only current values. |
| Normalised model match | 1 | 37 | Greforce G-PILOT → published G-PILOT X1; manufacturer verification exists. |
| Withheld identity conflict | 3 | 152 | Not published: RAC55 295/80R22.5 (38), G-ARMOR 11R22.5 (74), SS618 275/70R22.5 (40). |
| Historical-only rows | 25 | 82 | Not published; no current stock/price/publication authority. |

## Published matches

Rows 1–3, 5–16, 18–22 and 24–28 map to current catalogue entries by exact
brand/pattern/size except row 19, which maps from raw `G-PILOT` to verified
`G-PILOT X1`. Their historical quantities equal the current static catalogue
quantities. This is a coincidence/record match, not live stock verification.
Current prices are available only in `lib/catalogue.ts`; historical prices were
not supplied. Image status is recorded per SKU in `docs/product-image-manifest.json`.

## Withheld conflicts

| Source row | Raw identity | Qty | Result | Required owner evidence |
| ---: | --- | ---: | --- | --- |
| 4 | Ralson RAC55 295/80r22.5 | 38 | withheld; no matching published SKU | sidewall, tread and approved current stock/price |
| 17 | Greforce G-ARMOR 11r22.5 | 74 | withheld; model unverified | sidewall, tread and approved current stock/price |
| 23 | Jumbo SS618 275/70r22.5 | 40 | withheld; model unverified | sidewall, tread and approved current stock/price |

## Historical-only source rows

Rows 29–53 are not current catalogue products: Sailun S606; Marvemax MX921;
Roadone HF21; Hawkway HW863; Triangle TR918/TR685/TRS02; Nipon AD156; Hankook
AH39; Regional S647+; Westlake GR9604/Z-108; Sailun S637+/S637/An800/S702;
Cotechoo 99t; Annaite An900; Durable Sport; Conqueror At-5; and Roadstone Hp02.
They remain unpublished because neither approved current stock nor price was
provided. No product images were added for them.

## Owner-action list

1. Provide dated current stock and approved ex-GST prices for any historical-only row to publish.
2. Provide sidewall and tread photos for rows 4, 17 and 23 before creating or restoring products.
3. Supply written reseller-image permission plus original files for each SKU requiring a genuine image.
4. Confirm an inventory system and transactional order store before representing stock as live or enabling payment.
