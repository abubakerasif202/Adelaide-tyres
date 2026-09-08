# Brand name.pdf historical inventory

`brand-name-historical.csv` preserves the transcription supplied by the owner
from the two-page historical `Brand name.pdf`, recorded on 2026-09-08. The PDF
binary was not available in this checkout, so this file is the reproducible raw
source for reconciliation. It is not an authority to publish products, alter
stock, set prices, or infer product identity.

The source contains 53 rows and 725 units. The currently published static
catalogue contains 25 rows and 491 units. Twenty-five historical rows map to
published SKUs (G-PILOT is normalised to verified G-PILOT X1); three historical
rows were deliberately withheld for identity verification (RAC55 295/80R22.5,
G-ARMOR 11R22.5, SS618 275/70R22.5); the remaining 25 rows require current
stock, price, identity and publication approval.

See `docs/catalogue-reconciliation.md` for row-group reconciliation and owner
actions. Raw spelling and size notation must remain unchanged in this CSV.

The owner subsequently corrected row 20's original PDF quantity notation to
`09`. This notation is retained in the source and parsed separately as 9.
The binary PDF has not been independently cross-checked. The complete 53-row
comparison is in `reconciliation.csv`, reproduced with
`node scripts/reconcile.mjs --csv` (Node 22).
