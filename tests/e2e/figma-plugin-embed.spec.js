import { expect, test } from "@playwright/test";
import axeSource from "axe-core";

// The Figma plugin (figma-plugin/ui.html) iframes /embed?plugin=figma inside a
// 380x620 panel. These specs load that shell headless: the look, region and
// density pickers must show up, drive the render, and feed Insert. Plain
// /embed must stay canvas only.

const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;
const PANEL = { width: 380, height: 620 };

const waitForCanvas = async (page) => {
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await expect
    .poll(async () => canvas.evaluate((node) => node.width > 0 && node.getBoundingClientRect().width > 100), {
      timeout: CANVAS_TIMEOUT,
    })
    .toBe(true);
  return canvas;
};

// The plugin shell renders with preserveDrawingBuffer, so toDataURL returns
// the last frame. `static=1` stops the spin so a frame only changes when the
// settings do.
const frameSignature = (canvas) =>
  canvas.evaluate((node) => {
    const url = node.toDataURL("image/png");
    let hash = 0;
    for (let index = 0; index < url.length; index += 1) hash = (hash * 31 + url.charCodeAt(index)) | 0;
    return `${url.length}:${hash}`;
  });

// At top level window.parent is the page itself, so Insert's postMessage can
// be read back here in place of the plugin bridge.
const recordInserts = (page) =>
  page.evaluate(() => {
    window.__inserts = [];
    window.addEventListener("message", (event) => {
      if (event.data?.type !== "globestudio-insert") return;
      window.__inserts.push({
        presetName: event.data.presetName,
        bytes: event.data.bytes?.length ?? 0,
        dots: (event.data.svg?.match(/data-dot-id=/g) || []).length,
      });
    });
  });

const insertAndRead = async (page) => {
  const count = await page.evaluate(() => window.__inserts.length);
  await page.getByRole("button", { name: "Insert into Figma" }).click();
  await expect.poll(() => page.evaluate(() => window.__inserts.length), { timeout: CANVAS_TIMEOUT }).toBe(count + 1);
  return page.evaluate(() => window.__inserts.at(-1));
};

test("figma plugin embed shows look, region and density pickers plus Insert", async ({ page }) => {
  await page.setViewportSize(PANEL);
  await page.goto("/embed?plugin=figma&autoSpin=true");
  await waitForCanvas(page);

  const look = page.getByRole("combobox", { name: "Look" });
  await expect(look).toBeVisible();
  await expect(look).toHaveValue("default");
  await expect(look.locator("option")).toHaveCount(21);
  await expect(page.getByRole("button", { name: "Country or region: World" })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Density" })).toHaveValue("40");
  await expect(page.getByRole("button", { name: "Insert into Figma" })).toBeVisible();

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflows).toBe(false);

  await page.addScriptTag({ content: axeSource.source });
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return result.violations
      .filter((violation) => ["serious", "critical"].includes(violation.impact))
      .map((violation) => violation.id);
  });
  expect(violations).toEqual([]);
});

test("figma plugin pickers change the render and Insert sends what is shown", async ({ page }) => {
  await page.setViewportSize(PANEL);
  await page.goto("/embed?plugin=figma&static=1");
  const canvas = await waitForCanvas(page);
  await recordInserts(page);

  // Settle on a stable frame first, so a changed frame can only come from
  // the look change.
  let before = "";
  await expect
    .poll(async () => {
      const previous = before;
      await page.waitForTimeout(400);
      before = await frameSignature(canvas);
      return before === previous;
    }, { timeout: CANVAS_TIMEOUT })
    .toBe(true);
  const worldInsert = await insertAndRead(page);
  expect(worldInsert.presetName).toMatch(/Default$/);
  expect(worldInsert.bytes).toBeGreaterThan(0);
  expect(worldInsert.dots).toBeGreaterThan(0);

  await page.getByRole("combobox", { name: "Look" }).selectOption("halftone");
  await expect.poll(() => frameSignature(canvas), { timeout: CANVAS_TIMEOUT }).not.toBe(before);

  // Region, keyboard only: open, search, pick.
  await page.getByRole("button", { name: /^Country or region/ }).focus();
  await page.keyboard.press("Enter");
  const filter = page.getByLabel("Filter Country or region");
  await expect(filter).toBeFocused();
  await filter.pressSequentially("japan");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^Country or region: Japan/ })).toBeFocused();

  const density = page.getByRole("slider", { name: "Density" });
  await density.focus();
  await page.keyboard.press("ArrowRight");
  await expect(density).toHaveValue("41");

  const japanInsert = await insertAndRead(page);
  expect(japanInsert.presetName).toMatch(/Halftone$/);
  expect(japanInsert.bytes).toBeGreaterThan(0);
  expect(japanInsert.dots).toBeGreaterThan(0);
  expect(japanInsert.dots).toBeLessThan(worldInsert.dots);
});

test("figma plugin picks survive the Your colors reload", async ({ page }) => {
  await page.setViewportSize(PANEL);
  await page.goto("/embed?plugin=figma&autoSpin=true&cb=1");
  await waitForCanvas(page);
  await page.getByRole("combobox", { name: "Look" }).selectOption("risograph");
  await page.getByRole("button", { name: /^Country or region/ }).click();
  const filter = page.getByLabel("Filter Country or region");
  await expect(filter).toBeFocused();
  await filter.pressSequentially("brazil");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^Country or region: Brazil/ })).toBeVisible();

  // ui.html applies a file color by pointing the iframe at a new URL.
  await page.goto("/embed?plugin=figma&autoSpin=true&dotColor=ff3366&cb=2");
  await waitForCanvas(page);
  await expect(page.getByRole("combobox", { name: "Look" })).toHaveValue("risograph");
  await expect(page.getByRole("button", { name: /^Country or region: Brazil/ })).toBeVisible();
});

test("plain embed has no plugin pickers or Insert", async ({ page }) => {
  await page.goto("/embed?look=halftone");
  await waitForCanvas(page);
  await expect(page.locator(".embed-plugin-bar")).toHaveCount(0);
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(page.getByRole("button")).toHaveCount(0);
});
