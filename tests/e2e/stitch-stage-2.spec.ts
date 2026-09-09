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
