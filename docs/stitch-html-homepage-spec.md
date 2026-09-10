# Stitch homepage HTML spec — extracted values

Source of truth for this document: `stitch_adelaide_tyres_design_system\adelaide_wholesale_tyres_homepage\code.html` (987 lines), read in full. All values below are copied directly from the embedded Tailwind config (`tailwind.config` script block) and the authored markup/classes — not inferred from the screenshot.

Business data appearing in the HTML (address, phone, ABN, hours, stock counts, brand names, turnaround claims) is Stitch demo content and is **excluded** from this spec — see "Excluded fabricated content" at the end. Only layout/visual values are extracted here.

## Global

| Token | Value |
|---|---|
| Container max width | `max-w-container-max` = 80rem = **1280px** |
| Gutters (`gutter-lg`) | **24px**, used as horizontal container padding at all sections |
| Font — display/headline family | `Barlow Condensed` (600/700/800/900) |
| Font — body family | `Barlow` (400/500/600/700, italic 400) |
| `display-hero` | 84px / line-height 0.96 / letter-spacing -0.01em / weight 800 |
| `display-hero-mobile` | 48px / line-height 1.0 / letter-spacing -0.01em / weight 800 |
| `display-title` | 44px / line-height 0.98 / weight 800 |
| `display-title-mobile` | 32px / line-height 1.02 / weight 800 |
| `headline-lg` | 28px / line-height 1.05 / weight 800 |
| `headline-md` | 22px / line-height 1.15 / weight 700 |
| `body-lead` | 18px / line-height 1.6 / weight 400 |
| `body-base` | 16px / line-height 1.5 / weight 400 |
| `body-sm` | 14px / line-height 1.45 / weight 400 |
| `eyebrow-caps` | 12px / line-height 1.3 / letter-spacing 0.14em / weight 700 |
| `label-caps` | 11px / line-height 1.2 / letter-spacing 0.10em / weight 700 |
| `button-text` | 14px / line-height 1.4 / letter-spacing 0.06em / weight 700 |
| `price-md` | 22px / weight 800 |
| `price-lg` | 32px / weight 800 |
| Border radius — default | 2px (`rounded`) |
| Border radius — lg | 4px |
| Border radius — xl | 8px |
| Border radius — full | 12px (`rounded-full` on pills, but circular pills still render fully round via `9999px` utility, not this token) |
| Unconfigured `2xl` (Tailwind default) | 16px — used for cards/panels (`rounded-2xl`) |
| Spacing — `unit-2xl` | 48px (section vertical padding, "compact" sections) |
| Spacing — `unit-3xl` | 72px (section vertical padding, commercial/delivery) |
| Spacing — `unit-4xl` | 96px (hero desktop vertical padding) |
| Spacing — `unit-xl` | 32px (grid gaps) |

### Colour palette (hex, from embedded config)

| Token | Hex |
|---|---|
| primary / primary-container split | `#002419` primary text ink, `#063B2C` primary-container (brand green) |
| green-dark | `#052A20` |
| green-deep | `#04211A` |
| gunmetal | `#2C3233` |
| accent-mint | `#7FD1B3` |
| action-red-deep | `#B60C11` |
| action-red-hover | `#D40F14` |
| surface / background | `#F6FAFA` |
| surface-muted | `#F5F6F3` |
| surface-card / surface-container-lowest | `#FFFFFF` |
| border-subtle | `#D6DAD7` |
| border-strong | `#C2C8C3` |
| border-field | `#C4CEC8` |
| text-muted | `#68716D` |
| text-inverse | `#FFFFFF` |
| on-surface | `#171C1C` |

Our production tokens (`app/globals.css` `:root`) already match these 1:1 for every value that has a real analogue: `--color-green: #063b2c`, `--color-green-dark: #052a20`, `--color-green-deep: #04211a`, `--color-gunmetal: #2c3233`, mint `#7fd1b3` (used inline), `--color-surface-muted: #f5f6f3`, `--color-border: #d6dad7`, `--color-border-strong: #c2c8c3`, `--color-field-border: #c4cec8`, `--color-text-muted: #68716d`. The one deliberate divergence is the action-red: Stitch's demo red (`#B60C11`/`#D40F14`) is kept as `--color-red-deep`/`--color-red-hover`, but the *primary* brand red button colour stays the site's already-approved `--color-red: #df1015` rather than switching the whole brand's red identity to Stitch's placeholder value.

## Header

| Element | Value |
|---|---|
| Ticker row | `py-2` (8px top/bottom) around 14px text ≈ **36px** total; gunmetal background, 1px bottom border |
| Main nav height | `h-20` = **80px** |
| Header total (pre-sticky) | ~36px + 80px = **116px** |
| Inner container | 1280px max, 24px gutters (`px-gutter-lg`) |
| Logo | monogram (skewed "A", red "W", "T") + vertical divider + two-line wordmark, `gap-3` |
| Search bar | `hidden lg:flex flex-1 max-w-md` (max 28rem/448px), icon-prefixed input |
| Desktop nav | `hidden xl:flex gap-6`, active link gets 2px bottom border in action-red |
| Trailing actions | depot-pickup text block (`hidden md:flex`), call button (`hidden sm:inline-flex`), account icon button, cart icon button with red count badge |

## Hero

| Element | Value |
|---|---|
| Vertical padding | 96px desktop (`md:py-unit-4xl`), 48px mobile (`py-unit-2xl`) |
| Background | `bg-green-dark` (#052A20), border-bottom 1px `primary-container`, radial-dot texture at 10% opacity/24px grid, right-side deep-green gradient overlay |
| Grid | 12 columns, `gap-unit-xl` = 32px |
| Copy column | `lg:col-span-7` |
| Media column | `lg:col-span-5` |
| Eyebrow badge | pill, 12px/12px×4px padding, mint text on translucent green/mint-bordered pill, 16px bottom margin |
| H1 | 84px desktop / 48px mobile, line-height 0.96/1.0, uppercase, weight 800, "Wholesale tyres." line break then mint "Ready for your next order." |
| Body | 18px/1.6, `max-w-xl` (576px), 32px bottom margin |
| CTAs | primary 32px×16px padding, secondary (gunmetal) 24px×16px padding, both `rounded-xl` (8px per embedded config), 16px gap, uppercase 14px bold |
| Trust badges row | 3 columns desktop / 2 (with 3rd spanning 2) mobile, 16px gap, 40px top margin + 24px top padding + 1px divider; each item = icon + 2-line stat (value 22px display / label 11px uppercase) |
| Media bay | rounded-2xl (16px), gunmetal→green-deep gradient, translucent border, 24px padding, top-left badge pill, 4:3 image stage with 24px top padding, footer (name/pattern left, price right) with 16px top margin/padding + divider |

## Finder

| Element | Value |
|---|---|
| Position | `relative -mt-8` (**-32px** overlap onto hero), z-30, inside the 1280px/24px-gutter container |
| Panel | white, `rounded-2xl` (16px), 1px border-strong, `shadow-xl`, padding 24px (32px at `lg`) |
| Category tabs | horizontal scroll row, 8px gap, 16px bottom padding + 24px bottom margin below; active pill dark-filled, inactive muted-filled, both ~20px×10px padding, 14px bold, 8px radius |
| Form | 5 equal columns at `lg`, 2 at `sm`, 1 below; 16px gap; fields/button **48px height**, 8px radius |
| Field labels | 11px/1.2/0.10em uppercase, 6px bottom margin |
| Popular-size row | 16px top margin/padding + divider, 8px gaps, compact bordered chips |

Stitch's demo fields are non-functional Width/Profile/Rim/Axle dropdowns with fabricated option lists — these are **not** reproduced as literal filters (the catalogue has no width/profile/rim/axle-position parsing). The 5-slot visual geometry is instead filled with the real, already-wired filters: free-text search, tyre size, application, availability, submit — see "Design elements intentionally not reproduced" below.

## Benefits

| Element | Value |
|---|---|
| Section padding | 48px vertical (`py-unit-2xl`) |
| Heading block | centred, `max-w-2xl` (672px), 40px bottom margin to grid |
| Grid | 4 equal columns `lg`, 2 `md`, 1 below; **24px gap** |
| Card | white, 1px border, **4px coloured top border**, `rounded-xl` (8px in embedded config — production uses 8px), 24px padding |
| Icon tile | 48px square, 4px/8px radius, muted background |
| Card title | 22px (`headline-md`) |
| Card body | 14px/1.45, muted |
| Delivery meter widget | 32px top margin, 20px padding (24px at `md`), `rounded-2xl` (16px), horizontal layout at `md`, progress bar 384px wide (`md:w-96`) |

## Stock

| Element | Value |
|---|---|
| Section padding | 48px vertical, 1px top border |
| Heading row | eyebrow + `headline-lg` (28px), 32px bottom margin to grid; category pills row alongside (Stitch) |
| Grid | 4 equal columns `lg`, 2 `sm`, 1 below; **24px gap** |
| Card | white, `rounded-2xl` (16px), 1px border |
| Media | dark gradient background, **16:10 aspect ratio**, 16px padding, image ~75% of media box |
| Card badges | in-stock pill top-left, secondary spec text top-right |
| Body padding | 20px (`p-5`) |
| Title | `headline-md` 22px |
| Price | `price-md` 22px |
| Quantity/action row | 40px height controls |
| Section CTA | 48px top margin, 32px×16px button padding, 8px radius |

## Commercial

| Element | Value |
|---|---|
| Section | dark green background, **72px vertical padding** (`py-unit-3xl`) |
| Grid | 12 columns, **7/5 split**, 32px gap |
| Left column | eyebrow, `headline-lg`/`display-title-mobile`, body paragraph, 3 equal capability cards (`sm:grid-cols-3`, 16px gap, each card 16px padding, `rounded-xl`), CTA row |
| Right column | white quote card, `rounded-2xl` (16px), 24px padding (32px at `md`), heading + copy + form fields (44px height inputs) + submit button |

## Delivery / warehouse

| Element | Value |
|---|---|
| Section | muted light background, **72px vertical padding** |
| Grid | 12 columns, **5/7 split**, 32px gap, both panels stretch equally (`items-stretch`) |
| Info card (5-col) | white, `rounded-2xl` (16px), 24px padding (32px at `md`), address/hours/collection facts list, hotline box |
| Map/graphic card (7-col) | white, `rounded-2xl` (16px), header bar + map area (`min-h-[340px]`) + hub badge overlay + 4-cell service-corridor badge row |

## Final CTA

| Element | Value |
|---|---|
| Section | gunmetal background, **48px vertical padding** |
| Layout | row at `md` (stacked below), 24px gap, copy left / action buttons right |
| Buttons | 3 actions: primary red, secondary green-container, tertiary outline/phone |

## Footer

| Element | Value |
|---|---|
| Background | dark green |
| Grid | 4 equal columns at `md`, **24px gaps**, 1280px/24px-gutter container |
| Vertical padding | 48px |
| Legal row | 16px vertical padding, 1px top divider |

## Breakpoints

`sm` 640px · `md` 768px · `lg` 1024px · `xl` 1280px (Tailwind defaults, unmodified in the embedded config).

## Excluded fabricated content (Stitch demo data — not carried into production)

The following appear in `code.html` as placeholder content and are **not** used as real facts anywhere in the app. Real values come from `lib/config.ts` (business/order/delivery config) and `lib/catalogue.ts` (products, stock, pricing):

- Address `6 Birralee Rd` → real address is `4 Birralee Rd, Regency Park SA 5010, Australia` (`business.address`)
- Phone `(08) 8240 0000`, ABN `84 621 893 214`
- Trading hours `Mon-Fri 7:00am - 5:00pm`, Saturday-by-appointment, dock turnaround/loading-time claims
- Stock/catalogue counts `1,480+`, per-card unit counts (`48 units`, `64 units`, `82 units`, `36 units`)
- Demo brands/patterns: Bridgestone R168, Kumho KMD01, Maxxis Razr AT771, Goodyear Cargo G26 — replaced with real `lib/catalogue.ts` SKUs, brands, sizes, prices and images
- B2B claims: Net 30 terms, "Scheduled Runs" corridor guarantees, "Priority Docks", 12-minute/60-minute turnaround, same-day/next-day delivery guarantees, 2-business-hour quote verification
- `IMMEDIATE REGENCY PARK DISPATCH` dispatch-time claim on the hero product badge — replaced with the neutral, verifiable `Regency Park warehouse` label already in use
- Width/Profile/Rim/Axle finder dropdowns with fabricated option values — the catalogue has no such parsed dimensions, so the finder keeps its real, working filters (search, size, application, availability) in the same 5-slot visual geometry instead
