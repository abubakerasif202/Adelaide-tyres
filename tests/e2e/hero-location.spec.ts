import { expect, test } from "@playwright/test";

const viewports = [[320, 800], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768], [1280, 800], [1440, 900]];

for (const [width, height] of viewports) {
  test(`hero and location at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      Object.assign(window, { qaCLS: 0 });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
          if (!shift.hadRecentInput) (window as Window & { qaCLS?: number }).qaCLS! += shift.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const tyre = page.locator(".hero-tyre-image");
    await expect(tyre).toBeVisible();
    await expect.poll(() => tyre.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.waitForTimeout(1600);
    const metrics = await page.evaluate(() => {
      const spinner = document.querySelector(".hero-tyre-spinner")!;
      const entrance = document.querySelector(".hero-tyre-entrance")!.getBoundingClientRect();
      const stage = document.querySelector(".hero-tyre-stage")!.getBoundingClientRect();
      return {
        font: getComputedStyle(document.querySelector("h1")!).fontSize,
        overflow: document.documentElement.scrollWidth > innerWidth,
        duration: getComputedStyle(spinner).animationDuration,
        centreOffset: Math.abs(entrance.x + entrance.width / 2 - stage.x - stage.width / 2),
        fits: entrance.width <= stage.width + 1 && entrance.height <= stage.height + 1,
        cls: (window as Window & { qaCLS?: number }).qaCLS,
      };
    });
    expect(metrics.overflow).toBe(false);
    expect(metrics.centreOffset).toBeLessThan(1);
    expect(metrics.fits).toBe(true);
    expect(metrics.duration).toBe(width < 768 ? "20s" : "14s");
    if (width < 640) expect(parseFloat(metrics.font)).toBeLessThan(60);
    const spinner = page.locator(".hero-tyre-spinner");
    const before = await spinner.evaluate(el => getComputedStyle(el).transform);
    await page.waitForTimeout(250);
    expect(await spinner.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
    await expect(page.locator(".hero__bay-name")).toContainText(/Ralson RMR61/i);
    await expect(page.locator(".hero__bay-price")).toContainText("$450");
    await page.screenshot({ path: testInfo.outputPath(`hero-${width}.png`) });
    await page.locator("#delivery").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);

    // The decorative radar graphic this section used to ship must stay gone.
    expect(await page.locator(".delivery-zone, .delivery-zone-panel__map, .delivery-zone-panel__hub").count()).toBe(0);
    // Exactly one Google Map on the page: the warehouse band owns it.
    expect(await page.locator("iframe[src*='google.com/maps']").count()).toBe(1);

    const frame = page.locator("#delivery iframe");
    await expect(frame).toHaveAttribute("loading", "lazy");
    await expect(frame).toHaveAttribute("title", /Adelaide Wholesale Tyres at 4 Birralee Rd/);
    const url = new URL((await frame.getAttribute("src"))!);
    expect(url.searchParams.get("q")).toBe("4 Birralee Rd, Regency Park SA 5010, Australia");

    const mapBox = (await frame.boundingBox())!;
    expect(mapBox.height).toBeGreaterThanOrEqual(320);
    if (width < 640) expect(mapBox.height).toBeLessThanOrEqual(380);
    // The iframe must actually fill its reserved frame -- a percentage height
    // against an auto-height parent silently collapses it to 150px.
    const frameBox = (await page.locator(".warehouse-map__frame").boundingBox())!;
    expect(Math.abs(mapBox.height - frameBox.height)).toBeLessThan(2);

    const directions = page.getByRole("link", { name: "Get directions", exact: true });
    expect(new URL((await directions.getAttribute("href"))!).searchParams.get("destination")).toBe(url.searchParams.get("q"));
    await expect(directions).toHaveAttribute("target", "_blank");
    await expect(page.getByRole("link", { name: "View delivery details" })).toBeVisible();

    // Delivery pricing stays readable and correctly tiered.
    await expect(page.locator(".warehouse-tier").nth(0)).toContainText("$50");
    await expect(page.locator(".warehouse-tier").nth(1)).toContainText("Free");
    await expect(page.locator(".warehouse-tier").nth(2)).toContainText("Free");

    // Stacked layout puts facts, then CTAs, then map, then the price strip.
    const yOf = async (sel: string) => (await page.locator(sel).boundingBox())!.y;
    const stacked = (await page.locator(".warehouse-card").boundingBox())!.y
      !== (await page.locator(".warehouse-map").boundingBox())!.y;
    if (stacked) {
      expect(await yOf(".warehouse-facts")).toBeLessThan(await yOf(".warehouse-actions"));
      expect(await yOf(".warehouse-actions")).toBeLessThan(await yOf(".warehouse-map__frame"));
      expect(await yOf(".warehouse-map__frame")).toBeLessThan(await yOf(".warehouse-tiers"));
    }

    await page.locator("#delivery").screenshot({ path: testInfo.outputPath(`warehouse-${width}.png`) });
    expect(errors).toEqual([]);
    console.log(JSON.stringify({ width, ...metrics, mapHeight: mapBox.height }));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    for (const selector of [".hero-tyre-spinner", ".hero-tyre-entrance", ".hero-tyre-rings", ".hero-tyre-ring", ".hero__title-phrase", ".hero__bay-image", ".warehouse-facts > *"]) {
      expect(await page.locator(selector).first().evaluate(el => getComputedStyle(el).animationName)).toBe("none");
    }
    await expect(tyre).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
    await page.locator(".hero__bay").click();
    await expect(page).toHaveURL(/\/tyres\/ralson-rmr61-295-80r22-5$/);
  });
}
