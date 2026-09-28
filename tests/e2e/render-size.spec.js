import { expect, test } from "@playwright/test";

// The globe's render targets must come back to their own size after a
// hi-res PNG capture. EffectComposer applies its own pixel ratio, so a
// restore that passed device pixels left the live preview rendering the
// scene at DPR² (2.4x the pixels on a Retina window) until the next resize.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;

test.use({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 2 });

test("a hi-res capture leaves the live preview at its own render size", async ({ page }) => {
  // Every WebGL viewport the page switches to (three.js only sets one when
  // the size changes, so a composer target the canvas's size adds none) and
  // the draw calls, to know frames were drawn at all.
  await page.addInitScript(() => {
    const seen = { sizes: new Set(), draws: 0 };
    window.__gl = seen;
    const proto = WebGL2RenderingContext.prototype;
    const { viewport, drawArrays, drawElements } = proto;
    proto.viewport = function (x, y, width, height) {
      seen.sizes.add(`${Math.round(width)}x${Math.round(height)}`);
      return viewport.call(this, x, y, width, height);
    };
    proto.drawArrays = function (...args) {
      seen.draws += 1;
      return drawArrays.apply(this, args);
    };
    proto.drawElements = function (...args) {
      seen.draws += 1;
      return drawElements.apply(this, args);
    };
  });
  await page.goto("/");
  const canvas = page.locator(".globe-background canvas");
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.hasAttribute("data-globe-painted")), { timeout: CANVAS_TIMEOUT })
    .toBe(true);

  const sizesOverFrames = async () => {
    await page.evaluate(() => {
      window.__gl.sizes.clear();
      window.__gl.draws = 0;
    });
    await page.waitForTimeout(3000);
    const { sizes, draws } = await page.evaluate(() => ({ sizes: [...window.__gl.sizes].sort(), draws: window.__gl.draws }));
    expect(draws).toBeGreaterThan(0);
    return sizes;
  };
  const before = await sizesOverFrames();

  // Software GL can starve toBlob, in which case the watchdog restores the
  // renderer and rejects; either way the restore path has run.
  await canvas.evaluate((node) => node.captureAtScale(2).catch(() => null));
  expect(await sizesOverFrames()).toEqual(before);
});
