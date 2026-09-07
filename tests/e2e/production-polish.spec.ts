import { expect, test, type Page } from "@playwright/test";

const product = "/tyres/greforce-gr881w-11r22-5";
const quantityName = "Quantity for Greforce GR881W 11R22.5";

test("undelivered enquiry preserves input and never claims receipt", async ({ page }) => {
  await page.route("**/api/enquiries", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, delivered: false }),
  }));
  await page.goto("/contact");
  const form = page.locator("form");
  await form.getByRole("textbox", { name: /^Name/ }).fill("Regression enquiry");
  await form.getByRole("textbox", { name: /^Email/ }).fill("regression@example.invalid");
  await form.getByRole("textbox", { name: /^Message/ }).fill("Please confirm current tyre availability.");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Send enquiry" }).click();
  await expect(form.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Received", { exact: true })).toHaveCount(0);
  await expect(form.getByRole("textbox", { name: /^Name/ })).toHaveValue("Regression enquiry");
  await expect(form.getByRole("textbox", { name: /^Message/ })).toHaveValue("Please confirm current tyre availability.");
  await expect(form.getByRole("button", { name: "Send enquiry" })).toBeEnabled();
});

test("order API rejects duplicate stock overflow and malformed quantities before processing", async ({ request, baseURL }, testInfo) => {
  const invalidLines = [
    [{ slug: product.split("/").pop(), quantity: 60 }, { slug: product.split("/").pop(), quantity: 60 }],
    [{ slug: product.split("/").pop(), quantity: 1.5 }],
    [{ slug: product.split("/").pop(), quantity: 0 }],
    [null],
  ];
  for (const [index, lines] of invalidLines.entries()) {
    const response = await request.post("/api/orders", {
      headers: { origin: baseURL!, "x-forwarded-for": `192.0.2.${testInfo.project.name === "desktop" ? index + 1 : index + 20}` },
      data: {
        startedAt: Date.now() - 10_000,
        company_website: "",
        details: { name: "Regression test", phone: "0400000000", email: "regression@example.invalid", deliveryMethod: "pickup" },
        lines,
      },
    });
    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error).toEqual(expect.any(String));
    expect(body).not.toHaveProperty("reference");
  }
  const malformed = await request.post("/api/enquiries", {
    headers: { origin: baseURL!, "x-forwarded-for": "198.51.100.99" },
    data: null,
  });
  expect(malformed.status()).toBe(400);
});

async function addTyres(page: Page, quantity = 1) {
  await page.goto(product);
  const panel = page.getByTestId("purchase-panel");
  await panel.getByRole("spinbutton", { name: quantityName }).fill(String(quantity));
  await panel.getByRole("button", { name: "Add & go to cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole("spinbutton", { name: quantityName })).toHaveValue(String(quantity));
}

function summaryValue(page: Page, label: string) {
  return page.locator("aside dl > div").filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`, "i") }) }).locator("dd");
}

test("one tyre can proceed through checkout without a quantity gate", async ({ page }) => {
  await addTyres(page);
  await expect(summaryValue(page, "Delivery")).toHaveText("$50");
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await expect(page.getByRole("button", { name: "Continue to delivery" })).toBeEnabled();
  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await expect(page.getByRole("heading", { name: "Delivery details" })).toBeVisible();
  await expect(summaryValue(page, "Delivery")).toHaveText("$50");
});

test("7 to 8 to 7 tyres updates delivery and pickup stays free", async ({ page }) => {
  await addTyres(page, 7);
  const quantity = page.getByRole("spinbutton", { name: quantityName });
  await expect(summaryValue(page, "Delivery")).toHaveText("$50");
  await quantity.fill("8");
  await expect(summaryValue(page, "Delivery")).toHaveText(/free/i);
  await quantity.fill("7");
  await expect(summaryValue(page, "Delivery")).toHaveText("$50");
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await page.getByRole("radio", { name: /warehouse pickup/i }).check();
  await expect(summaryValue(page, "Delivery|Warehouse pickup")).toHaveText(/free/i);
  await page.getByRole("radio", { name: /adelaide delivery/i }).check();
  await expect(summaryValue(page, "Delivery")).toHaveText("$50");
});

test("quantity is capped at verified stock on product and cart", async ({ page }) => {
  await page.goto(product);
  const panel = page.getByTestId("purchase-panel");
  await panel.getByRole("spinbutton", { name: quantityName }).fill("108");
  await expect(panel.getByRole("spinbutton", { name: quantityName })).toHaveValue("107");
  await expect(panel.getByRole("button", { name: `Increase ${quantityName}` })).toBeDisabled();
  await panel.getByRole("button", { name: "Add & go to cart" }).click();
  await expect(page.getByRole("spinbutton", { name: quantityName })).toHaveValue("107");
  await page.getByRole("spinbutton", { name: quantityName }).fill("999");
  await expect(page.getByRole("spinbutton", { name: quantityName })).toHaveValue("107");
});

const routes = ["/", "/tyres", product, "/tyres/ralson-rmr61-295-80r22-5", "/tyres/jumbo-ss398-295-80r22-5", "/cart", "/checkout", "/commercial", "/delivery", "/contact"];

for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
  test(`required routes remain within ${width}px and render without browser errors`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Widths are explicitly covered in one browser project");
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
    });
    await addTyres(page, 1);
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      await page.locator("footer").scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), { message: `Overflow on ${route} at ${width}px` }).toBeLessThanOrEqual(1);
      await expect(page.locator("body")).not.toContainText(/4[ -]tyre minimum|minimum (?:order of )?4 tyres/i);
    }
    expect(errors).toEqual([]);
  });
}

test("reduced motion keeps homepage content visible and stops decorative animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator("footer").scrollIntoViewIfNeeded();
  const infiniteAnimations = await page.evaluate(() => document.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations === Infinity && animation.playState === "running").length);
  expect(infiniteAnimations).toBe(0);
  await expect(page.getByRole("article").first()).toHaveCSS("opacity", "1");
});

test("homepage content remains visible without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("article").first()).toBeVisible();
    await expect(page.getByRole("article").first()).toHaveCSS("opacity", "1");
    await expect(page.locator("footer")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("revealed stock recovers after refresh and browser history navigation", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("article").first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveCSS("opacity", "1");
  await page.reload();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveCSS("opacity", "1");
  await page.goto("/tyres");
  await page.goBack();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveCSS("opacity", "1");
  await page.goForward();
  await expect(page.getByRole("article").first()).toBeVisible();
});
