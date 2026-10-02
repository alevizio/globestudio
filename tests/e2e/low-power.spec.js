import { expect, test } from "@playwright/test";

// Low power mode (App.jsx) drops the canvas halo and previews at one device
// pixel. The automated browser never turns it on by itself (it skips the
// detection when navigator.webdriver is set), so the saved setting forces it.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;
const NOTICE = "Effects reduced so the globe runs faster on this device.";

test.describe("in low power mode on a 1.5x screen", () => {
  test.use({ deviceScaleFactor: 1.5 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("globestudio:lowPower", JSON.stringify("on"));
    });
  });

  test("the halo is off, the notice shows and its button brings the effects back", async ({ page }) => {
    await page.goto("/");
    const canvas = page.locator(".globe-background canvas");
    await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
    const filter = () => canvas.evaluate((node) => getComputedStyle(node).filter);
    const pixelRatio = () => canvas.evaluate((node) => node.width / node.clientWidth);

    expect(await filter()).toBe("none");
    await expect.poll(pixelRatio).toBe(1);
    const notice = page.getByRole("status").filter({ hasText: NOTICE });
    await expect(notice).toBeVisible();

    // Its entrance slide stops for visitors who ask for reduced motion.
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await notice.evaluate((node) => getComputedStyle(node).animationName)).toBe("none");

    await notice.getByRole("button", { name: "Turn effects back on" }).click();
    await expect(notice).toBeHidden();
    await expect.poll(filter).toContain("drop-shadow");
    await expect.poll(pixelRatio).toBe(1.5);
    expect(await page.evaluate(() => localStorage.getItem("globestudio:lowPower"))).toBe(JSON.stringify("off"));
  });
});
