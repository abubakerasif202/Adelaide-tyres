import { test, expect } from "@playwright/test";

test("homepage hero and stock preview render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Buy tyres in bulk");
  await expect(page.getByRole("link", { name: "Shop available stock" }).first()).toBeVisible();
  await expect(page.getByRole("article").first()).toBeVisible();
});

test("catalogue filters by brand via the search box", async ({ page }) => {
  await page.goto("/tyres");
  await page.getByPlaceholder("Search tyre size, pattern or brand").fill("Ralson");
  await expect(page.getByRole("article")).toHaveCount(2);
});

test("product detail page shows price and add to cart", async ({ page }) => {
  await page.goto("/tyres/greforce-gr881w-11r22-5");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("11R22.5");
  await expect(
    page.getByRole("button", { name: /add \d+ to cart/i }).first(),
  ).toBeVisible();
});

test("cart enforces the 4-tyre minimum then unlocks checkout", async ({ page }) => {
  await page.goto("/tyres/greforce-gr881w-11r22-5");
  const panel = page.getByTestId("purchase-panel");
  // Default quantity is 4 — reduce to 2 to test the gate.
  await panel
    .getByRole("spinbutton", { name: "Quantity for Greforce GR881W 11R22.5" })
    .fill("2");
  await panel.getByRole("button", { name: "Add 2 to cart" }).click();
  // Wait for the cart to register (header count) before navigating.
  await expect(page.getByRole("link", { name: /cart, 2 tyres/i })).toBeVisible();
  await page.waitForTimeout(200);
  await page.goto("/cart");
  await expect(page.getByText(/Add 2 more tyres/i)).toBeVisible();

  await page
    .getByRole("spinbutton", { name: "Quantity for Greforce GR881W 11R22.5" })
    .fill("4");
  await expect(page.getByText(/Minimum order met/i)).toBeVisible();
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
