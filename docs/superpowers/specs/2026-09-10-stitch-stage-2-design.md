# Adelaide Wholesale Tyres — Stitch Stage 2 Design

## Status

Approved approach: progressive page integration.

Stage 2 covers the core storefront only:

1. Homepage (`/`)
2. Catalogue (`/tyres`)
3. Product detail (`/tyres/[slug]`)
4. Desktop and mobile states for the three surfaces above

Checkout, order confirmation, commercial credit, legal, delivery, contact and other supporting-page redesigns are explicitly outside this stage.

## Goal

Translate the approved Stitch visual system into the existing production Next.js storefront while preserving all verified catalogue data, pricing, stock, delivery rules, cart behaviour, order logic, payment behaviour, SEO structure and accessibility requirements.

The central rule is:

> Stitch controls visual treatment and layout. The repository controls facts and behaviour.

## Source hierarchy

When sources conflict, use this order:

1. Existing repository logic and verified business configuration
2. Verified catalogue and image-provenance documentation
3. Owner-approved project instructions and supplied assets
4. Stitch layout, composition, spacing, typography and visual treatment
5. Stitch demo copy/data only when independently supported by sources 1–3

Stitch must never override real product data or operational rules merely to improve screenshot fidelity.

## Existing Stage 1 baseline

Stage 1 already shipped:

- dark product-media plates on catalogue/related-product cards
- one stock badge instead of duplicated badges
- the homepage `CommercialTeaser`

Stage 2 must preserve those changes and extend the same visual language across the full homepage, catalogue and product-detail experience. It must not revert the card treatment or reintroduce duplicate badges.

## Non-negotiable business rules

Preserve the current configured rules exactly unless the owner separately changes configuration:

- No minimum order
- $50 Adelaide-wide delivery for total orders of 1–7 tyres
- Free Adelaide-wide delivery for total orders of 8+ tyres
- Warehouse pickup is free
- Warehouse: 4 Birralee Rd, Regency Park SA 5010
- Product price, stock and identity come from `lib/catalogue.ts`
- Contact actions only render when real environment-backed contact details are configured

Do not hardcode replacement values into visual components.

## Fabricated Stitch content that must be rejected

The following material appears in Stitch prototypes but is not approved as live business data in this stage:

- `08 8240 0000`
- invented sales, dispatch, accounts, privacy, compliance or credit email addresses
- Bridgestone, Michelin, Kumho, Maxxis and Goodyear demo catalogue products not present in `lib/catalogue.ts`
- “SA's largest” or equivalent market-leading inventory claims
- daily metro/regional freight-run promises
- specific freight corridors, freight hubs or dispatch schedules not represented in verified configuration
- invented warehouse/depot capacity or capability specifications
- fitting/service promises absent from the live business model
- invented reviews, ratings, certifications, awards, trading history or guarantees
- 30-day credit account terms or credit-approval workflows

If a Stitch layout depends on such copy, preserve the layout but replace the content with verified equivalent information or remove the unsupported element.

## Visual system

### Palette

Use the existing token system as the implementation foundation, preserving these core values:

- Primary green: `#063B2C`
- Dark green: `#052A20`
- Deep green: `#04211A`
- Ink: `#090C0C`
- Gunmetal: `#2C3233`
- Muted surface: `#F5F6F3`
- White/card: `#FFFFFF`
- Transactional red: `#DF1015`
- Mint accent: `#7FD1B3`

Red is a conversion/status accent, not a large-area background colour.

### Typography

- Barlow Condensed: display headings, high-impact product sizing, prices where appropriate
- Barlow: body, controls, navigation, labels and metadata

Keep the industrial precision of Stitch without sacrificing readability. Buttons and form controls must have deliberate typography rather than browser-default inherited styling.

### Shape and elevation

- Controls: approximately 10px radius
- Cards/panels: approximately 14–20px radius
- Pills: full radius, only for status/spec metadata
- Prefer borders, tonal zoning and restrained shadows over floating/glassy effects

### Motion

Motion must be restrained and functional. Respect `prefers-reduced-motion`. Do not add motion that delays product discovery, filtering or purchase actions.

## Homepage design

### Header and announcement

Preserve existing real navigation destinations and cart access. Keep the announcement area useful and concise, using configured order/delivery rules. Real phone/email actions must remain environment-backed.

### Hero

Adopt the Stitch first-viewport composition: strong dark-green industrial environment, large display headline, concise supporting copy, two clear actions and a product-led media zone.

Preferred H1:

**Wholesale tyres. Ready for your next order.**

Primary CTA: `/tyres`

Secondary CTA: the existing real quote/contact flow.

Hero media must use a real approved catalogue asset or existing approved product-image treatment. Do not substitute a visually similar tyre for screenshot fidelity.

The hero should communicate wholesale tyre supply immediately and remain readable on small laptop and mobile viewports. Avoid extra pills, fake stats or unsupported operational claims above the fold.

### Benefits / order rules

Present the verified purchase/delivery rules in a compact, high-confidence section. The section can adopt Stitch visual framing but must derive values from central config rather than repeat hardcoded numbers across components.

### Stock preview

Use real catalogue entries only. Preserve product links, prices, stock, quantities and cart integration. Continue the Stage-1 dark media plate and single stock badge.

The preview should feel editorial and premium but not become an isolated static mockup. All buttons and quantity controls must remain functional.

### Commercial teaser

Keep the Stage-1 `CommercialTeaser` unless visual harmonisation is required. Its content remains limited to verified commercial/fleet positioning already supported by the site. Do not introduce a duplicate enquiry form on the homepage.

### Final conversion / delivery transition

Use a strong dark/light contrast transition into the existing free-delivery CTA or equivalent verified conversion block. Preserve actual order rules and links.

## Catalogue design

### Desktop layout

Use a Stitch-style commerce workspace with:

- approximately 280px filter rail
- search/filter controls grouped logically
- responsive product grid in remaining space
- visible result count
- clear reset action
- stable product-card dimensions

Do not convert existing filter behaviour into a purely decorative sidebar.

### Mobile layout

Use a single-column commerce flow with:

- visible search
- compact filter trigger
- accessible filter drawer/sheet or equivalent existing responsive pattern
- 44px minimum practical touch targets for interactive controls
- no horizontal overflow
- no clipped product metadata or buttons

### Behaviour preservation

Keep all existing behaviour:

- search by supported fields
- brand filter
- size filter
- application filter
- in-stock filter
- URL/filter serialisation and restoration
- reset
- accurate result count
- quantity selector
- stock-ceiling enforcement
- add-to-cart
- existing local cart persistence/synchronisation

Visual refactoring may change component markup, but filtering and cart semantics must remain behaviourally compatible.

### Product cards

Use the Stage-1 card treatment as the canonical visual family:

- dark media plate
- exact approved product image or neutral placeholder
- one stock badge
- brand
- size
- pattern
- wholesale price
- quantity control
- clear add-to-cart action

Do not invent specifications simply to fill card space.

## Product detail design

### Desktop composition

Use the Stitch product-detail hierarchy:

- large product media zone
- clear brand/pattern/size identity
- visible stock status
- strong price treatment
- quantity selector
- primary add-to-cart action
- delivery/pickup qualification information
- verified specification block
- related products

The layout should feel more technical and premium than the catalogue card while using the same visual system.

### Mobile composition

Prioritise, in order:

1. product identity
2. product media
3. price and stock
4. quantity and add-to-cart
5. delivery information
6. verified specifications
7. related products

Avoid sticky UI that covers important content unless the current interaction pattern supports it cleanly.

### Verified data only

Product detail may show `position`, `loadIndex`, `speedRating` and `construction` only when those values exist in the actual `Tyre` record or another already-approved repository source.

Do not infer missing specifications from tyre size, brand, tread appearance or Stitch demo content.

### Related products

Continue using real catalogue data and current related-product logic. Do not inject demo brands from Stitch.

## Product imagery

Image provenance rules remain active.

- exact verified manufacturer asset: may render according to current repository policy
- owner-approved AI render: may render according to current repository policy and must not be described as genuine manufacturer photography
- unresolved SKU: use the neutral placeholder

Do not replace missing photography with a different tyre model.

## Architecture and component boundaries

Stage 2 should extend the current component system rather than build a second parallel frontend.

Expected areas of change may include:

- `app/page.tsx`
- `app/tyres/page.tsx`
- `app/tyres/[slug]/page.tsx`
- `components/Hero.tsx`
- `components/HeroArtwork.tsx`
- `components/Benefits.tsx`
- `components/ProductCard.tsx`
- `components/CatalogueBrowser.tsx`
- product-detail-specific components already used by the route
- shared primitives
- `app/globals.css`

New components are acceptable when they own one clear visual/interaction responsibility. Do not create a monolithic homepage or catalogue component.

`lib/catalogue.ts`, cart helpers, checkout/order code and payment infrastructure remain data/behaviour boundaries and should not be restructured for visual convenience.

## Data flow

### Homepage

Server-rendered page reads catalogue/config data through existing helpers and passes only the data required by client components. Avoid converting the entire page to a client component.

### Catalogue

Existing catalogue data is passed into the browser/filter experience. URL state remains the external representation of filter state. Cart mutations continue through the existing cart context/helpers.

### Product detail

The route resolves the product through existing catalogue helpers. Purchasing actions use existing quantity/cart interfaces. SEO/Product JSON-LD must continue to use verified product data.

## Error and empty states

Stage 2 must preserve or improve:

- catalogue no-results state
- missing/unresolved product route handling
- sold-out state
- quantity-at-stock-limit state
- absent contact details
- unavailable product image fallback

Visual polish must not hide disabled states or make unavailable actions look active.

## SEO and accessibility

Preserve existing metadata, canonical routes, JSON-LD, sitemap and robots architecture.

Requirements:

- one clear H1 per page
- meaningful heading hierarchy
- descriptive image alt text based on actual product identity
- labelled form/filter controls
- keyboard-accessible filtering and purchasing
- visible focus states on dark and light surfaces
- colour contrast suitable for normal text and controls
- responsive zoom/text behaviour without clipping

No new fake ratings/reviews should be added to structured data or visible UI.

## Performance

Keep the redesign compatible with Next.js server rendering and image optimisation.

- Do not move static/server content into client components without need
- Avoid heavy animation libraries for simple reveal/hover behaviour
- Keep image sizing explicit and stable to prevent layout shift
- Avoid unnecessary client-side data duplication
- Reuse existing design tokens/components where possible

## Testing and verification

Behaviour changes follow TDD. Pure visual refactors still require regression verification.

Before Stage 2 can be presented as complete, run:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Browser verification must cover at minimum:

- homepage desktop
- homepage mobile
- catalogue desktop filtering
- catalogue mobile filtering
- catalogue reset/filter URL restoration
- product detail desktop
- product detail mobile
- quantity changes
- add-to-cart from catalogue
- add-to-cart from product detail
- cart contents after each path
- sold-out / stock-limit behaviour where test data supports it
- no console errors
- no horizontal overflow

## Visual fidelity verification

Compare the implementation against the supplied Stitch screenshots for the corresponding surfaces.

Judge:

- hierarchy
- section order
- typography
- spacing
- colour values
- image framing
- filter density
- button/control treatment
- mobile composition
- card proportions

Unsupported Stitch copy/data is an intentional deviation and should be documented rather than copied for pixel matching.

## Stage 2 completion gate

Before merge/push, provide:

1. files changed
2. test/typecheck/lint/build/e2e results
3. desktop/mobile visual comparison evidence
4. list of deliberate deviations from Stitch and their source-of-truth reason
5. confirmation that commerce logic was preserved
6. owner approval before merging or pushing to production

No automatic merge to `master` and no automatic production push are part of this stage.
