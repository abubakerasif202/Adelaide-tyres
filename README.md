# Adelaide Wholesale Tyres

Production website for Adelaide Wholesale Tyres — a bulk / wholesale tyre supplier
in Regency Park, South Australia. Next.js App Router, TypeScript, Tailwind CSS v4.

Business rules baked into the app:

- Minimum order: **4 tyres total** across the cart (mix any products)
- Free Adelaide-wide delivery once the minimum is met; warehouse pickup always free
- Wholesale pricing shown per tyre (currently **placeholder test values**)

## Local development

Requires Node.js 22.x.

```powershell
Set-Location -LiteralPath "C:\Users\abuba\adelaide-wholesale-tyres"
npm install
npm run dev
```

## Quality checks

```powershell
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (flat config, next/core-web-vitals + next/typescript)
npm test            # node --test — cart, filter and checkout-validation unit tests
npm run build       # next build
npm run test:e2e    # Playwright smoke tests (desktop + mobile), starts next start on :3100
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Homepage — hero, benefits, stock preview, free-delivery CTA |
| `/tyres` | Catalogue with search + filters (size, brand, application, in-stock), URL state |
| `/tyres/[slug]` | Product detail — specs, related tyres, add to cart / buy |
| `/cart` | Cart with localStorage persistence + 4-tyre minimum gate |
| `/checkout` | Cart → Delivery → Payment → Confirm, server-validated |
| `/commercial` | Fleet / trade supply + wholesale quote form |
| `/delivery` | Free delivery rules, pickup, FAQ (FAQPage JSON-LD) |
| `/about`, `/contact`, `/privacy`, `/terms` | Supporting pages |
| `/api/orders`, `/api/enquiries` | Same-origin, validated, rate-limited form endpoints |
| `/robots.txt`, `/sitemap.xml` | Generated from `app/robots.ts` / `app/sitemap.ts` |

## Architecture

- **`lib/config.ts`** — all business config (name, address, order rules, service area, nav).
- **`lib/catalogue.ts`** — typed product catalogue + read helpers. Single source of
  truth for products, price and stock. UI never hardcodes products.
- **`lib/cart.ts`** — pure cart/order logic. `getTotalTyreQuantity()` is the one
  authoritative helper; `qualifiesForFreeDelivery()` centralises the delivery rule.
- **`lib/cart-context.tsx`** — client provider, localStorage persistence, cross-tab sync.
- **`lib/filter.ts`** — pure catalogue filtering + URL <-> filter serialisation.
- **`lib/checkout-validation.ts`** — pure, server-reused field validation.
- **`lib/payment.ts`** — payment integration boundary. No card data is collected.
- **`lib/seo.ts`** — Organization / LocalBusiness (TireShop) / WebSite / Product /
  BreadcrumbList JSON-LD. Only facts we hold — no invented reviews, ratings, hours.

## Environment

Copy `.env.example` to `.env.local`. Everything is server-only except the
`NEXT_PUBLIC_` values, which render in the UI. With nothing set, the site runs a
safe development mode: enquiries and orders are validated and logged (not emailed),
checkout issues a test reference and takes no payment, and phone/email affordances
are hidden rather than showing placeholder data.

See **"Anything requiring real credentials / data"** in the handover notes:

- `RESEND_API_KEY` / `ENQUIRY_TO_EMAIL` / `ENQUIRY_FROM_EMAIL` — form delivery
- `STRIPE_SECRET_KEY` (+ publishable / webhook) — wire the live path in `lib/payment.ts`
- `NEXT_PUBLIC_BUSINESS_PHONE` / `NEXT_PUBLIC_BUSINESS_EMAIL` — real contact details
- Final wholesale prices and any verified product photography (`lib/catalogue.ts`,
  `image` fields currently `null` → neutral tyre placeholder renders)
