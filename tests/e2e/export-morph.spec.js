import { expect, test } from "@playwright/test";

// An export made right after a Flat/Globe switch must wait out the 1.7s
// morph and save the settled view, not a frame on the way.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;
const PNG_TIMEOUT = process.env.CI ? 45_000 : 30_000;

// Glow off (its blurs are slow in software GL) and autospin off, so the
// two exports below show the same still view.
const HOME_STILL = `/?c=${encodeURIComponent(JSON.stringify({ v: 1, globeSettings: { glow: false, autoSpinSpeed: 0 } }))}`;

// Keep every PNG the app hands to a download so the test can read it back.
const keepPngs = (page) =>
  page.addInitScript(() => {
    window.__pngs = [];
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      if (blob?.type === "image/png") window.__pngs.push(blob);
      return create(blob);
    };
  });

// Width over height of the lit dots in a saved PNG: about 2 for the flat
// map, about 1 for the globe, in between on the way. A zoom leaves it as is,
// so the tail of the camera's easing can't move it.
const litAspect = (page, index) =>
  page.evaluate(async (i) => {
    const bitmap = await createImageBitmap(window.__pngs[i]);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    let [left, right, top, bottom] = [width, -1, height, -1];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        if (data[index] + data[index + 1] + data[index + 2] < 3 * 160) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    return (right - left + 1) / (bottom - top + 1);
  }, index);

test("a PNG exported straight after a Flat/Globe switch is the settled view", async ({ page }) => {
  await keepPngs(page);
  await page.goto(HOME_STILL);
  const canvas = page.locator(".globe-background canvas");
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await expect
    .poll(() => canvas.evaluate((node) => node.width > 0 && typeof node.captureAtScale === "function"), { timeout: CANVAS_TIMEOUT })
    .toBe(true);
  await page.keyboard.press("d");
  const exportButton = page.getByRole("dialog", { name: /export/i }).getByRole("button", { name: /export png/i });
  await expect(exportButton).toBeEnabled();

  // G switches to Flat, then Export PNG a task later, the way two quick key
  // presses land: well inside the morph. One evaluate, so a janky software-GL
  // main thread can't stretch the gap past it.
  await exportButton.evaluate(async (button) => {
    document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "g", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve));
    button.click();
  });
  await expect(page.locator(".view-mode-switch")).toHaveAttribute("data-active", "flat");
  await expect.poll(() => page.evaluate(() => window.__pngs.length), { timeout: PNG_TIMEOUT }).toBe(1);

  // The same export once the morph has long landed.
  await page.waitForTimeout(2500);
  await exportButton.evaluate((button) => button.click());
  await expect.poll(() => page.evaluate(() => window.__pngs.length), { timeout: PNG_TIMEOUT }).toBe(2);

  expect(await litAspect(page, 0)).toBeCloseTo(await litAspect(page, 1), 1);
});
