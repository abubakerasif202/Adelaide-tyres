import { expect, test } from "@playwright/test";
import { order } from "@/lib/config";
import { deliveryRuleSummary, formatCurrency } from "@/lib/format";

const fabricated = /08 8240 0000|Bridgestone R168|Michelin X Multi|Kumho Heavy Duty|SA'?s largest/i;

test("Stage 2 homepage uses the approved Stitch hierarchy with verified content", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Wholesale tyres. Ready for your next order.",
    }),
  ).toBeVisible();

  // The spec requires exactly one H1 per page.
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

  await expect(
    page.getByRole("link", { name: "Shop available stock" }).first(),
  ).toHaveAttribute("href", "/tyres");

  await expect(
    page.getByRole("link", { name: "Get a wholesale quote" }).first(),
  ).toHaveAttribute("href", "/contact?type=quote");

  await expect(page.locator("body")).toContainText("No minimum order");
  await expect(page.locator("body")).toContainText("Free Adelaide-wide delivery");

  // Config-derived, not a literal: this fails if anyone re-hardcodes the
  // delivery numbers, and it also fails if config changes without the copy
  // following — which a bare `toContainText("$50")` could never do.
  await expect(page.locator("body")).toContainText(deliveryRuleSummary("card"));
  await expect(page.getByRole("heading", { level: 2, name: deliveryRuleSummary("headline") })).toBeVisible();
  await expect(page.locator("body")).toContainText(
    `${formatCurrency(order.delivery.feeAud)} Adelaide-wide delivery`,
  );

  await expect(page.locator("body")).not.toContainText(fabricated);
});

test("hero headline and CTAs do not clip at a 320px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");

  // `.hero` is overflow-hidden, so document.body.scrollWidth cannot reveal this.
  // Measure the elements themselves.
  const overflow = await page.evaluate(() => {
    const selectors = ["h1.hero__title", ".hero__actions", ".hero__copy"];
    return selectors.map((sel) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return { sel, found: false, scrollWidth: 0, clientWidth: 0 };
      return {
        sel,
        found: true,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      };
    });
  });

  for (const entry of overflow) {
    expect(entry.found, `${entry.sel} should render`).toBe(true);
    // 1px tolerance for sub-pixel text metrics.
    expect(
      entry.scrollWidth,
      `${entry.sel} overflows its box (${entry.scrollWidth} > ${entry.clientWidth})`,
    ).toBeLessThanOrEqual(entry.clientWidth + 1);
  }

  await expect(page.locator("body")).toContainText("Ready for your next order.");
});

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
