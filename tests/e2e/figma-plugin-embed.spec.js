import { expect, test } from "@playwright/test";
import axeSource from "axe-core";

// The Figma plugin (figma-plugin/ui.html) iframes /embed?plugin=figma inside a
// 380x620 panel. These specs load that shell headless: the look, region,
// density and view pickers must show up, drive the render, and feed Insert.
// Plain /embed must stay canvas only.

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
        svg: typeof event.data.svg === "string",
        // Counted the way figma-plugin/code.js counts before its 2,500 limit.
        dots: (event.data.svg?.match(/data-dot-id=/g) || []).length,
        // The PNG hashed like frameSignature, to compare with a canvas frame.
        frame: (() => {
          let binary = "";
          for (let index = 0; index < event.data.bytes.length; index += 0x8000) {
            binary += String.fromCharCode(...event.data.bytes.subarray(index, index + 0x8000));
          }
          const url = `data:image/png;base64,${btoa(binary)}`;
          let hash = 0;
          for (let index = 0; index < url.length; index += 1) hash = (hash * 31 + url.charCodeAt(index)) | 0;
          return `${url.length}:${hash}`;
        })(),
      });
    });
  });

// The line above Insert that says what Insert adds. The Density readout is
// an <output>, also a status, so match on the text.
const insertNote = (page) => page.getByRole("status").filter({ hasText: /insert/i });

// Before the View toggle the bar was 242px tall in this panel (top at 378px)
// and the globe sat fully above the picker labels. View and the note must fit
// in that height; the slack only absorbs font metrics on other machines.
const BAR_MAX_HEIGHT = 242 + 4;
const barTop = (page) => page.locator(".embed-plugin-bar").evaluate((node) => node.getBoundingClientRect().top);

const insertAndRead = async (page) => {
  const count = await page.evaluate(() => window.__inserts.length);
  await page.getByRole("button", { name: "Insert into Figma" }).click();
  await expect.poll(() => page.evaluate(() => window.__inserts.length), { timeout: CANVAS_TIMEOUT }).toBe(count + 1);
  return page.evaluate(() => window.__inserts.at(-1));
};

test("figma plugin embed shows look, region, density and view pickers plus Insert", async ({ page }) => {
  await page.setViewportSize(PANEL);
  await page.goto("/embed?plugin=figma&autoSpin=true");
  await waitForCanvas(page);

  const look = page.getByRole("combobox", { name: "Look" });
  await expect(look).toBeVisible();
  await expect(look).toHaveValue("default");
  await expect(look.locator("option")).toHaveCount(21);
  await expect(page.getByRole("button", { name: "Country or region: World" })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Density" })).toHaveValue("40");
  await expect(page.getByRole("group", { name: "View" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Globe", pressed: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Flat", pressed: false })).toBeVisible();
  await expect(insertNote(page)).toHaveText("Inserts a PNG of the globe.");
  await expect(page.getByRole("button", { name: "Insert into Figma" })).toBeVisible();
  expect(await barTop(page)).toBeGreaterThanOrEqual(PANEL.height - BAR_MAX_HEIGHT);

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

test("figma plugin pickers change the render and Insert sends the picked look and region", async ({ page }) => {
  await page.setViewportSize(PANEL);
  await page.goto("/embed?plugin=figma&static=1");
  const canvas = await waitForCanvas(page);
  await recordInserts(page);
  // Flat, so Insert carries the SVG and its dot count shows the picked region.
  await page.getByRole("button", { name: "Flat" }).click();

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
  expect(worldInsert.svg).toBe(true);
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

test("figma plugin Globe and Flat toggle changes the preview and only Flat sends the SVG", async ({ page }) => {
  await page.setViewportSize(PANEL);
  await page.goto("/embed?plugin=figma&static=1");
  const canvas = await waitForCanvas(page);
  await recordInserts(page);
  const globe = page.getByRole("button", { name: "Globe" });
  const flat = page.getByRole("button", { name: "Flat" });

  let globeFrame = "";
  await expect
    .poll(async () => {
      const previous = globeFrame;
      await page.waitForTimeout(400);
      globeFrame = await frameSignature(canvas);
      return globeFrame === previous;
    }, { timeout: CANVAS_TIMEOUT })
    .toBe(true);
  await expect(globe).toHaveAttribute("aria-pressed", "true");
  await expect(insertNote(page)).toHaveText("Inserts a PNG of the globe.");
  // Every note is one line, so the bar never moves when the outcome changes.
  const globeBarTop = await barTop(page);
  expect(globeBarTop).toBeGreaterThanOrEqual(PANEL.height - BAR_MAX_HEIGHT);
  const globeInsert = await insertAndRead(page);
  expect(globeInsert.bytes).toBeGreaterThan(0);
  expect(globeInsert.svg).toBe(false);

  // Keyboard only: focus Flat and press it.
  await flat.focus();
  await page.keyboard.press("Space");
  await expect(flat).toHaveAttribute("aria-pressed", "true");
  await expect(globe).toHaveAttribute("aria-pressed", "false");
  await expect(insertNote(page)).toHaveText("Inserts the flat map as editable vectors.");
  expect(await barTop(page)).toBe(globeBarTop);
  await expect.poll(() => frameSignature(canvas), { timeout: CANVAS_TIMEOUT }).not.toBe(globeFrame);
  const flatInsert = await insertAndRead(page);
  expect(flatInsert.bytes).toBeGreaterThan(0);
  expect(flatInsert.svg).toBe(true);
  // The default World at density 40 (1,365 dots today) stays within the
  // plugin's vector limit.
  expect(flatInsert.dots).toBeGreaterThan(0);
  expect(flatInsert.dots).toBeLessThanOrEqual(2500);

  // Past 2,500 dots code.js inserts the PNG instead. Insert still sends the
  // SVG (code.js counts its dots) and the note says what will land.
  const density = page.getByRole("slider", { name: "Density" });
  await density.focus();
  await page.keyboard.press("End");
  await expect(density).toHaveValue("90");
  await expect(insertNote(page)).toHaveText("Inserts a PNG. Lower the density for vectors.");
  expect(await barTop(page)).toBe(globeBarTop);
  const denseInsert = await insertAndRead(page);
  expect(denseInsert.svg).toBe(true);
  expect(denseInsert.dots).toBeGreaterThan(2500);

  // Insert straight after the switch, well inside the 1.7s morph back to
  // the globe. It has to wait the morph out and capture the settled globe,
  // not the flat map or a frame on the way.
  await globe.focus();
  await page.keyboard.press("Enter");
  await expect(globe).toHaveAttribute("aria-pressed", "true");
  await expect(insertNote(page)).toHaveText("Inserts a PNG of the globe.");
  const backInsert = await insertAndRead(page);
  expect(backInsert.svg).toBe(false);
  expect(backInsert.dots).toBe(0);
  let settledFrame = "";
  await expect
    .poll(async () => {
      const previous = settledFrame;
      await page.waitForTimeout(400);
      settledFrame = await frameSignature(canvas);
      return settledFrame === previous;
    }, { timeout: CANVAS_TIMEOUT })
    .toBe(true);
  expect(backInsert.frame).toBe(settledFrame);
});

test("figma plugin picks survive the Your colors reload", async ({ page }) => {
  await page.setViewportSize(PANEL);
  await page.goto("/embed?plugin=figma&autoSpin=true&cb=1");
  await waitForCanvas(page);
  await page.getByRole("combobox", { name: "Look" }).selectOption("risograph");
  await page.getByRole("button", { name: "Flat" }).click();
  await page.getByRole("button", { name: /^Country or region/ }).click();
  const filter = page.getByLabel("Filter Country or region");
  await expect(filter).toBeFocused();
  // The list spans the bar, so no region name is cut short in the panel.
  const list = await page.locator(".searchable-select-popover").evaluate((node) => ({
    left: node.getBoundingClientRect().left,
    right: node.getBoundingClientRect().right,
    cut: [...node.querySelectorAll("[role=option]")].filter((option) => option.scrollWidth > option.clientWidth + 1).length,
  }));
  expect(list.left).toBeGreaterThanOrEqual(0);
  expect(list.right).toBeLessThanOrEqual(PANEL.width);
  expect(list.cut).toBe(0);
  await filter.pressSequentially("brazil");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^Country or region: Brazil/ })).toBeVisible();

  // ui.html applies a file color by pointing the iframe at a new URL.
  await page.goto("/embed?plugin=figma&autoSpin=true&dotColor=ff3366&cb=2");
  await waitForCanvas(page);
  await expect(page.getByRole("combobox", { name: "Look" })).toHaveValue("risograph");
  await expect(page.getByRole("button", { name: /^Country or region: Brazil/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Flat", pressed: true })).toBeVisible();
});

test("plain embed has no plugin pickers or Insert", async ({ page }) => {
  await page.goto("/embed?look=halftone");
  await waitForCanvas(page);
  await expect(page.locator(".embed-plugin-bar")).toHaveCount(0);
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(page.getByRole("button")).toHaveCount(0);
});
