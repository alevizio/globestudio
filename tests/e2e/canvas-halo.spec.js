import { expect, test } from "@playwright/test";

// WebKit at DPR 3 draws the globe blank under the drop-shadow halo, so
// App.jsx drops it on dense or touch screens. Chromium can't show the blank
// itself; these pin the guard on both sides. Kept in its own file with the
// guard's commit, so both can be dropped together.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;

const canvasFilter = async (page) => {
  const canvas = page.locator(".globe-background canvas");
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  return canvas.evaluate((node) => getComputedStyle(node).filter);
};

test("the canvas halo stays on a desktop screen", async ({ page }) => {
  await page.goto("/");
  expect(await canvasFilter(page)).toContain("drop-shadow");
});

// Aurora's starfield makes the canvas opaque, which hides a halo painted
// behind it; App.jsx drops the (costly, invisible) filter there.
test("the canvas halo is dropped behind an opaque starfield", async ({ page }) => {
  await page.goto("/looks/aurora");
  await canvasFilter(page);
  await expect.poll(() => canvasFilter(page)).toBe("none");
});

test.describe("on a DPR 3 phone", () => {
  test.use({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

  test("the canvas halo is skipped", async ({ page }) => {
    await page.goto("/");
    expect(await canvasFilter(page)).toBe("none");
  });
});
