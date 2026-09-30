import { expect, test } from "@playwright/test";

// A hi-res PNG export must show the preview's pattern cells, only sharper.
// The preview's uResolution is the CSS size, so a capture at N times that
// size has to grow uCellSize by N. Dividing by the screen's pixel ratio as
// well made every Halftone export on a 2x screen come out with cells half
// the size of the preview's.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;
const CSS = { width: 400, height: 250 };

test.use({ viewport: CSS, deviceScaleFactor: 2, reducedMotion: "reduce" });

// Halftone cell pitch of a PNG, in CSS pixels. The screen is rotated
// (rotateUv in post-effects.js halftonePass, 0.49 rad with motion frozen), so
// this autocorrelates along the two lattice directions, where the pattern
// repeats exactly once per cell, and picks the shift P with the largest
// contrast between P (dots on dots) and P/2 (dots on gaps).
const measurePitch = (canvas, source) =>
  canvas.evaluate(
    async (node, { source, cssWidth }) => {
      const url = source === "preview"
        ? node.toDataURL("image/png")
        : await new Promise((resolve, reject) => {
          node.captureAtScale(source).then((blob) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }, reject);
        });
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });
      const { width: w, height: h } = image;
      const scratch = document.createElement("canvas");
      scratch.width = w;
      scratch.height = h;
      const context = scratch.getContext("2d");
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, w, h).data;
      // Ink over a transparent canvas: luma weighted by alpha.
      const ink = new Float32Array(w * h);
      for (let index = 0; index < w * h; index += 1) {
        const k = index * 4;
        ink[index] = ((0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2]) * data[k + 3]) / 255;
      }
      const ratio = w / cssWidth;
      const x0 = Math.floor(w * 0.2);
      const x1 = Math.floor(w * 0.8);
      const y0 = Math.floor(h * 0.25);
      const y1 = Math.floor(h * 0.7);
      let mean = 0;
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) mean += ink[y * w + x];
      mean /= (x1 - x0) * (y1 - y0);
      const maxLag = Math.round(20 * ratio);
      let best = { score: -Infinity, lag: 0 };
      for (const angle of [0.49, -0.49]) {
        const acc = new Float64Array(maxLag + 1);
        for (let lag = 1; lag <= maxLag; lag += 1) {
          for (const direction of [angle, angle + Math.PI / 2]) {
            const dx = Math.round(lag * Math.cos(direction));
            const dy = Math.round(lag * Math.sin(direction));
            for (let y = y0; y < y1; y += 2) {
              for (let x = x0; x < x1; x += 2) {
                acc[lag] += (ink[y * w + x] - mean) * (ink[(y + dy) * w + x + dx] - mean);
              }
            }
          }
        }
        for (let lag = Math.round(3 * ratio); lag <= maxLag; lag += 1) {
          const score = (acc[lag] - acc[Math.round(lag / 2)]) / Math.max(acc[1], 1e-9);
          if (score > best.score) best = { score, lag };
        }
      }
      return best.lag / ratio;
    },
    { source, cssWidth: CSS.width },
  );

test("a hi-res PNG keeps the preview's halftone cells on a 2x screen", async ({ page }) => {
  // Dense, large map dots fill the land, so the halftone screen covers whole
  // continents; static=1 freezes the screen's rotation between captures.
  await page.goto("/embed?look=halftone&view=flat&plugin=figma&static=1&density=90&dotSize=25");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  // The first frame can land before the map dots do: wait for ink on land.
  await expect
    .poll(
      () =>
        canvas.evaluate((node) => {
          const probe = document.createElement("canvas");
          probe.width = 64;
          probe.height = 40;
          const context = probe.getContext("2d");
          context.drawImage(node, 0, 0, 64, 40);
          const data = context.getImageData(0, 0, 64, 40).data;
          let inked = 0;
          for (let index = 3; index < data.length; index += 4) if (data[index] > 128) inked += 1;
          return inked / (64 * 40);
        }),
      { timeout: CANVAS_TIMEOUT },
    )
    .toBeGreaterThan(0.05);

  const preview = await measurePitch(canvas, "preview");
  // The look's cellSize is 8 CSS px; the preview is the reference.
  expect(preview).toBeGreaterThan(6);
  for (const scale of [1, 2, 4]) {
    const exported = await measurePitch(canvas, scale);
    expect.soft(exported, `${scale}x export cell pitch vs preview ${preview}`).toBeCloseTo(preview, 0);
  }
});
