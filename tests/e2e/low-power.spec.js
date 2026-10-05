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

// A real but slow GPU: the frame rate watch turns low power mode on in the
// middle of a visit. The automated browser hides both ways in (it sets
// navigator.webdriver and names its SwiftShader renderer), so this undoes
// that and drives the clock the render loop reads: each real frame moves it
// on by window.__frameStep ms, which sets the frame rate the globe measures.
test.describe("when a slow GPU turns low power mode on mid-visit", () => {
  test.use({ viewport: { width: 480, height: 360 }, deviceScaleFactor: 1.25 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "webdriver", { configurable: true, get: () => false });
      for (const Context of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
        const getExtension = Context?.prototype.getExtension;
        if (!getExtension) continue;
        Context.prototype.getExtension = function (name) {
          return name === "WEBGL_debug_renderer_info" ? null : getExtension.call(this, name);
        };
      }
      const requestFrame = window.requestAnimationFrame.bind(window);
      let lastFrame = null;
      let now = performance.now();
      window.__frameStep = 70;
      window.__frames = 0;
      window.requestAnimationFrame = (callback) =>
        requestFrame((frameTime) => {
          if (frameTime !== lastFrame) {
            lastFrame = frameTime;
            now += window.__frameStep;
            window.__frames += 1;
          }
          callback(now);
        });
      performance.now = () => now;
    });
  });

  test("the preview stays at one device pixel when the adaptive ratio had already stepped down", async ({ page }) => {
    test.setTimeout(240_000);
    // Glow off keeps the costly halo out of the software renderer.
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 2, globeSettings: { glow: false } }))}`);
    const canvas = page.locator(".globe-background canvas");
    await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
    const pixelRatio = () => canvas.evaluate((node) => node.width / node.clientWidth);
    const setFrameStep = (ms) => page.evaluate((step) => (window.__frameStep = step), ms);
    const frames = () => page.evaluate(() => window.__frames);
    expect(await pixelRatio()).toBe(1.25);

    // Held down, the globe renders every frame. At about 14 fps the adaptive
    // ratio steps down to 1, and the watch, which trips under 12 fps, waits.
    await canvas.hover({ position: { x: 240, y: 220 } });
    await page.mouse.down();
    await expect.poll(pixelRatio, { timeout: 120_000 }).toBe(1);

    // At 4 fps the watch trips and low power mode turns on.
    await setFrameStep(250);
    await expect(page.getByRole("status").filter({ hasText: NOTICE })).toBeVisible({ timeout: 120_000 });

    // At 100 fps the adaptive ratio would recover, but only up to the low
    // power ceiling of 1. Two of its 60 frame windows is enough to see it.
    await setFrameStep(10);
    const start = await frames();
    await expect.poll(frames, { timeout: 120_000 }).toBeGreaterThan(start + 150);
    expect(await pixelRatio()).toBe(1);
    await page.mouse.up();
  });
});

// Held sideways, the phone layout leaves a short strip of globe between the
// top bar and the open sheet, so the notice keeps to the top right corner
// under Export instead of spanning that strip.
test.describe("in low power mode on a phone held sideways", () => {
  test.use({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("globestudio:lowPower", JSON.stringify("on"));
      localStorage.setItem("globestudio:panelCollapsed", JSON.stringify(false));
    });
  });

  test("the notice sits under Export, clear of the open sheet", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".globe-background canvas")).toBeVisible({ timeout: CANVAS_TIMEOUT });
    const notice = page.getByRole("status").filter({ hasText: NOTICE });
    const sheet = page.locator(".control-rail");
    await expect(notice).toBeVisible();
    const settled = (locator) => locator.evaluate((node) => Promise.all(node.getAnimations().map((a) => a.finished)));
    await settled(notice);
    await settled(sheet);

    const box = await notice.boundingBox();
    const exportButton = await page.locator(".top-bar-export").boundingBox();
    const sheetBox = await sheet.boundingBox();
    expect(box.width).toBeLessThanOrEqual(320);
    expect(Math.abs(box.x + box.width - (exportButton.x + exportButton.width))).toBeLessThan(1);
    expect(box.y).toBeGreaterThanOrEqual(exportButton.y + exportButton.height);
    expect(box.y + box.height).toBeLessThanOrEqual(sheetBox.y);
  });
});
