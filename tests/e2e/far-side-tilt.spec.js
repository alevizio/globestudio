import { expect, test } from "@playwright/test";

// Metal's Voxel boxes show the far side's land through the globe's
// see-through sphere. Its dots used to sort against the sphere by distance,
// so tilting the globe north-south past about level drew the sphere first
// and its depth hid all of the far side's land in one half-degree step
// (three/globe.js buildGlobeDotLayer). This drags the globe down in small
// steps across that angle and checks no step loses a patch of land.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;
// Each read copies the framebuffer at a quarter of its size, so a block of
// 4 px stands for 16 px on screen and each read is a sixteenth of the work.
const SCALE = 4;
const BLOCK = 4;
// A block whose mean brightness falls by more than this lost the land in it.
const DROP = 12;

test.use({ viewport: { width: 1280, height: 800 } });
// A lighter Metal keeps this inside CI's time limit under software WebGL:
// it ships at Density 70, thousands of boxes.
const METAL = `/looks/metal?c=${encodeURIComponent(JSON.stringify({ v: 2, density: 20 }))}&app=1`;

// Reduced motion holds auto-spin and twinkle still, so the frames change
// only with the drag.
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

// Mean brightness of each BLOCK px square of the studio's WebGL framebuffer,
// which keeps its drawing buffer for exports. Turning the globe half a
// degree barely moves a block's mean; land disappearing drops it.
const blockMeans = (page) =>
  page.evaluate(({ size, scale }) => {
    const gl = [...document.querySelectorAll("canvas")].find((node) => typeof node.captureAtScale === "function");
    if (!gl) return null;
    const copy = document.createElement("canvas");
    copy.width = Math.floor(gl.width / scale);
    copy.height = Math.floor(gl.height / scale);
    const context = copy.getContext("2d", { willReadFrequently: true });
    context.drawImage(gl, 0, 0, copy.width, copy.height);
    const { data } = context.getImageData(0, 0, copy.width, copy.height);
    const columns = Math.floor(copy.width / size);
    const rows = Math.floor(copy.height / size);
    const means = new Float64Array(columns * rows);
    for (let y = 0; y < rows * size; y += 1) {
      const row = Math.floor(y / size) * columns;
      for (let x = 0; x < columns * size; x += 1) {
        const i = (y * copy.width + x) * 4;
        means[row + Math.floor(x / size)] += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      }
    }
    return Array.from(means, (sum) => sum / (size * size));
  }, { size: BLOCK, scale: SCALE });

const blocksDarkened = (before, after) => after.filter((mean, i) => before[i] - mean > DROP).length;

test("tilting a see-through look north-south keeps the far side's land", async ({ page }) => {
  // GitHub's runners draw this in software about three times slower than
  // the CI image on a laptop, where it takes about 1.5 minutes.
  test.setTimeout(process.env.CI ? 600_000 : 180_000);
  await page.goto(METAL);
  const canvas = page.locator(".globe-background canvas");
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  // Land drawn: some blocks are well above the dark background.
  await expect
    .poll(async () => (await blockMeans(page))?.filter((mean) => mean > 60).length ?? 0, { timeout: CANVAS_TIMEOUT })
    .toBeGreaterThan(20);

  // The globe opens tilted 8 degrees with its north pole away. Each 4 px
  // drag tilts it about one degree; 12 of them carry it about 12 degrees,
  // past level, where the land used to drop out. The tilt eases in behind
  // the pointer, so each frame read is at most a degree on from the one
  // before.
  await page.mouse.move(645, 400);
  await page.mouse.down();
  const frames = [await blockMeans(page)];
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(645, 400 + step * 4, { steps: 2 });
    await page.waitForTimeout(250);
    frames.push(await blockMeans(page));
  }
  await page.mouse.up();
  // Keep reading until the tilt lands and the frame holds still.
  const change = (a, b) => a.reduce((sum, mean, i) => sum + Math.abs(mean - b[i]), 0) / a.length;
  let landed = false;
  for (let read = 0; read < 20 && !landed; read += 1) {
    await page.waitForTimeout(300);
    frames.push(await blockMeans(page));
    landed = change(frames.at(-2), frames.at(-1)) < 0.05;
  }
  expect(landed, "the tilt settled past level").toBe(true);

  const darkened = frames.slice(1).map((frame, i) => blocksDarkened(frames[i], frame));
  // No step lost a patch of land. A half-degree turn darkens a few blocks
  // at most; the old drop darkened dozens at once.
  expect(Math.max(...darkened)).toBeLessThan(12);
});
