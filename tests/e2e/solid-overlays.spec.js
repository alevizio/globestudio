import { expect, test } from "@playwright/test";

// Solid mode with South America picked: rivers and cities stay on its land
// instead of covering the whole world. Reads the two textures the Solid view
// draws (the globe's 2048x1024 sheet and the flat map's region sheet) rather
// than the WebGL frame, so it doesn't depend on where the camera points.
// They come after the 1:50m atlas loads, which on a cold CI dev server took
// about 66 s in the Playwright image; the test timeout there is 240 s.
const TEXTURE_TIMEOUT = process.env.CI ? 150_000 : 30_000;

const SOUTH_AMERICA_SOLID = `/?c=${encodeURIComponent(JSON.stringify({
  v: 1,
  selection: "continent:South America",
  renderMode: "solid",
  // The default fill, pinned so the land stays gray for the hue test below.
  worldFill: "#5a5a64",
  riversVisible: true,
  citiesVisible: true,
  // Glow off: the halo is slow under software GL and isn't part of the texture.
  globeSettings: { glow: false },
}))}`;

// Clip edges and coastline pixels are antialiased, so a box may reach a few
// pixels past the land's box and still be on the land.
const SLACK = 3;
// A city centred on the land draws its whole dot, so on a coast the dot may
// reach past the land by its radius, which is 10 px at most.
const CITY_SLACK = 10;

// Bounding boxes, in texture pixels, of the land and of the rivers and cities
// on the newest globe and flat textures. The land is gray, its channels within
// 14 of each other: its fill and its near white borders, which keep small
// islands like the Galapagos visible. Rivers are blue and cities yellow; where
// a city's edge blends into a river the channels still spread 22 or more, so
// overlays never count as land. Faint pixels are skipped: their colors are too
// coarse to read.
const readTextures = (page) =>
  page.evaluate(() => {
    const read = (canvas) => {
      const boxes = { land: null, rivers: null, cities: null };
      const grow = (key, x, y) => {
        const box = boxes[key] ?? { minX: x, minY: y, maxX: x, maxY: y };
        box.minX = Math.min(box.minX, x);
        box.minY = Math.min(box.minY, y);
        box.maxX = Math.max(box.maxX, x);
        box.maxY = Math.max(box.maxY, y);
        boxes[key] = box;
      };
      const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const i = (y * canvas.width + x) * 4;
          const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          if (a >= 128) {
            if (Math.max(r, g, b) - Math.min(r, g, b) <= 14) grow("land", x, y);
            else if (b - r > 50) grow("rivers", x, y);
            else if (r - b > 60) grow("cities", x, y);
          }
        }
      }
      return boxes;
    };
    const textures = window.__canvases.filter((node) => node.width === 2048);
    const globe = textures.filter((node) => node.height === 1024).at(-1);
    const flat = textures.filter((node) => node.height !== 1024).at(-1);
    return { globe: globe ? read(globe) : null, flat: flat ? read(flat) : null };
  });

// How far, past the slack, a box reaches beyond the land's box on each side.
const overshoot = (box, land, slack = SLACK) => ({
  west: Math.max(0, land.minX - box.minX - slack),
  north: Math.max(0, land.minY - box.minY - slack),
  east: Math.max(0, box.maxX - land.maxX - slack),
  south: Math.max(0, box.maxY - land.maxY - slack),
});

test("Solid rivers and cities stay inside South America's land on the globe and the flat map", async ({ page }) => {
  await page.addInitScript(() => {
    window.__canvases = [];
    const create = Document.prototype.createElement;
    Document.prototype.createElement = function createElement(tag, ...rest) {
      const element = create.call(this, tag, ...rest);
      if (String(tag).toLowerCase() === "canvas") window.__canvases.push(element);
      return element;
    };
  });
  await page.goto(SOUTH_AMERICA_SOLID);

  // Rivers and cities load with the land, so wait until both textures show all three.
  const ready = ({ globe, flat }) =>
    [globe, flat].every((boxes) => boxes?.land && boxes.rivers && boxes.cities);
  await expect.poll(async () => ready(await readTextures(page)), { timeout: TEXTURE_TIMEOUT }).toBe(true);

  const textures = await readTextures(page);
  const inside = { west: 0, north: 0, east: 0, south: 0 };
  Object.entries(textures).forEach(([view, { land, rivers, cities }]) => {
    expect(overshoot(rivers, land), `${view} rivers past the land`).toEqual(inside);
    expect(overshoot(cities, land, CITY_SLACK), `${view} cities past the land`).toEqual(inside);
  });
});
