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

test("PNG export creates a blob download link", async ({ page }) => {
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

  // Assert the app's persistent aria-live success announcement — not the
  // transient "PNG saved" CTA state, which the app resets after 1.8 s and an
  // in-suite poll can miss. It's set only after a real PNG blob reaches
  // downloadBlob(). The old test monkey-patched URL.createObjectURL /
  // anchor.click, which raced downloadBlob()'s synchronous revokeObjectURL and
  // recorded nothing. captureAtScale → SwiftShader → toBlob is slow on CI.
  await expect(page.locator('.visually-hidden[role="status"]'))
    .toHaveText(/PNG saved/i, { timeout: process.env.CI ? 45_000 : 30_000 });
});

test("mobile home does not overflow horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitForCanvas(page);
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow).toBe(false);
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
