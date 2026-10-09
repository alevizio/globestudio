import { expect, test } from "@playwright/test";

// The grid's far half shows through the globe's see-through sphere. Its
// lines used to sort against the sphere by distance, and a parallel's sort
// point is on the globe's axis, so tilting the globe north-south past level
// hid the far half of every northern parallel in one step and showed the
// southern ones' (three/horizon.js). This drags the globe across level in
// small steps and checks no step loses a stretch of grid.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;
const BLOCK = 16;

test.use({ viewport: { width: 1280, height: 800 } });
// Only the sphere and a bright, fine grid: no dots, glow or network, so the
// grid is all that changes and CI's software WebGL draws it quickly. The
// base tilt of 6 degrees starts the globe 2 degrees short of level.
const GRID = `/looks/default?c=${encodeURIComponent(JSON.stringify({
  v: 2,
  dotsVisible: false,
  tiltX: 6,
  globeSettings: { glow: false, network: false, gridStrength: 100, gridSize: 15 },
}))}&app=1`;

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

// Mean brightness of each BLOCK px square of the studio's WebGL framebuffer,
// as in far-side-tilt.spec.js.
const blockMeans = (page) =>
  page.evaluate((size) => {
    const gl = [...document.querySelectorAll("canvas")].find((node) => typeof node.captureAtScale === "function");
    if (!gl) return null;
    const copy = document.createElement("canvas");
    copy.width = gl.width;
    copy.height = gl.height;
    const context = copy.getContext("2d", { willReadFrequently: true });
    context.drawImage(gl, 0, 0);
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
    return { columns, means: Array.from(means, (sum) => sum / (size * size)) };
  }, BLOCK);

test("tilting the globe across level keeps the grid's far half", async ({ page }) => {
  test.setTimeout(process.env.CI ? 180_000 : 90_000);
  await page.goto(GRID);
  const canvas = page.locator(".globe-background canvas");
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  // Grid drawn: some blocks are lit by its lines.
  await expect
    .poll(async () => (await blockMeans(page))?.means.filter((mean) => mean > 25).length ?? 0, { timeout: CANVAS_TIMEOUT })
    .toBeGreaterThan(100);

  await page.mouse.move(645, 400);
  await page.mouse.down();
  const frames = [await blockMeans(page)];
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(645, 400 + step * 2, { steps: 2 });
    await page.waitForTimeout(250);
    frames.push(await blockMeans(page));
  }
  await page.mouse.up();
  const change = (a, b) => a.means.reduce((sum, mean, i) => sum + Math.abs(mean - b.means[i]), 0) / a.means.length;
  let landed = false;
  for (let read = 0; read < 40 && !landed; read += 1) {
    await page.waitForTimeout(300);
    frames.push(await blockMeans(page));
    landed = change(frames.at(-2), frames.at(-1)) < 0.05;
  }
  expect(landed, "the tilt settled past level").toBe(true);

  // Brightness of the top and bottom halves of the frame: each holds one
  // hemisphere's parallels. A half-degree turn moves the lines a few pixels
  // within their half; a far half dropping out takes a share of it at once.
  const halves = ({ columns, means }) => {
    const rows = means.length / columns;
    let top = 0;
    let bottom = 0;
    means.forEach((mean, i) => {
      if (Math.floor(i / columns) < rows / 2) top += mean;
      else bottom += mean;
    });
    return [top, bottom];
  };
  const drops = frames.slice(1).map((frame, i) => {
    const before = halves(frames[i]);
    const after = halves(frame);
    return Math.max(...before.map((sum, half) => (sum - after[half]) / sum));
  });
  // A half-degree turn moves a half's brightness by under 2%; the old
  // drop took about 15% of it in one step.
  expect(Math.max(...drops), `drop per step: ${drops.map((drop) => drop.toFixed(3)).join(" ")}`).toBeLessThan(0.05);
});
