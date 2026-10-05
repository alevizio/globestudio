import { expect, test } from "@playwright/test";

// The Flat view's Solid sheet frames a picked country or US state the way its
// dots are framed, instead of drawing it small in a sheet framed for the whole
// world. Reads the flat sheet's pixels rather than the WebGL frame, so it
// doesn't depend on where the camera points. The sheets come after the 1:50m
// atlas loads, which on a cold CI dev server took about 66 s.
const TEXTURE_TIMEOUT = process.env.CI ? 150_000 : 30_000;

const flatSolid = (config) => `/?c=${encodeURIComponent(JSON.stringify({
  v: 1,
  renderMode: "solid",
  viewMode: "flat",
  // Glow off: the halo is slow under software GL and isn't part of the sheet.
  globeSettings: { glow: false },
  ...config,
}))}`;

// The bounding box, in sheet pixels, of everything drawn on the newest flat
// sheet: 2048 wide, like the globe's, which is 1024 high.
const readFlatSheet = (page) =>
  page.evaluate(() => {
    const flat = window.__canvases.filter((node) => node.width === 2048 && node.height !== 1024).at(-1);
    if (!flat) return null;
    const { data } = flat.getContext("2d").getImageData(0, 0, flat.width, flat.height);
    let land = null;
    for (let y = 0; y < flat.height; y += 1) {
      for (let x = 0; x < flat.width; x += 1) {
        if (data[(y * flat.width + x) * 4 + 3] >= 128) {
          land = land ?? { minX: x, minY: y, maxX: x, maxY: y };
          land.minX = Math.min(land.minX, x);
          land.minY = Math.min(land.minY, y);
          land.maxX = Math.max(land.maxX, x);
          land.maxY = Math.max(land.maxY, y);
        }
      }
    }
    return land && { width: flat.width, height: flat.height, land };
  });

const openFlatSheet = async (page, config) => {
  await page.addInitScript(() => {
    window.__canvases = [];
    const create = Document.prototype.createElement;
    Document.prototype.createElement = function createElement(tag, ...rest) {
      const element = create.call(this, tag, ...rest);
      if (String(tag).toLowerCase() === "canvas") window.__canvases.push(element);
      return element;
    };
  });
  await page.goto(flatSolid(config));
  await expect.poll(async () => Boolean(await readFlatSheet(page)), { timeout: TEXTURE_TIMEOUT }).toBe(true);
  return readFlatSheet(page);
};

// How much of the framed area the land spans along its longer side, as a
// share. The other side keeps the slack the fit leaves.
const span = ({ width, height, land }, margin = 0) => Math.max(
  (land.maxX - land.minX + 1) / (width - 2 * margin),
  (land.maxY - land.minY + 1) / (height - 2 * margin),
);

test("the Flat view's Solid sheet frames a picked country to its box", async ({ page }) => {
  const sheet = await openFlatSheet(page, { selection: "country:BRA" });
  // Brazil's islands and the 1:50m coast reach a little past dotted-map's box.
  expect(span(sheet)).toBeGreaterThan(0.97);
});

test("the Flat view's Solid sheet frames a picked US state like its dots", async ({ page }) => {
  const sheet = await openFlatSheet(page, { selection: "country:USA", stateSelection: "CA" });
  // The state's dots keep a 28 px margin in a 1000 px sheet (dot-generation.js).
  const margin = (28 / 1000) * sheet.width;
  const slack = 3;
  expect(sheet.land.minX).toBeGreaterThan(margin - slack);
  expect(sheet.land.minY).toBeGreaterThan(margin - slack);
  expect(sheet.land.maxX).toBeLessThan(sheet.width - margin + slack);
  expect(sheet.land.maxY).toBeLessThan(sheet.height - margin + slack);
  expect(span(sheet, margin)).toBeGreaterThan(0.99);
});
