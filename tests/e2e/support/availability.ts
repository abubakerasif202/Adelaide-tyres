import type { Page } from "@playwright/test";

type State = "in_stock" | "low_stock" | "out_of_stock" | "unmapped" | "unavailable";

/**
 * Stands in for the live 247 availability feed in browser tests. The Playwright
 * server runs without an inventory connection (the real one is proven by
 * tests/cross-system), so purchasable states must be declared explicitly.
 * The intentionally unmapped Greforce G-PILOT X1 always reports "unmapped".
 */
export async function mockAvailability(page: Page, overrides: Record<string, { state: State; available: number | null }> = {}, defaultAvailable = 12) {
  await page.route("**/api/inventory/availability", async (route) => {
    const { slugs = [] } = route.request().postDataJSON() as { slugs?: string[] };
    const items = slugs.map((slug) => {
      if (slug === "greforce-g-pilot-x1-295-80r22-5") return { slug, state: "unmapped", available: null, updatedAt: null };
      const override = overrides[slug];
      if (override) return { slug, ...override, updatedAt: new Date().toISOString() };
      return { slug, state: defaultAvailable > 4 ? "in_stock" : defaultAvailable > 0 ? "low_stock" : "out_of_stock", available: defaultAvailable, updatedAt: new Date().toISOString() };
    });
    await route.fulfill({ json: { items } });
  });
}

export async function failAvailability(page: Page) {
  await page.route("**/api/inventory/availability", (route) => route.fulfill({ status: 503, json: { items: [], error: "Availability temporarily unavailable." } }));
}
