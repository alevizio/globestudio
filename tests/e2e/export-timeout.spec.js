import { expect, test } from "@playwright/test";

// A hi-res PNG capture that times out on a slow device ("captureAtScale
// toBlob timed out" in launch week) still saves a PNG: the fallback drops
// to Draft size (1×) instead of upscaling the live canvas to the same N×
// size, an encode just as heavy on that device.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;
// The capture's own 8 s watchdog (or App's 12 s wait) runs out first.
const PNG_TIMEOUT = process.env.CI ? 90_000 : 45_000;
// Glow off, as in the other PNG tests: its blurs take seconds per frame in
// software compositing, and this test already waits out a timeout.
const HOME_NO_GLOW = `/?c=${encodeURIComponent(JSON.stringify({ v: 1, globeSettings: { glow: false } }))}`;

test("a hi-res PNG capture that times out still saves a PNG, at Draft size", async ({ page }) => {
  await page.addInitScript(() => {
    // Keep every PNG the app hands to a download so the test can read it back.
    window.__pngs = [];
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      if (blob?.type === "image/png") window.__pngs.push(blob);
      return create(blob);
    };
    // A slow device: the globe canvas's toBlob, which encodes the N× capture,
    // never calls back, so the capture times out.
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (...args) {
      if (this.dataset.engine?.startsWith("three.js")) return;
      toBlob.apply(this, args);
    };
  });
  await page.goto(HOME_NO_GLOW);
  const canvas = page.locator(".globe-background canvas");
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await expect
    .poll(() => canvas.evaluate((node) => node.width > 0 && typeof node.captureAtScale === "function"), { timeout: CANVAS_TIMEOUT })
    .toBe(true);
  // Draft (1×) is the canvas's CSS size; Standard, the dialog's default and
  // the quality exported here, is twice that.
  const draft = await canvas.evaluate((node) => ({ width: node.clientWidth, height: node.clientHeight }));

  await page.keyboard.press("d");
  const dialog = page.getByRole("dialog", { name: /export/i });
  await dialog.getByRole("button", { name: /export png/i }).click();
  await expect.poll(() => page.evaluate(() => window.__pngs.length), { timeout: PNG_TIMEOUT }).toBe(1);
  // The status line the screen reader hears, which outlasts the button's
  // short "PNG saved" flash, and no error line.
  await expect(page.getByRole("status").filter({ hasText: "PNG saved" })).toHaveCount(1);
  await expect(dialog.getByText("Export failed.", { exact: false })).toHaveCount(0);

  const saved = await page.evaluate(async () => {
    const bitmap = await createImageBitmap(window.__pngs[0]);
    return { width: bitmap.width, height: bitmap.height };
  });
  expect(saved).toEqual(draft);
});
