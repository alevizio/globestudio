import { expect, test } from "@playwright/test";
import axeSource from "axe-core";

// First paint compiles the three.js graph through the dev server and warms up
// the swiftshader renderer, which is slow on CI — allow extra headroom there.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;

const waitForCanvas = async (page) => {
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await expect
    .poll(async () => canvas.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return node.width > 0 && node.height > 0 && rect.width > 100 && rect.height > 100;
    }), { timeout: CANVAS_TIMEOUT })
    .toBe(true);
  await expect
    .poll(async () => canvas.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return Math.round(rect.width * rect.height);
    }), { timeout: CANVAS_TIMEOUT })
    .toBeGreaterThan(10_000);
  const box = await canvas.boundingBox();
  expect(box.width).toBeGreaterThan(100);
  expect(box.height).toBeGreaterThan(100);
  return canvas;
};

const expectNoSeriousAxeViolations = async (page) => {
  await page.addScriptTag({ content: axeSource.source });
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return result.violations
      .filter((violation) => ["serious", "critical"].includes(violation.impact))
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.map((node) => node.target.join(" ")),
      }));
  });
  expect(violations).toEqual([]);
};

test("home renders the globe canvas", async ({ page }) => {
  await page.goto("/");
  await waitForCanvas(page);
  await expect(page.getByRole("heading", { name: /dotted maps and globe generator/i })).toBeVisible();
});

test("preset routes apply the requested look", async ({ page }) => {
  await page.goto("/looks/halftone");
  await waitForCanvas(page);
  await expect(page.getByText(/Applied Halftone/i)).toBeVisible();
});

test("embed route renders canvas-only output", async ({ page }) => {
  await page.goto("/embed?look=halftone&density=60&autoSpin=1");
  await waitForCanvas(page);
  await expect(page.locator(".control-rail")).toHaveCount(0);
  await expect(page.locator(".looks-bar")).toHaveCount(0);
});

test("keyboard shortcuts expose core workflows", async ({ page }) => {
  await page.goto("/");
  await waitForCanvas(page);

  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeVisible();
  const shortcutsDialog = page.getByRole("dialog", { name: /keyboard shortcuts/i });
  await page.keyboard.press("Escape");
  await expect(shortcutsDialog).toBeHidden();

  await page.keyboard.press("d");
  await expect(page.getByRole("dialog", { name: /export/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /export/i })).toBeHidden();

  await page.keyboard.press("g");
  await expect(page.getByText(/Switched to flat view/i)).toBeVisible();
  await page.keyboard.press("s");
  await expect(page.getByText(/Shuffled to/i)).toBeVisible();
});

test("PNG export announces 'PNG saved' via the aria-live status region", async ({ page }) => {
  await page.goto("/");
  await waitForCanvas(page);
  await page.keyboard.press("d");
  const exportButton = page.getByRole("button", { name: /export png/i });
  await expect(exportButton).toBeVisible();
  await expect(exportButton).toBeEnabled();

  // The globe repaints every frame behind the modal, so a normal click stalls
  // on the actionability "stable" check, and a forced click still waits on
  // page responsiveness (it can hang when software-GL rendering janks the main
  // thread). Trigger the React handler directly in-page with neither wait.
  await exportButton.evaluate((el) => el.click());

  // Assert the aria-live status region (bound to `statusMessage` in App.jsx),
  // which flashPngSaved() sets to "PNG saved" after a real PNG blob reaches
  // downloadBlob(). This text is NEVER cleared by a timer — only the button's
  // separate `pngStatus` CTA resets to "idle" after 1.8 s — so it's stable to
  // assert here even under slow CI software-GL captures. (Contract: if a future
  // change adds a timer that clears `statusMessage`, this assertion will start
  // flaking.) The old test monkey-patched URL.createObjectURL / anchor.click,
  // which raced downloadBlob()'s synchronous revokeObjectURL and recorded
  // nothing. captureAtScale → SwiftShader → toBlob is slow on CI.
  await expect(page.locator('.visually-hidden[role="status"]'))
    .toHaveText(/PNG saved/i, { timeout: process.env.CI ? 45_000 : 30_000 });
});

test("a PNG export that yields no image says so in the dialog", async ({ page }) => {
  await page.goto("/");
  await waitForCanvas(page);
  await page.evaluate(() => {
    // Hi-res capture fails, then the Canvas2D fallback gets no context, the
    // way iOS answers a canvas over its area limit at High and Ultra.
    const globe = [...document.querySelectorAll("canvas")]
      .find((node) => typeof node.captureAtScale === "function");
    Object.defineProperty(globe, "captureAtScale", {
      configurable: true,
      get: () => () => Promise.reject(new Error("capture failed in test")),
      set: () => {},
    });
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (type === "2d" && !this.isConnected) return null;
      return getContext.call(this, type, ...rest);
    };
  });
  await page.keyboard.press("d");
  const dialog = page.getByRole("dialog", { name: /export/i });
  const exportButton = dialog.getByRole("button", { name: /export png/i });
  await expect(exportButton).toBeEnabled();
  // Same in-page click as the test above: the repainting globe stalls a normal click.
  await exportButton.evaluate((el) => el.click());
  await expect(dialog.getByRole("alert")).toHaveText(/Export failed/);
  await expect(page.locator('.visually-hidden[role="status"]')).not.toHaveText(/PNG saved/i);
  await expect(exportButton).toBeEnabled();

  // Closing the dialog clears the message; it doesn't greet the next visit.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.keyboard.press("d");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
});

test.describe("with reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  // Share of pixels that differ between two PNG frames, decoded in the page.
  const changedShare = (page, a, b) =>
    page.evaluate(async ([first, second]) => {
      const pixels = async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0);
        return context.getImageData(0, 0, img.width, img.height).data;
      };
      const [p, q] = [await pixels(first), await pixels(second)];
      let changed = 0;
      for (let i = 0; i < p.length; i += 4) {
        if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 12) changed += 1;
      }
      return changed / (p.length / 4);
    }, [a.toString("base64"), b.toString("base64")]);

  // Animated, Glitch and Bad TV change about 12% of the canvas every
  // second. Frozen, the frame settles once the camera's easing ends. (Aurora
  // runs on the same uTime path but takes most of a minute to draw under
  // swiftshader, so it is left out.)
  for (const look of ["glitch", "badtv"]) {
    test(`the ${look} look holds still`, async ({ page }) => {
      await page.goto(`/looks/${look}`);
      await waitForCanvas(page);
      const canvas = page.locator(".globe-background canvas");
      await expect
        .poll(async () => {
          const first = await canvas.screenshot();
          await page.waitForTimeout(1000);
          const second = await canvas.screenshot();
          return changedShare(page, first, second);
        }, { timeout: CANVAS_TIMEOUT, intervals: [0] })
        .toBeLessThan(0.005);
    });
  }
});

test("mobile home does not overflow horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitForCanvas(page);
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow).toBe(false);
});

test.describe("on a phone with the sheet collapsed", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("the visible sheet is in the accessibility tree", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await expect(page.locator(".control-rail")).toHaveClass(/is-collapsed/);
    // getByRole skips anything under aria-hidden, like a screen reader does.
    await expect(page.getByRole("button", { name: "Open export dialog" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Expand options panel" })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test("chrome faded out with the panel takes no keyboard focus", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    const invisibleStops = [];
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      const stop = await page.evaluate(() => {
        const el = document.activeElement;
        let opacity = 1;
        for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
          opacity *= Number(getComputedStyle(node).opacity);
        }
        return { label: el?.getAttribute("aria-label") || el?.textContent?.trim().slice(0, 30), opacity };
      });
      if (stop.opacity < 0.1) invisibleStops.push(stop.label);
    }
    expect(invisibleStops).toEqual([]);
  });
});

test.describe("on a short phone screen", () => {
  // iPhone 14's Safari viewport.
  test.use({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });

  test("Export PNG is on screen and clickable without scrolling the dialog", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Open export dialog" }).click();
    await expect(page.getByRole("dialog", { name: /export/i })).toBeVisible();
    const cta = page.getByRole("button", { name: /export png/i });
    await expect(cta).toBeVisible();
    const reachable = await cta.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return rect.bottom <= window.innerHeight && Boolean(hit && el.contains(hit));
    });
    expect(reachable).toBe(true);
  });
});

for (const path of ["/", "/docs", "/brand", "/privacy"]) {
  test(`axe has no serious violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    if (path === "/") await waitForCanvas(page);
    await expectNoSeriousAxeViolations(page);
  });
}

test("axe passes with export modal open and focus returns on close", async ({ page }) => {
  await page.goto("/");
  await waitForCanvas(page);
  const trigger = page.getByRole("button", { name: /export/i }).first();
  await trigger.focus();
  await trigger.press("Enter");
  await expect(page.getByRole("dialog", { name: /export/i })).toBeVisible();
  await expectNoSeriousAxeViolations(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /export/i })).toBeHidden();
  await expect(trigger).toBeFocused();
});
