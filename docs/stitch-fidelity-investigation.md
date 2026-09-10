# Stitch fidelity investigation — 10 September 2026

The local export at `stitch_adelaide_tyres_design_system` was inspected directly. The exported HTML was used for structure and measurements; screenshots were reviewed at desktop and mobile sizes. Stitch controls presentation, while the application remains the source of truth for products, prices, stock, delivery, checkout and contact data.

| Stitch reference | Site route/state | Current implementation | Required action |
| --- | --- | --- | --- |
| Homepage | `/` | `app/page.tsx`, `Hero`, `Benefits`, stock, commercial and delivery components | Align hero proportions, add overlapping finder, use four equal real-stock cards, retain verified data |
| Catalogue desktop/mobile | `/tyres` | `app/tyres/page.tsx`, `CatalogueBrowser`, `ProductCard`, `MobileSheet` | Preserve filters and URL state; align the catalogue shell/card density to the exported desktop/mobile composition |
| Product detail desktop/mobile | `/tyres/[slug]` | `app/tyres/[slug]/page.tsx`, `ProductPurchasePanel` | Preserve verified SKU/specs and purchasing logic; align media bay, purchase panel and responsive stacking |
| Cart desktop/mobile | `/cart` | `app/cart/page.tsx` | Preserve cart semantics; align two-column desktop and stacked mobile commerce workspace |
| Checkout/cart checkout desktop/mobile | `/checkout` | `app/checkout/page.tsx` | Preserve checkout, delivery and Stripe gating; align staged form and order summary |
| Commercial fleets | `/commercial` | `app/commercial/page.tsx` | Preserve factual commercial copy; align industrial hero, tier cards, bento sections and CTA rhythm |
| Delivery rates desktop/mobile | `/delivery` | `app/delivery/page.tsx` | Preserve configured delivery rules; align channel cards, schedules, calculator and depot protocol sections |
| About warehouse | `/about` | `app/about/page.tsx` | Preserve factual warehouse information; align depot hero, capability cards and location section |
| Contact desktop/mobile | `/contact` | `app/contact/page.tsx`, `EnquiryForm`, `ContactChannels` | Preserve real enquiry flow; align directory, depot access and form composition |
| Privacy and terms | `/privacy`, `/terms` | `app/privacy/page.tsx`, `app/terms/page.tsx` | Preserve legal content; use Stitch document-banner/sidebar/card rhythm |
| Order confirmation desktop/mobile | `/checkout/success` | `app/checkout/success/page.tsx` | Preserve confirmation and order data; align only supported confirmation UI |
| Commercial credit form/received | Unsupported by current application | No approved credit application workflow exists | Do not reproduce the mocked 30-day credit workflow or its invented business data |

## Homepage acceptance comparison

- Geometry: the implementation now uses Stitch’s shallow dark hero, overlapping finder dock, four benefit cards, four-card stock grid, dark commercial band and dark delivery band.
- Typography: Barlow and Barlow Condensed remain the configured families, with the Stitch uppercase display hierarchy and tracked utility labels.
- Data deviations: Stitch’s demo inventory totals, phone number, map imagery and commercial claims are not copied. Current catalogue assets, prices, stock and configured address remain authoritative.
- Remaining visual deviation: the approved local product assets are isolated product photographs rather than Stitch’s remote composite hero photography; the existing application has no approved live map asset, so the homepage retains its factual text/CTA treatment.
