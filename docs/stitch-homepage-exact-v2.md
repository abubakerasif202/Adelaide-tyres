# Stitch homepage exact v2 — measured investigation

Date: 10 September 2026  
Reference: `stitch_adelaide_tyres_design_system/adelaide_wholesale_tyres_homepage`

## Evidence inspected

- `screen.png`: physical PNG dimensions **484 × 1600 px**.
- `code.html`: **987 lines / 61,072 bytes**, SHA-256 `F74F5FC886F0A6B95164EE7D3A295D3B44E89C8C03D48781AB948BBA5669B97E`; read in full.
- The PNG is a downsampled desktop composition, not a mobile layout: it displays the HTML's desktop navigation, 12-column hero, four-column benefits and four-column stock grid. The HTML-authored 1280px container occupies about 242px in the PNG, indicating an approximate 18.9% export scale and a logical source canvas near 2560px wide.
- No separate homepage mobile `screen.png` exists in the supplied export. Homepage mobile fidelity therefore follows the complete responsive classes in `code.html`, with the desktop PNG used for visual hierarchy.
- Homepage-relevant design sources: root `design.md`, `adelaide_wholesale_tyres_design.md`, and `commercial_heavy_duty_tyre_wholesale/DESIGN.md`.

## Stitch layout measurements

| Reference element | Stitch measurement / style |
|---|---|
| Global content width | `max-w-container-max` = **80rem / 1280px** |
| Horizontal gutters | **24px** (`px-gutter-lg`) at all authored homepage sections; top ticker uses 16px outer padding with a 1280px inner container |
| Top announcement bar | `py-2` = **8px top + 8px bottom** around 14px body text; approximately **36px** total; gunmetal `#2C3233`, 1px dark-green lower border |
| Navigation | Explicit **80px** (`h-20`), white surface, 1px `#D6DAD7` border, subtle shadow; 1280px inner width and 24px gutters |
| Header total | Approximately **116px** before sticky positioning: ~36px ticker + 80px navigation |
| Desktop hero | Dark green `#052A20`; **96px vertical padding** (`md:py-unit-4xl`); 1280px container; 12-column grid with **32px gap**; no arbitrary minimum height |
| Mobile hero | **48px vertical padding** (`py-unit-2xl`); one-column grid; media follows copy with 32px gap |
| Hero columns | Copy **7/12**, media **5/12** at `lg`; one column below 1024px |
| Hero heading | Barlow Condensed 800 uppercase; **84px / 0.96 line-height** desktop, **48px / 1.0** mobile; 16px bottom margin; exact two-part line treatment |
| Hero eyebrow | 12px / 1.3 / 0.14em; 12px × 4px pill padding; 16px bottom margin; mint on translucent green |
| Hero body | **18px / 1.6**, `max-w-xl` = **576px**, 32px bottom margin |
| Hero CTAs | Primary 32px horizontal / 16px vertical; secondary 24px / 16px; 14px uppercase; 16px gap; authored `rounded-xl` resolves to **8px** in the embedded config |
| Hero trust row | 3 columns desktop, 2-column mobile with final item spanning two; 16px gap; 40px top margin + 24px top padding + 1px divider |
| Hero media | 5-column bay; **24px padding**, 1px translucent border, authored `rounded-2xl` (Tailwind default 16px because only through `xl` is overridden); image stage **4:3**, 24px top padding; footer 16px top margin + 16px top padding |
| Finder overlap | **-32px** (`-mt-8`) relative to hero base; z-index 30 |
| Finder panel | 1280px outer max with 24px gutters; **24px padding / 32px at lg**; 1px `#C2C8C3`; 16px radius; `shadow-xl` |
| Finder tabs | Horizontal scroll row; 8px gap; 16px bottom padding, 24px bottom margin; active/inactive buttons **20px × 10px padding**, 14px type, 8px radius |
| Finder form | **5 equal columns** at `lg`, 2 at `sm`, 1 otherwise; 16px gap; fields/buttons **48px height** |
| Finder labels | 11px / 1.2 / 0.10em uppercase; 6px bottom margin |
| Finder shortcuts | 16px top margin + 16px top padding + divider; 8px gaps; compact bordered chips |
| Benefits section | **48px vertical padding**; 1280px / 24px gutters; centred 672px heading block; **40px** heading-to-grid gap |
| Benefit cards | 4 equal columns at `lg`, 2 at `md`, 1 below; **24px gap**; **24px padding**; 1px border plus **4px top accent**; 8px radius; 48px icon tile; 22px heading; 14px body |
| Delivery meter | 32px top margin; 20px padding / 24px at md; 16px radius; horizontal at md; progress side **384px** |
| Stock section | **48px vertical padding**, 1px top border; 1280px / 24px gutters; 32px heading-to-grid gap |
| Stock grid | **4 equal columns** at `lg`, 2 at `sm`, 1 below; **24px gap** |
| Product cards | 16px radius, 1px border; dark **16:10 media** with 16px padding; body **20px padding**; 22px title, 22px price, 40px quantity/action row |
| Stock CTA | 48px top margin; 32px × 16px button padding; 8px radius |
| Commercial section | Dark green; **72px vertical padding**; 12-column grid, **7/5**, 32px gap; three equal point cards in left column; quote form in right card with 24px / 32px padding |
| Delivery/warehouse section | Muted light surface; **72px vertical padding**; 12-column **5/7** grid; 32px gap; both panels stretch equally; cards 24px / 32px padding and 16px radius |
| Final CTA strip | Gunmetal; **48px vertical padding**; row at `md`, 24px gap; content left and actions right |
| Footer | Dark green; 1280px / 24px gutters; **48px vertical padding**; 4 equal columns at `md`; **24px gaps**; legal row 16px vertical padding and 1px divider |
| Breakpoints in reference | `sm` **640px**, `md` **768px**, `lg` **1024px**, `xl` **1280px** (Tailwind defaults) |
| Radii | Embedded HTML config: default 2px, lg 4px, xl 8px, full 12px; unconfigured `2xl` remains Tailwind default 16px |
| Borders | Subtle `#D6DAD7`, strong `#C2C8C3`, fields `#C4CEC8`; generally 1px except benefit-card 4px top accents |
| Surfaces | Hero/commercial `#052A20`; deep accents `#04211A`; gunmetal `#2C3233`; page `#F6FAFA`; muted `#F5F6F3`; cards white |

## Root-cause comparison and required corrections

| Reference element | Stitch measurement/style | Current implementation | Required correction |
|---|---|---|---|
| Header | ~36px ticker + fixed 80px nav, desktop search, underline active nav, restrained trailing actions | 38px ticker + variable 73/64px nav, no search, green filled cart button, broad 64px gutters at desktop | Hold nav at 80px, use 24px gutters, reproduce search/nav spacing and active underline; retain only real routes/data and omit fake phone/account controls |
| Hero structure | 7/5 12-column layout, 96px vertical padding, no min-height | `1.08fr/0.92fr`, 48–64px top padding, 96–112px bottom padding, 610px minimum height | Replace with 7/5 grid and symmetric 96px desktop / 48px mobile padding |
| Hero heading | 84px desktop, 48px mobile, one explicit break before mint phrase | Clamp to 88px with an extra forced break inside the mint phrase | Use exact Stitch scale and line structure; permit natural mobile wrapping only |
| Hero media | Simple 24px padded 4:3 product bay and compact footer | Invented integrated bay with two tags, additional SKU totals and custom gradient treatment | Remove invented secondary tag and match bay padding, 4:3 stage, border, radius and footer geometry while using one approved real SKU |
| Finder | -32px overlap, 32px desktop padding, 5-column form, 48px controls | -28px overlap (-18px mobile), 20/28px padding, 4-column form, 52px controls | Use -32px overlap, 24/32px padding and five-column visual geometry mapped to existing catalogue query conventions |
| Benefits | Four separate equal cards with heading block and delivery meter | One continuous specification bar with a dark highlighted cell; no section heading or meter | Rebuild as four discrete Stitch cards; use verified config-derived facts; provide a factual delivery threshold meter without fabricated cart state |
| Stock | Four equal 16:10 cards, 24px gaps, heading plus category pills | Four cards exist but use custom card content hierarchy, 20px gaps, muted section and nonmatching heading/pill arrangement | Match exact four-column spacing, 16:10 media, card padding, title/price/action geometry; retain actual products, stock, prices and images |
| Commercial | 7/5 section with three point cards and right form card | 1.1/0.9 composition with four-stat panel | Restore 7/5 geometry. Replace unsupported form/credit content with a same-sized factual quote/contact panel linked to the real contact workflow |
| Delivery | Light 5/7 warehouse/details and media composition, followed by separate dark CTA | Dark three-tier delivery block directly after commercial | Reproduce light 5/7 composition using factual rules/address and an approved non-fabricated visual treatment; preserve distinct final CTA |
| Footer | Dark green, four columns, 48px top/bottom, compact legal bar | Charcoal, five-column desktop grid, 64px vertical padding | Match dark-green four-column geometry while retaining real links and configured contact/address data |
| Container | 1280px with fixed 24px section gutters | 1280px with `clamp(16px,4vw,64px)`; only 1152px content at 1280+ | Introduce homepage-scoped 24px desktop gutters and 16px mobile gutters so the composition occupies the same width |
| Motion | Mostly static reference with short interactions | Ambient glow/breathe and general reveal already present | First match static geometry; retain only short opacity/transform entrances and hover shifts, fully disabled under reduced motion |

## Data substitutions and deliberate constraints

- Replace Stitch demo products, counts, prices and images with `lib/catalogue.ts` data and exact approved images.
- Replace every obsolete Stitch street-number display with `business.address` / `order.pickup` values for **4 Birralee Rd, Regency Park SA 5010, Australia**.
- Omit the fake phone, ABN, trading hours, ratings, schedules, fleet statistics, turnaround times, loading claims and 30-day-credit workflow.
- Preserve `/tyres` URL-filter conventions, cart shape, checkout/delivery calculations, Stripe, webhooks and order persistence.
- Accessibility can override visually inaccurate semantics or interaction sizes; all interactive targets remain at least 44px.
