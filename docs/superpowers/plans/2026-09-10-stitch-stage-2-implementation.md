# Stitch Stage 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Stitch visual system to the Adelaide Wholesale Tyres homepage, catalogue, and product-detail experience on desktop and mobile without changing verified commerce behaviour or business facts.

**Architecture:** Keep the existing Next.js App Router/server-component structure and existing data boundaries. Visual work stays in page/components/CSS; catalogue filtering continues to use `lib/filter.ts`, products continue to come from `lib/catalogue.ts`, and cart/order/payment boundaries are not redesigned in Stage 2. Add focused Playwright coverage for the new visible structure and responsive catalogue controls, then verify the existing regression suite unchanged.

**Tech Stack:** Node.js 22.x, Next.js 16.3.3 App Router, React 19.2.6, TypeScript 5.9.3, Tailwind CSS 4.2.1, Playwright 1.62.1.

**Spec:** `docs/superpowers/specs/2026-09-10-stitch-stage-2-design.md`

## Global Constraints

- Work only on `redesign/stitch-stage-2`; do not merge or push to `master` without owner approval.
- Read `AGENTS.md` before implementation and follow its Next.js 16.3.3 documentation requirement.
- Stitch controls layout and visual treatment; repository code/config/catalogue controls facts and behaviour.
- Preserve: no minimum order; $50 Adelaide-wide delivery for 1–7 tyres; free Adelaide-wide delivery for 8+ tyres; free warehouse pickup; `6 Birralee Rd, Regency Park SA 5010`.
- Products, prices, stock, application, optional technical fields and image paths remain sourced from `lib/catalogue.ts`.
- Public phone/email affordances remain environment-backed; never hardcode demo contact details from Stitch.
- Do not introduce Stitch demo products or unsupported claims, freight schedules, awards, ratings, fitting claims, or 30-day credit workflows.
- Do not restructure `lib/cart.ts`, `lib/cart-context.tsx`, order persistence, checkout validation, payment code, or webhooks for visual convenience.
- Do not add a new animation/UI framework; use the existing CSS/Tailwind system.
- Preserve the Stage-1 product-card media plate and single stock badge.
- Keep server-rendered content server-rendered; only interaction components remain client components.
- Behaviour changes require a failing test first. Pure CSS/layout edits must still run relevant Playwright regressions.
- Use these supplied Stitch references: `adelaide_wholesale_tyres_homepage`, `adelaide_wholesale_tyres_catalogue`, `adelaide_wholesale_tyres_mobile_catalogue`, `adelaide_wholesale_tyres_product_detail_page`, and `adelaide_wholesale_tyres_mobile_product_detail_page`.

## Execution preflight

- [ ] **Step 1: Enter an isolated local worktree for the existing Stage 2 branch**

```powershell
git fetch origin
git worktree add .worktrees\stitch-stage-2 redesign/stitch-stage-2
Set-Location .worktrees\stitch-stage-2
```

If that branch is already checked out in an isolated worktree, use the existing worktree instead of creating another.

- [ ] **Step 2: Install locked dependencies**

```powershell
npm install
```

- [ ] **Step 3: Confirm the baseline before production edits**

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Expected: all commands exit `0`. If a baseline command fails, stop and report the failure before changing Stage 2 code.

---

### Task 1: Homepage Stitch integration

**Files:**
- Modify: `components/Hero.tsx`
- Modify: `components/HeroArtwork.tsx`
- Modify: `components/Benefits.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Create/modify: `tests/e2e/stitch-stage-2.spec.ts`

**Interfaces:**
- Consumes: `business`, `order`, `catalogueStats`, `formatCurrency`, `ProductCard`, `CommercialTeaser`, `FreeDeliveryCTA`.
- Produces: a server-rendered homepage whose H1 is `Wholesale tyres. Ready for your next order.`, whose delivery copy is configuration-derived, and whose existing product/cart interactions remain unchanged.

- [ ] **Step 1: Write the failing homepage acceptance test**

Create `tests/e2e/stitch-stage-2.spec.ts` with:

```ts
import { expect, test } from "@playwright/test";

const fabricated = /08 8240 0000|Bridgestone R168|Michelin X Multi|Kumho Heavy Duty|SA'?s largest/i;

test("Stage 2 homepage uses the approved Stitch hierarchy with verified content", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Wholesale tyres. Ready for your next order.",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: "Shop available stock" }).first(),
  ).toHaveAttribute("href", "/tyres");

  await expect(
    page.getByRole("link", { name: "Get a wholesale quote" }).first(),
  ).toHaveAttribute("href", "/contact?type=quote");

  await expect(page.locator("body")).toContainText("No minimum order");
  await expect(page.locator("body")).toContainText("$50");
  await expect(page.locator("body")).toContainText("Free Adelaide-wide delivery");
  await expect(page.locator("body")).not.toContainText(fabricated);
});
```

- [ ] **Step 2: Run the homepage test and confirm the expected red state**

```powershell
npx playwright test tests/e2e/stitch-stage-2.spec.ts --project=desktop --grep "Stage 2 homepage"
```

Expected: FAIL because the current H1 is `Buy tyres in bulk. Pay wholesale.` rather than the approved Stage 2 H1.

- [ ] **Step 3: Update `components/Hero.tsx` to the approved content hierarchy**

Change imports to include configured order values and formatter:

```ts
import { business, order } from "@/lib/config";
import { catalogueStats } from "@/lib/catalogue";
import { formatCurrency } from "@/lib/format";
```

Replace the hero eyebrow/title/copy with:

```tsx
<p className="hero__kicker">Adelaide Wholesale Tyres</p>

<h1 className="hero__title display">
  Wholesale tyres.
  <br />
  <span>Ready for your next order.</span>
</h1>

<p className="hero__copy">
  No minimum order. {formatCurrency(order.delivery.feeAud)} Adelaide-wide delivery
  for 1–{order.delivery.freeQualifyingTyres - 1} tyres. Free Adelaide-wide delivery
  from {order.delivery.freeQualifyingTyres} tyres. Commercial and truck tyres for
  Adelaide workshops, fleets and transport operators.
</p>
```

Keep these routes exactly:

```tsx
<Link href="/tyres" className="btn btn--red">
  Shop available stock
</Link>
<Link href="/contact?type=quote" className="btn btn--outline-light">
  Get a wholesale quote
</Link>
```

Keep `business.address.oneLine` in the location/meta line. Do not add a phone number.

- [ ] **Step 4: Make `Benefits.tsx` derive numeric delivery copy from config**

Use:

```ts
import { order } from "@/lib/config";
import { formatCurrency } from "@/lib/format";
```

Build the cards from config:

```ts
const benefits = [
  { title: "No minimum order", copy: "Order from one tyre up" },
  {
    title: `${order.delivery.freeQualifyingTyres}+ tyres`,
    copy: "Free Adelaide-wide delivery",
    detail: `1–${order.delivery.freeQualifyingTyres - 1} tyres · ${formatCurrency(order.delivery.feeAud)} delivery`,
    highlight: true,
  },
  { title: "Listed stock", copy: "Browse current Adelaide inventory online" },
  { title: "Trade supply", copy: "Truck, commercial and fleet tyre supply" },
] as const;
```

Retain `Reveal` and semantic headings.

- [ ] **Step 5: Apply the Stitch homepage visual treatment without adding new client state**

In `app/globals.css`, keep the current tokens and add/adjust these Stage 2 rules:

```css
.hero__kicker {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #bfe8d8;
}

.hero__title {
  margin-top: 18px;
  max-width: 760px;
  font-size: clamp(48px, 6.8vw, 84px);
  line-height: 0.96;
}

.hero__title span {
  color: #7fd1b3;
}

.hero__copy {
  margin-top: 20px;
  max-width: 620px;
  font-size: clamp(16px, 1.4vw, 18px);
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.82);
}

@media (max-width: 639px) {
  .hero__title {
    font-size: clamp(44px, 14vw, 56px);
    line-height: 0.98;
  }
}
```

Keep green/charcoal/red as the primary visual system. Do not add a decorative pill above the H1.

- [ ] **Step 6: Refine `HeroArtwork.tsx` only as a visual asset container**

Keep this exact image path:

```tsx
src="/images/tyres/ralson-rmr61-295-80r22-5.webp"
```

Keep the verified alt text, `next/image`, explicit `sizes`, and live `units`/`skuLines`. Adjust framing/classes to match the Stitch industrial product bay; do not replace the tyre with a demo brand.

- [ ] **Step 7: Preserve homepage data flow in `app/page.tsx`**

Keep the page as a server component and retain:

```tsx
<Hero />
<Benefits />
// stock preview still resolves through getTyreBySlug(...)
<CommercialTeaser />
<FreeDeliveryCTA />
```

Visual spacing and headings may change, but the preview must continue resolving real catalogue slugs through `getTyreBySlug`.

- [ ] **Step 8: Run homepage regressions**

```powershell
npm run build
npx playwright test tests/e2e/stitch-stage-2.spec.ts tests/e2e/smoke.spec.ts --project=desktop --grep "homepage|Stage 2 homepage"
npx playwright test tests/e2e/production-polish.spec.ts --project=desktop --grep "reduced motion|without JavaScript|revealed stock"
```

Expected: PASS.

- [ ] **Step 9: Commit the homepage slice**

```powershell
git add components/Hero.tsx components/HeroArtwork.tsx components/Benefits.tsx app/page.tsx app/globals.css tests/e2e/stitch-stage-2.spec.ts
git commit -m "feat: apply Stitch Stage 2 homepage design"
```

---

### Task 2: Catalogue desktop workspace and mobile filter sheet

**Files:**
- Modify: `app/tyres/page.tsx`
- Modify: `components/CatalogueBrowser.tsx`
- Modify: `app/globals.css`
- Modify: `tests/e2e/stitch-stage-2.spec.ts`
- Regression only: `lib/filter.ts`
- Regression only: `components/ProductCard.tsx`

**Interfaces:**
- Consumes: `Tyre[]`, `TyreFilters`, `filtersFromParams()`, `paramsFromFilters()`, `filterTyres()`, `activeFilterCount()`, `ProductCard`.
- Produces: a 280px desktop filter rail and accessible mobile filter sheet while preserving URL-driven filter state and existing ProductCard/cart behaviour.

- [ ] **Step 1: Add failing catalogue tests before changing the component**

Append:

```ts
test("Stage 2 catalogue exposes a desktop filter rail and preserves URL filter state", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/tyres?brand=Ralson&stock=in");

  const rail = page.getByRole("complementary", { name: "Tyre filters" });
  await expect(rail).toBeVisible();
  await expect(rail.getByRole("combobox", { name: "Brand" })).toHaveValue("Ralson");
  await expect(rail.getByRole("checkbox", { name: "In stock only" })).toBeChecked();
  await expect(page.getByRole("article").first()).toContainText("Ralson");
});

test("Stage 2 mobile catalogue opens filters without losing URL state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tyres");

  await page.getByRole("button", { name: /^Filters/ }).click();
  const dialog = page.getByRole("dialog", { name: "Tyre filters" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("combobox", { name: "Brand" }).selectOption("Ralson");
  await expect(page).toHaveURL(/brand=Ralson/);

  await dialog.getByRole("button", { name: "Close filters" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("article").first()).toContainText("Ralson");
});
```

- [ ] **Step 2: Run the catalogue tests and confirm the expected red state**

```powershell
npx playwright test tests/e2e/stitch-stage-2.spec.ts --project=desktop --grep "Stage 2 catalogue"
```

Expected: FAIL because the current `CatalogueBrowser` has one top filter card and no filter `aside` or mobile dialog.

- [ ] **Step 3: Keep URL/filter ownership in `CatalogueBrowser` and add only mobile-sheet UI state**

Change:

```ts
import { useCallback, useMemo, useState } from "react";
```

Inside `CatalogueBrowser` add:

```ts
const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
```

Do not duplicate `TyreFilters` into local state; `filters` remains derived from `searchParams`.

- [ ] **Step 4: Extract current controls into a local `FilterControls` function**

Add inside `components/CatalogueBrowser.tsx`:

```ts
type FilterControlsProps = {
  filters: TyreFilters;
  sizes: string[];
  brands: string[];
  applications: string[];
  onPatch: (partial: Partial<TyreFilters>) => void;
  onClear: () => void;
};
```

Implement `FilterControls` by moving the existing search, Size, Brand, Application, In-stock and Sort controls into that function. Keep these accessible names exactly: `Search tyres`, `Size`, `Brand`, `Application`, `In stock only`, `Sort results`.

Use the existing `APPLICATION_LABELS`; do not rename serialized values.

- [ ] **Step 5: Create one reusable clear callback**

Use:

```ts
const clearFilters = useCallback(() => {
  setFilters({
    query: "",
    size: null,
    brand: null,
    application: null,
    inStockOnly: false,
    sort: filters.sort,
  });
}, [filters.sort, setFilters]);
```

This preserves the current sort while clearing active filters.

- [ ] **Step 6: Replace the top filter card with desktop rail + results column**

Use this structure:

```tsx
<div className="catalogue-shell">
  <aside aria-label="Tyre filters" className="catalogue-filter-rail surface-card">
    <FilterControls
      filters={filters}
      sizes={sizes}
      brands={brands}
      applications={applications}
      onPatch={patch}
      onClear={clearFilters}
    />
  </aside>

  <section aria-label="Tyre catalogue results" className="min-w-0">
    {/* mobile trigger, result count, clear action, cards/no-results */}
  </section>
</div>
```

Keep the existing `results`, active-filter count, no-results state, sort behaviour and ProductCard mapping.

- [ ] **Step 7: Add the mobile trigger and filter sheet**

Use:

```tsx
<button
  type="button"
  className="catalogue-filter-trigger btn btn--outline"
  aria-expanded={mobileFiltersOpen}
  onClick={() => setMobileFiltersOpen(true)}
>
  Filters{activeCount > 0 ? ` (${activeCount})` : ""}
</button>
```

When open, render:

```tsx
<div className="catalogue-filter-sheet lg:hidden">
  <button
    type="button"
    className="catalogue-filter-backdrop"
    aria-label="Close filters"
    onClick={() => setMobileFiltersOpen(false)}
  />
  <div role="dialog" aria-modal="true" aria-label="Tyre filters" className="catalogue-filter-dialog">
    <div className="flex items-center justify-between gap-4">
      <h2 className="display text-[28px]">Filters</h2>
      <button
        type="button"
        className="btn btn--outline min-h-[44px] px-4 py-2"
        onClick={() => setMobileFiltersOpen(false)}
      >
        Close filters
      </button>
    </div>
    <FilterControls
      filters={filters}
      sizes={sizes}
      brands={brands}
      applications={applications}
      onPatch={patch}
      onClear={clearFilters}
    />
  </div>
</div>
```

Do not alter URL serialization when the sheet opens/closes.

- [ ] **Step 8: Add catalogue layout CSS using existing tokens**

Add:

```css
.catalogue-shell {
  display: grid;
  gap: 24px;
}

.catalogue-filter-rail {
  display: none;
  align-self: start;
  padding: 20px;
}

.catalogue-filter-trigger {
  min-height: 44px;
}

.catalogue-filter-sheet {
  position: fixed;
  inset: 0;
  z-index: 70;
}

.catalogue-filter-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(9, 12, 12, 0.58);
}

.catalogue-filter-dialog {
  position: absolute;
  inset: auto 0 0;
  max-height: min(82vh, 720px);
  overflow-y: auto;
  border-radius: 20px 20px 0 0;
  background: var(--color-white);
  padding: 20px 16px max(20px, env(safe-area-inset-bottom));
  box-shadow: 0 -18px 44px rgba(9, 12, 12, 0.2);
}

@media (min-width: 1024px) {
  .catalogue-shell {
    grid-template-columns: 280px minmax(0, 1fr);
    gap: 28px;
  }

  .catalogue-filter-rail {
    display: block;
    position: sticky;
    top: 112px;
  }

  .catalogue-filter-trigger,
  .catalogue-filter-sheet {
    display: none;
  }
}
```

Keep the Stage-1 ProductCard structure and stock/cart logic unchanged.

- [ ] **Step 9: Update `app/tyres/page.tsx` only for page framing**

Keep metadata, JSON-LD and catalogue helper calls. Use:

```tsx
<h1 className="display text-[clamp(36px,5vw,56px)]">Wholesale tyre catalogue</h1>
<p className="mt-2 max-w-xl text-[var(--color-text-muted)]">
  Search current Adelaide stock by size, brand or pattern. No minimum order.
</p>
```

Do not add demo-brand copy or freight claims.

- [ ] **Step 10: Verify filtering, URL restoration and cart interaction**

```powershell
npm run build
npx playwright test tests/e2e/stitch-stage-2.spec.ts --grep "catalogue"
npx playwright test tests/e2e/smoke.spec.ts --grep "catalogue filters|cart has no minimum"
npx playwright test tests/e2e/production-polish.spec.ts --grep "required routes remain within|quantity is capped"
```

Expected: PASS on applicable desktop/mobile projects.

- [ ] **Step 11: Commit the catalogue slice**

```powershell
git add app/tyres/page.tsx components/CatalogueBrowser.tsx app/globals.css tests/e2e/stitch-stage-2.spec.ts
git commit -m "feat: add Stitch catalogue workspace and mobile filters"
```

---

### Task 3: Product-detail and purchase-panel Stitch integration

**Files:**
- Modify: `app/tyres/[slug]/page.tsx`
- Modify: `components/ProductPurchasePanel.tsx`
- Modify: `app/globals.css`
- Modify: `tests/e2e/stitch-stage-2.spec.ts`
- Reuse unchanged: `components/DeliveryStatus.tsx`
- Reuse unchanged: `components/QuantitySelector.tsx`
- Reuse unchanged: `lib/seo.ts`
- Reuse unchanged: `lib/catalogue.ts`

**Interfaces:**
- Consumes: `Tyre`, `tyreFullName()`, `APPLICATION_LABELS`, `ProductPurchasePanel`, `DeliveryStatus`, `QuantitySelector`, existing cart context.
- Produces: Stitch-style product media/purchase composition with a full verified product H1 and shared delivery-progress widget, without changing quantity/stock/cart rules.

- [ ] **Step 1: Add failing product-detail acceptance tests**

Append:

```ts
test("Stage 2 product detail leads with verified product identity and purchase controls", async ({ page }) => {
  await page.goto("/tyres/ralson-rmr61-295-80r22-5");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Ralson RMR61 295/80R22.5",
    }),
  ).toBeVisible();

  const panel = page.getByTestId("purchase-panel");
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole("spinbutton", {
      name: "Quantity for Ralson RMR61 295/80R22.5",
    }),
  ).toHaveValue("1");
  await expect(
    panel.getByRole("progressbar", {
      name: "Tyres towards free Adelaide-wide delivery",
    }),
  ).toBeVisible();
});

test("Stage 2 product detail does not fabricate optional tyre specifications", async ({ page }) => {
  await page.goto("/tyres/greforce-gr881w-11r22-5");

  const specs = page.getByRole("region", { name: "Tyre specifications" });
  await expect(specs).toBeVisible();
  await expect(specs.getByText("Load index", { exact: true })).toHaveCount(0);
  await expect(specs.getByText("Speed rating", { exact: true })).toHaveCount(0);
  await expect(specs.getByText("Construction", { exact: true })).toHaveCount(0);
});
```

- [ ] **Step 2: Run the product-detail tests and confirm the expected red state**

```powershell
npx playwright test tests/e2e/stitch-stage-2.spec.ts --project=desktop --grep "Stage 2 product detail"
```

Expected: FAIL because the current H1 is only the tyre size and the purchase panel does not render `DeliveryStatus`.

- [ ] **Step 3: Update the product-detail identity hierarchy**

In `app/tyres/[slug]/page.tsx`, keep metadata/JSON-LD code unchanged. Use:

```tsx
<p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-red)]">
  {tyre.brand}
</p>
<h1 className="display mt-1 text-[clamp(36px,5vw,56px)]">
  {tyreFullName(tyre)}
</h1>
<p className="mt-2 text-[15px] font-semibold text-[var(--color-text-muted)]">
  {APPLICATION_LABELS[tyre.application]}
</p>
```

Do not add inferred technical values.

- [ ] **Step 4: Turn the media card into the Stage 2 industrial product bay**

Keep the existing `TyreImage` source and alt. Use:

```tsx
<div className="product-detail-media surface-card">
  <TyreImage
    src={tyre.image}
    alt={`${tyreFullName(tyre)} commercial tyre`}
    size={460}
    priority
    sizes="(max-width: 639px) calc(100vw - 64px), (max-width: 1023px) 460px, 46vw"
    className="h-auto w-full max-w-[500px]"
  />
</div>
```

Add:

```css
.product-detail-media {
  display: grid;
  min-height: min(620px, 72vw);
  place-items: center;
  overflow: hidden;
  padding: clamp(24px, 5vw, 56px);
  background:
    radial-gradient(circle at 30% 20%, rgba(70, 155, 122, 0.18), transparent 45%),
    linear-gradient(160deg, #1b2321, #0a0d0d 72%);
}
```

Do not tint the tyre image itself.

- [ ] **Step 5: Give specifications an explicit accessible region and keep optional-field filtering**

Use:

```tsx
<section aria-label="Tyre specifications">
  <h2 className="display text-[24px]">Specifications</h2>
  <dl>{/* existing filtered specification rows */}</dl>
</section>
```

Retain:

```ts
specs.filter(([, value]) => value)
```

That filtering rule prevents empty/unverified technical fields from rendering.

- [ ] **Step 6: Reuse `DeliveryStatus` in `ProductPurchasePanel.tsx` instead of duplicated status copy**

Add:

```ts
import { DeliveryStatus } from "./DeliveryStatus";
```

Keep the static fulfilment tier table, quantity selector and add-to-cart actions. Replace the final conditional delivery-status block with:

```tsx
<div className="mt-4">
  <DeliveryStatus
    totalTyres={totalTyres}
    qualifiesForFreeDelivery={qualifiesForFreeDelivery}
    deliveryFee={deliveryFee}
  />
</div>
```

Do not change `addToCart()`, `remainingStock`, `selectedQty`, stock ceilings, or the cart line shape.

- [ ] **Step 7: Preserve the known mobile overflow fix while matching Stitch composition**

Keep a one-column mobile fallback and 400px desktop purchase column. The effective layout must remain equivalent to:

```css
.product-detail-layout {
  display: grid;
  gap: 32px;
}

@media (min-width: 1024px) {
  .product-detail-layout {
    grid-template-columns: minmax(0, 1fr) 400px;
    gap: 48px;
    align-items: start;
  }
}
```

If Tailwind grid classes remain in the page, retain `grid-cols-1` before the `lg:` columns.

- [ ] **Step 8: Run product/cart/structured-data regressions**

```powershell
npm run build
npx playwright test tests/e2e/stitch-stage-2.spec.ts --grep "product detail"
npx playwright test tests/e2e/smoke.spec.ts --grep "product detail|cart has no minimum"
npx playwright test tests/e2e/production-polish.spec.ts --grep "quantity is capped|Product structured data|required routes remain within"
```

Expected: PASS.

- [ ] **Step 9: Commit the product-detail slice**

```powershell
git add app/tyres/[slug]/page.tsx components/ProductPurchasePanel.tsx app/globals.css tests/e2e/stitch-stage-2.spec.ts
git commit -m "feat: apply Stitch Stage 2 product detail design"
```

---

### Task 4: Cross-page fidelity, responsive QA and release evidence

**Files:**
- Modify only if a regression is found: `app/globals.css`
- Modify only if an acceptance gap is found: `tests/e2e/stitch-stage-2.spec.ts`
- Create: `docs/stitch-stage-2-fidelity.md`

**Interfaces:**
- Consumes: implemented homepage/catalogue/product-detail screens and supplied Stitch screenshots.
- Produces: documented visual comparison evidence and a verified feature branch ready for owner review, not production deployment.

- [ ] **Step 1: Add final fabricated-content guards for all Stage 2 routes**

Append:

```ts
for (const route of [
  "/",
  "/tyres",
  "/tyres/ralson-rmr61-295-80r22-5",
]) {
  test(`Stage 2 keeps fabricated Stitch content off ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("body")).not.toContainText(
      /08 8240 0000|Bridgestone R168|Michelin X Multi|Kumho Heavy Duty|SA'?s largest/i,
    );
  });
}
```

- [ ] **Step 2: Run the complete quality gate**

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Expected: every command exits `0`. Do not claim Stage 2 complete if any command fails.

- [ ] **Step 3: Perform browser QA at required viewports**

Review:

```text
Desktop: 1440, 1280, 1024
Tablet: 768
Mobile: 430, 390, 375, 360, 320
```

On `/`, `/tyres`, and `/tyres/ralson-rmr61-295-80r22-5`, confirm no horizontal overflow, no introduced console errors, no clipped H1/CTA/product metadata, practical 44px+ mobile targets, functional filter sheet, correct URL filter state, usable cards at 320px, and working quantity/add-to-cart state.

- [ ] **Step 4: Compare rendered screens against supplied Stitch references**

Use:
- Homepage → `adelaide_wholesale_tyres_homepage/screen.png`
- Catalogue desktop → `adelaide_wholesale_tyres_catalogue/screen.png`
- Catalogue mobile → `adelaide_wholesale_tyres_mobile_catalogue/screen.png`
- Product desktop → `adelaide_wholesale_tyres_product_detail_page/screen.png`
- Product mobile → `adelaide_wholesale_tyres_mobile_product_detail_page/screen.png`

Compare headline hierarchy, palette, spacing, media framing, card proportions, desktop filter density, mobile filter composition, purchase hierarchy, control typography, and mobile stacking. Unsupported Stitch copy/data is an intentional deviation, not a fidelity defect.

- [ ] **Step 5: Write `docs/stitch-stage-2-fidelity.md` with actual results**

Use this structure and replace the command-result lines with the observed outcomes:

```md
# Stitch Stage 2 Fidelity Report

## Reference screens
- Homepage: adelaide_wholesale_tyres_homepage
- Catalogue desktop/mobile: adelaide_wholesale_tyres_catalogue / adelaide_wholesale_tyres_mobile_catalogue
- Product desktop/mobile: adelaide_wholesale_tyres_product_detail_page / adelaide_wholesale_tyres_mobile_product_detail_page

## Verified matches
- Hero hierarchy and palette
- Catalogue workspace/filter hierarchy
- Stage-1 product-card media treatment
- Product-detail media/purchase hierarchy
- Mobile responsive composition

## Intentional deviations
- Demo phone/email values omitted because contact details are environment-backed.
- Stitch demo tyre brands omitted because products come from lib/catalogue.ts.
- Unsupported market-leading/freight/depot/credit claims omitted.
- Optional tyre specifications render only when present in the Tyre record.

## Behaviour verification
- npm run typecheck: [actual outcome]
- npm run lint: [actual outcome]
- npm test: [actual outcome]
- npm run build: [actual outcome]
- npm run test:e2e: [actual outcome]

## Visual verification
Document the desktop/mobile viewport sizes reviewed and any remaining intentional visual differences.
```

The committed report must contain actual outcomes rather than bracketed instruction text.

- [ ] **Step 6: Inspect the final branch diff**

```powershell
git status --short
git log --oneline --decorate -5
git diff origin/master...HEAD --stat
git diff origin/master...HEAD
```

Confirm there are no changes to payment/webhook/order-persistence files and no accidental Stitch demo data.

- [ ] **Step 7: Commit final QA evidence**

```powershell
git add tests/e2e/stitch-stage-2.spec.ts docs/stitch-stage-2-fidelity.md
git commit -m "test: verify Stitch Stage 2 storefront fidelity"
```

If a final responsive CSS fix was required, include `app/globals.css` in the same commit after its targeted regression passes.

- [ ] **Step 8: Stop for owner review**

Do not merge and do not push to production. Present the commit list, files changed, exact results of all five quality commands, visual comparison evidence, intentional Stitch deviations, and confirmation that catalogue/cart/order/payment boundaries were preserved. Wait for explicit owner approval before merging to `master`.
