# Stitch Stage 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Stitch visual system to the Adelaide Wholesale Tyres homepage, catalogue, and product-detail experience on desktop and mobile without changing verified commerce behaviour or business facts.

**Architecture:** Keep the existing Next.js App Router/server-component structure and current data boundaries. Visual work stays in pages, focused components and `app/globals.css`; catalogue filtering remains URL-driven through `lib/filter.ts`; products remain sourced from `lib/catalogue.ts`; cart/order/payment code is not redesigned in Stage 2. Add focused Playwright coverage for the new visual/interaction structure, then run the existing regression suite unchanged.

**Tech Stack:** Node.js 22.x, Next.js 16.3.3 App Router, React 19.2.6, TypeScript 5.9.3, Tailwind CSS 4.2.1, Playwright 1.62.1.

**Spec:** `docs/superpowers/specs/2026-09-10-stitch-stage-2-design.md`

## Global Constraints

- Work only on `redesign/stitch-stage-2`; do not merge or push to `master` without owner approval.
- Read `AGENTS.md` first and follow its Next.js 16.3.3 documentation requirement before editing Next.js code.
- Stitch controls layout and visual treatment; repository code/config/catalogue controls facts and behaviour.
- Preserve: no minimum order; $50 Adelaide-wide delivery for 1–7 tyres; free Adelaide-wide delivery for 8+ tyres; free warehouse pickup; `6 Birralee Rd, Regency Park SA 5010`.
- Products, prices, stock, application, optional technical fields and image paths remain sourced from `lib/catalogue.ts`.
- Public phone/email affordances remain environment-backed; never hardcode Stitch demo contact details.
- Do not introduce Stitch demo products or unsupported market-leading, freight, depot, fitting, award, rating or 30-day-credit claims.
- Do not restructure `lib/cart.ts`, `lib/cart-context.tsx`, checkout validation, order persistence, payment code or webhooks for visual convenience.
- Do not add another animation/UI framework. Extend the current Tailwind/CSS token system.
- Preserve the Stage-1 dark product-media plate and single stock badge.
- Keep server-rendered content server-rendered; only interaction components remain client components.
- Behaviour changes require a failing test first. Pure layout/CSS changes still require targeted Playwright regression checks.
- Stitch references for this stage: `adelaide_wholesale_tyres_homepage`, `adelaide_wholesale_tyres_catalogue`, `adelaide_wholesale_tyres_mobile_catalogue`, `adelaide_wholesale_tyres_product_detail_page`, `adelaide_wholesale_tyres_mobile_product_detail_page`.

## Execution Preflight

- [ ] **Step 1: Enter an isolated worktree for the existing Stage 2 branch**

```powershell
git fetch origin
git worktree add .worktrees\stitch-stage-2 redesign/stitch-stage-2
Set-Location .worktrees\stitch-stage-2
```

If `redesign/stitch-stage-2` is already checked out in an isolated worktree, use that existing worktree instead.

- [ ] **Step 2: Install locked dependencies**

```powershell
npm install
```

- [ ] **Step 3: Verify the baseline before production edits**

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Expected: every command exits `0`. If any command fails, stop before Stage 2 edits and report the baseline failure.

---

### Task 1: Homepage Stitch Integration

**Files:**
- Modify: `components/Hero.tsx`
- Modify: `components/HeroArtwork.tsx`
- Modify: `components/Benefits.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Create: `tests/e2e/stitch-stage-2.spec.ts`
- Regression only: `components/Header.tsx`
- Regression only: `components/Footer.tsx`

**Interfaces:**
- Consumes: `business`, `order`, `catalogueStats`, `formatCurrency`, `ProductCard`, `CommercialTeaser`, `FreeDeliveryCTA`.
- Produces: a server-rendered homepage with the approved H1, configuration-derived delivery copy, verified product imagery, and unchanged catalogue/cart interaction paths.

- [ ] **Step 1: Write the failing homepage acceptance test**

Create `tests/e2e/stitch-stage-2.spec.ts`:

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

- [ ] **Step 2: Verify the test fails for the intended reason**

```powershell
npx playwright test tests/e2e/stitch-stage-2.spec.ts --project=desktop --grep "Stage 2 homepage"
```

Expected: FAIL because the current H1 is `Buy tyres in bulk. Pay wholesale.`.

- [ ] **Step 3: Replace the hero content hierarchy in `components/Hero.tsx`**

Use these imports:

```ts
import { business, order } from "@/lib/config";
import { catalogueStats } from "@/lib/catalogue";
import { formatCurrency } from "@/lib/format";
```

Use this visible copy:

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

Keep these routes and labels exactly:

```tsx
<Link href="/tyres" className="btn btn--red">Shop available stock</Link>
<Link href="/contact?type=quote" className="btn btn--outline-light">Get a wholesale quote</Link>
```

Keep `business.address.oneLine` in the hero meta line. Do not add a phone number.

- [ ] **Step 4: Derive all `Benefits.tsx` delivery numbers from config**

Use:

```ts
import { order } from "@/lib/config";
import { formatCurrency } from "@/lib/format";

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

Keep `Reveal` and the existing semantic card headings.

- [ ] **Step 5: Add the approved hero typography rules to `app/globals.css`**

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

Keep the existing green/charcoal/red palette. Do not put a decorative pill above the H1.

- [ ] **Step 6: Refine only the framing in `HeroArtwork.tsx`**

Keep the exact asset and alt source:

```tsx
<Image
  src="/images/tyres/ralson-rmr61-295-80r22-5.webp"
  alt="Ralson RMR61 295/80R22.5 tyre from current Adelaide stock"
  fill
  priority
  sizes="(max-width: 1023px) min(100vw - 32px, 520px), 42vw"
  className="hero__tyre object-cover"
/>
```

Only adjust the surrounding studio frame, borders, shadows and spacing to match Stitch. Keep live `units` and `skuLines`; do not substitute a Stitch demo tyre.

- [ ] **Step 7: Keep homepage server/data boundaries intact in `app/page.tsx`**

Retain the existing real catalogue preview construction:

```ts
const preview = [
  "ralson-rmr61-295-80r22-5",
  "ralson-rdr55-11r22-5",
  "greforce-gr881w-11r22-5",
  "greforce-grd1919-11r22-5",
  "jumbo-ss398-295-80r22-5",
  "greforce-g-pilot-x1-295-80r22-5",
  "ralson-rac55-11r22-5",
  "haulmax-att101-11r22-5",
].map(getTyreBySlug).filter((tyre) => tyre !== undefined);
```

Keep `Hero`, `Benefits`, the stock preview, `CommercialTeaser`, and `FreeDeliveryCTA` in that order. Adjust only section framing and spacing.

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

### Task 2: Catalogue Desktop Workspace and Mobile Filter Sheet

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

- [ ] **Step 1: Add failing catalogue tests**

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

- [ ] **Step 2: Verify the catalogue tests fail for the intended reason**

```powershell
npx playwright test tests/e2e/stitch-stage-2.spec.ts --project=desktop --grep "Stage 2 catalogue"
```

Expected: FAIL because `CatalogueBrowser` currently has one horizontal filter card and no `aside`/mobile dialog.

- [ ] **Step 3: Keep URL state ownership in `CatalogueBrowser`**

Change the React import to:

```ts
import { useCallback, useMemo, useState } from "react";
```

Add:

```ts
const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
```

Keep `filters` derived from `searchParams`. Do not create a second local `TyreFilters` store.

- [ ] **Step 4: Add one shared clear callback**

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

- [ ] **Step 5: Extract a local `FilterControls` renderer without changing control semantics**

Add this interface in `CatalogueBrowser.tsx`:

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

Move the existing search, Size, Brand, Application, In-stock and Sort controls into `FilterControls`. Preserve these accessible names exactly: `Search tyres`, `Size`, `Brand`, `Application`, `In stock only`, `Sort results`. Keep `APPLICATION_LABELS` for visible application labels and the existing URL values for serialization.

- [ ] **Step 6: Render a desktop rail and results column**

Use this top-level structure:

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
    <div className="catalogue-mobile-toolbar">
      <button
        type="button"
        className="catalogue-filter-trigger btn btn--outline"
        aria-expanded={mobileFiltersOpen}
        onClick={() => setMobileFiltersOpen(true)}
      >
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>
      <p aria-live="polite" aria-atomic="true" className="text-[14px] font-semibold text-[var(--color-text-muted)]">
        {results.length} {results.length === 1 ? "result" : "results"}
      </p>
    </div>

    {activeCount > 0 && (
      <button type="button" className="link-underline text-[13px] font-bold uppercase tracking-wide" onClick={clearFilters}>
        Clear filters
      </button>
    )}

    {results.length === 0 ? (
      <div className="surface-card mt-6 p-10 text-center">
        <h3 className="display text-[22px]">No tyres match those filters</h3>
        <p className="mx-auto mt-2 max-w-md text-[var(--color-text-muted)]">
          Try a broader size or brand, or send us the size you need and we&apos;ll check what&apos;s inbound.
        </p>
        <a href="/contact?type=quote" className="btn btn--green mt-5">Request a size</a>
      </div>
    ) : (
      <div className="catalogue-results mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {results.map((tyre) => <ProductCard key={tyre.id} tyre={tyre} />)}
      </div>
    )}
  </section>
</div>
```

- [ ] **Step 7: Add the mobile filter sheet**

Render this adjacent to the catalogue shell when `mobileFiltersOpen` is true:

```tsx
{mobileFiltersOpen && (
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
      <div className="mt-5">
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
  </div>
)}
```

Opening/closing the sheet must not change filter URL state.

- [ ] **Step 8: Add catalogue layout CSS**

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

.catalogue-mobile-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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

  .catalogue-mobile-toolbar .catalogue-filter-trigger,
  .catalogue-filter-sheet {
    display: none;
  }
}
```

- [ ] **Step 9: Apply the Stitch catalogue page framing in `app/tyres/page.tsx`**

Keep metadata, JSON-LD, `getAllTyres()`, `uniqueSizes()`, `uniqueBrands()` and `uniqueApplications()`. Change the visible heading block to:

```tsx
<h1 className="display text-[clamp(36px,5vw,56px)]">Wholesale tyre catalogue</h1>
<p className="mt-2 max-w-xl text-[var(--color-text-muted)]">
  Search current Adelaide stock by size, brand or pattern. No minimum order.
</p>
```

- [ ] **Step 10: Verify filtering, URL restoration, sizing and cart interaction**

```powershell
npm run build
npx playwright test tests/e2e/stitch-stage-2.spec.ts --grep "catalogue"
npx playwright test tests/e2e/smoke.spec.ts --grep "catalogue filters|cart has no minimum"
npx playwright test tests/e2e/production-polish.spec.ts --grep "required routes remain within|quantity is capped"
```

Expected: PASS on applicable desktop/mobile runs.

- [ ] **Step 11: Commit the catalogue slice**

```powershell
git add app/tyres/page.tsx components/CatalogueBrowser.tsx app/globals.css tests/e2e/stitch-stage-2.spec.ts
git commit -m "feat: add Stitch catalogue workspace and mobile filters"
```

---

### Task 3: Product Detail and Purchase Panel Stitch Integration

**Files:**
- Modify: `app/tyres/[slug]/page.tsx`
- Modify: `components/ProductPurchasePanel.tsx`
- Modify: `app/globals.css`
- Modify: `tests/e2e/stitch-stage-2.spec.ts`
- Reuse unchanged: `components/DeliveryStatus.tsx`
- Reuse unchanged: `components/QuantitySelector.tsx`
- Regression only: `lib/seo.ts`
- Regression only: `lib/catalogue.ts`

**Interfaces:**
- Consumes: `Tyre`, `tyreFullName()`, `APPLICATION_LABELS`, `ProductPurchasePanel`, `DeliveryStatus`, `QuantitySelector`, existing cart context.
- Produces: Stitch-style media/purchase composition with a full verified product H1 and shared delivery-progress widget without changing stock or cart rules.

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

- [ ] **Step 2: Verify the product tests fail for the intended reason**

```powershell
npx playwright test tests/e2e/stitch-stage-2.spec.ts --project=desktop --grep "Stage 2 product detail"
```

Expected: FAIL because the current H1 is only the size and `ProductPurchasePanel` does not render `DeliveryStatus`.

- [ ] **Step 3: Update the product identity hierarchy**

Keep metadata and JSON-LD untouched. Replace the visible identity block with:

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

- [ ] **Step 4: Use a dedicated Stage 2 media bay**

Replace the current light media card with:

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

Do not add a colour overlay to the tyre image itself.

- [ ] **Step 5: Mark the specifications as a named region while preserving exact filtering**

Change the specifications container to:

```tsx
<section aria-label="Tyre specifications">
  <h2 className="display text-[24px]">Specifications</h2>
  <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
    {specs
      .filter(([, value]) => value)
      .map(([key, value]) => (
        <div key={key} className="flex justify-between border-b border-[var(--color-border)] py-2">
          <dt className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            {key}
          </dt>
          <dd className="text-[14px] font-semibold capitalize">{value}</dd>
        </div>
      ))}
  </dl>
</section>
```

Keep the existing informational note below the region when `loadIndex` is absent.

- [ ] **Step 6: Reuse `DeliveryStatus` inside `ProductPurchasePanel.tsx`**

Add:

```ts
import { DeliveryStatus } from "./DeliveryStatus";
```

Keep `addToCart()`, `remainingStock`, `selectedQty`, `QuantitySelector`, the two purchase buttons and the static delivery/pickup tier table unchanged. Replace only the duplicated final delivery-status conditional with:

```tsx
<div className="mt-4">
  <DeliveryStatus
    totalTyres={totalTyres}
    qualifiesForFreeDelivery={qualifiesForFreeDelivery}
    deliveryFee={deliveryFee}
  />
</div>
```

- [ ] **Step 7: Preserve the mobile overflow fix**

Keep the page grid single-column by default and switch to a 400px purchase column only at desktop. The layout must remain equivalent to:

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

If the page continues using Tailwind layout utilities, retain `grid-cols-1` before any `lg:grid-cols-*` class.

- [ ] **Step 8: Run product, cart and structured-data regressions**

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

### Task 4: Fidelity, Responsive QA and Handoff Evidence

**Files:**
- Modify if the final acceptance test needs extension: `tests/e2e/stitch-stage-2.spec.ts`
- Modify if browser QA identifies a Stage 2 responsive defect: `app/globals.css`
- Create: `docs/stitch-stage-2-fidelity.md`

**Interfaces:**
- Consumes: the three implemented Stage 2 surfaces and five supplied Stitch reference screens.
- Produces: a branch with fresh automated verification and a factual fidelity report ready for owner review, not production deployment.

- [ ] **Step 1: Add fabricated-content guards for all Stage 2 routes**

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

Expected: every command exits `0`. A failed command blocks completion.

- [ ] **Step 3: Perform browser QA at all required widths**

Review these viewport widths:

```text
1440, 1280, 1024, 768, 430, 390, 375, 360, 320
```

On `/`, `/tyres`, and `/tyres/ralson-rmr61-295-80r22-5`, verify no horizontal overflow, no introduced console errors, no clipped H1/CTA/product metadata, practical 44px+ touch targets, working mobile filters, correct URL restoration, usable product cards at 320px, and working quantity/add-to-cart state.

- [ ] **Step 4: Compare implementation against the Stitch references**

Compare:
- Homepage → `adelaide_wholesale_tyres_homepage/screen.png`
- Catalogue desktop → `adelaide_wholesale_tyres_catalogue/screen.png`
- Catalogue mobile → `adelaide_wholesale_tyres_mobile_catalogue/screen.png`
- Product desktop → `adelaide_wholesale_tyres_product_detail_page/screen.png`
- Product mobile → `adelaide_wholesale_tyres_mobile_product_detail_page/screen.png`

Check headline hierarchy, palette, spacing, media framing, product-card proportions, desktop filter density, mobile filter composition, purchase-panel hierarchy, control typography and mobile stacking. Unsupported Stitch demo data is an intentional deviation, not a fidelity defect.

- [ ] **Step 5: Write `docs/stitch-stage-2-fidelity.md` after verification**

The report must contain these sections with the observed results from this execution:
- `Reference screens`: name the five Stitch references above.
- `Verified matches`: list concrete matches for hero hierarchy, catalogue workspace, Stage-1 card treatment, product-detail media/purchase hierarchy and responsive composition.
- `Intentional deviations`: state that demo phone/email values, demo tyre brands, unsupported market-leading/freight/depot/credit claims and absent optional tyre specifications were deliberately omitted.
- `Behaviour verification`: record each command (`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`) with its observed pass/fail result and exit status.
- `Visual verification`: record every viewport reviewed and any remaining intentional visual differences.

Do not write the report before the commands and visual comparisons have actually been completed.

- [ ] **Step 6: Inspect the final branch diff**

```powershell
git status --short
git log --oneline --decorate -5
git diff origin/master...HEAD --stat
git diff origin/master...HEAD
```

Confirm the branch contains no changes to payment/webhook/order-persistence files and no accidental Stitch demo data.

- [ ] **Step 7: Commit the final acceptance test/report**

```powershell
git add tests/e2e/stitch-stage-2.spec.ts docs/stitch-stage-2-fidelity.md
git commit -m "test: verify Stitch Stage 2 storefront fidelity"
```

If browser QA required a responsive CSS repair, include `app/globals.css` in this commit only after the targeted regression and full quality gate pass again.

- [ ] **Step 8: Stop for owner review**

Do not merge and do not push to production. Present the commit list, files changed, exact results of all five quality commands, visual comparison evidence, intentional Stitch deviations, and confirmation that catalogue/cart/order/payment boundaries were preserved. Wait for explicit owner approval before merging to `master`.
