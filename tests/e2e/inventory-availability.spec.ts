import { test, expect } from "@playwright/test";
import { failAvailability, mockAvailability } from "./support/availability";

const UNMAPPED = "/tyres/greforce-g-pilot-x1-295-80r22-5";
const MAPPED = "/tyres/ralson-rmr61-295-80r22-5";

test("unmapped Greforce G-PILOT X1 keeps its page and SEO but cannot be bought", async ({ page }) => {
  await mockAvailability(page);
  const requests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/")) requests.push(request.url()); });
  await page.goto(UNMAPPED);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("295/80R22.5");
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLd.join(" ")).toContain('"@type":"Product"');
  expect(jsonLd.join(" ")).not.toContain("schema.org/InStock");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /greforce-g-pilot-x1-295-80r22-5$/);
  const panel = page.getByTestId("purchase-panel");
  await expect(panel.getByText("Contact us for availability")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Contact for availability" })).toBeDisabled();
  await expect(panel.getByRole("spinbutton")).toBeDisabled();
  await expect(panel.getByRole("button", { name: /add \d+ to cart/i })).toHaveCount(0);
  expect(requests.filter((url) => /checkout|orders|reservation/.test(url))).toEqual([]);
});

test("mapped product shows live 247 state and fails closed when the feed is down", async ({ page }) => {
  await mockAvailability(page, { "ralson-rmr61-295-80r22-5": { state: "low_stock", available: 3 } });
  await page.goto(MAPPED);
  const panel = page.getByTestId("purchase-panel");
  await expect(panel.getByText("Low stock")).toBeVisible();
  await expect(panel.getByRole("button", { name: /add \d+ to cart/i })).toBeEnabled();
  // The quantity selector is capped by the live figure, never a catalogue figure.
  const qty = panel.getByRole("spinbutton");
  await qty.fill("9");
  await expect(qty).toHaveValue("3");

  await page.unroute("**/api/inventory/availability");
  await mockAvailability(page, { "ralson-rmr61-295-80r22-5": { state: "out_of_stock", available: 0 } });
  await page.reload();
  await expect(panel.getByText("Currently out of stock")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Out of stock" })).toBeDisabled();

  await page.unroute("**/api/inventory/availability");
  await failAvailability(page);
  await page.reload();
  await expect(panel.getByRole("button", { name: "Check availability" })).toBeDisabled();
  await expect(panel.getByText("Checking availability").first()).toBeVisible();
});

test("catalogue 'In stock only' and stock sort use live availability, not catalogue figures", async ({ page }) => {
  await mockAvailability(page, {
    "ralson-rmr61-295-80r22-5": { state: "in_stock", available: 40 },
    "greforce-gr881w-11r22-5": { state: "low_stock", available: 2 },
  }, 0);
  await page.goto("/tyres");
  await expect(page.getByRole("article")).toHaveCount(25);
  await expect(page.getByRole("article").filter({ hasText: "Out of stock" }).first()).toBeVisible();
  await page.goto("/tyres?stock=in");
  await expect(page.getByRole("article")).toHaveCount(2);
  await page.goto("/tyres?stock=in&sort=stock-desc");
  const first = page.getByRole("article").first();
  await expect(first).toContainText("RMR61");
  await expect(first).toContainText("295/80R22.5");
});

test("cart and checkout never show a static stock figure", async ({ page }) => {
  await mockAvailability(page);
  await page.goto("/tyres/greforce-gr881w-11r22-5");
  await page.getByRole("button", { name: "Add & go to cart" }).click();
  await expect(page.getByText("availability confirmed at checkout")).toBeVisible();
  await expect(page.getByText(/\d+ in stock/)).toHaveCount(0);
});
