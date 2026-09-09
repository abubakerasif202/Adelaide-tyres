import { test, expect } from "@playwright/test";

test("homepage hero and stock preview render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ready for your next order");
  await expect(page.getByRole("link", { name: "Shop available stock" }).first()).toBeVisible();
  await expect(page.getByRole("article").first()).toBeVisible();
});

test("catalogue filters by brand via the search box", async ({ page }) => {
  await page.goto("/tyres");
  await page.getByPlaceholder("Search tyre size, pattern or brand").fill("Ralson");
  await expect(page.getByRole("article")).toHaveCount(13);
});

test("footer only links to published application categories", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: "Truck tyres" })).toHaveAttribute("href", "/tyres?application=truck");
  await expect(footer.getByRole("link", { name: "Commercial tyres" })).toHaveAttribute("href", "/tyres?application=commercial");
  await expect(footer.getByRole("link", { name: "Passenger" })).toHaveCount(0);
  await page.goto("/tyres?application=commercial");
  await expect(page.getByRole("article")).not.toHaveCount(0);
});

test("product detail page shows price and add to cart", async ({ page }) => {
  await page.goto("/tyres/greforce-gr881w-11r22-5");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("11R22.5");
  await expect(
    page.getByRole("button", { name: /add \d+ to cart/i }).first(),
  ).toBeVisible();
});

test("cart has no minimum order and shows tiered delivery pricing", async ({ page }) => {
  await page.goto("/tyres/greforce-gr881w-11r22-5");
  const panel = page.getByTestId("purchase-panel");
  // No minimum order — a single tyre can be added and checked out immediately.
  await panel
    .getByRole("spinbutton", { name: "Quantity for Greforce GR881W 11R22.5" })
    .fill("2");
  await panel.getByRole("button", { name: "Add 2 to cart" }).click();
  // Wait for the cart to register (header count) before navigating.
  await expect(page.getByRole("link", { name: /cart, 2 tyres/i })).toBeVisible();
  await page.getByRole("link", { name: /cart, 2 tyres/i }).click();
  // Under 8 tyres — $50 delivery shown, checkout available with no minimum gate.
  const delivery = page.locator("aside dl > div").filter({ has: page.locator("dt", { hasText: /^Delivery$/ }) }).locator("dd");
  await expect(delivery).toHaveText("$50");
  await expect(page.getByRole("link", { name: /continue to checkout/i })).toBeEnabled();

  await page
    .getByRole("spinbutton", { name: "Quantity for Greforce GR881W 11R22.5" })
    .fill("8");
  await expect(delivery).toHaveText(/free/i);
  await expect(page.getByRole("link", { name: /continue to checkout/i })).toBeEnabled();
});

test("mobile menu opens and lists navigation", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only");
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Shop Tyres" })).toBeVisible();
});

test("checkout blocks direct access with an empty cart", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByText(/Nothing to check out/i)).toBeVisible();
});
