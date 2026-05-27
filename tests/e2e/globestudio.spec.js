import { expect, test } from "@playwright/test";
import axeSource from "axe-core";

const waitForCanvas = async (page) => {
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(async () => canvas.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return node.width > 0 && node.height > 0 && rect.width > 100 && rect.height > 100;
    }), { timeout: 20_000 })
    .toBe(true);
  await expect
    .poll(async () => canvas.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return Math.round(rect.width * rect.height);
    }), { timeout: 20_000 })
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
  await page.addInitScript(() => {
    window.__globestudioDownloads = [];
    const originalCreateObjectUrl = URL.createObjectURL;
    URL.createObjectURL = function createObjectURL(value) {
      const href = originalCreateObjectUrl.call(this, value);
      if (value instanceof Blob) {
        window.__globestudioDownloads.push({
          download: "",
          href,
          type: value.type,
          size: value.size,
        });
      }
      return href;
    };
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click() {
      const last = window.__globestudioDownloads.at(-1);
      if (last && last.href === this.href) {
        last.download = this.download;
      } else {
        window.__globestudioDownloads.push({
          download: this.download,
          href: this.href,
        });
      }
      return originalClick.call(this);
    };
  });
  await page.goto("/");
  await waitForCanvas(page);
  await page.keyboard.press("d");
  await page.getByRole("button", { name: /export png/i }).click();

  await expect
    .poll(() => page.evaluate(() => window.__globestudioDownloads ?? []), { timeout: 15_000 })
    .toContainEqual(expect.objectContaining({
      href: expect.stringMatching(/^blob:/),
      size: expect.any(Number),
      type: "image/png",
    }));
  await expect(page.getByRole("button", { name: /PNG saved/i })).toBeVisible();
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
