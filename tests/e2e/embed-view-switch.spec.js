import { expect, test } from "@playwright/test";

// The Globe and Map switch an embed shows for a config with "viewSwitch":
// true (src/components/embed-view-switch.jsx).
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;

// Glow off: its drop-shadow blurs make page screenshots slow in software GL.
const embed = (config) =>
  `/embed?c=${encodeURIComponent(JSON.stringify({ v: 2, globeSettings: { glow: false }, ...config }))}`;

// Reduced motion stops the spin, so a settled frame holds still.
test.use({ viewport: { width: 640, height: 400 }, contextOptions: { reducedMotion: "reduce" } });

const waitForCanvas = async (page) => {
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await expect
    .poll(async () => canvas.evaluate((node) => node.width > 0 && node.getBoundingClientRect().width > 100), {
      timeout: CANVAS_TIMEOUT,
    })
    .toBe(true);
};

// A plain embed doesn't keep its drawing buffer, so frames are page
// screenshots: one once two in a row match, after the 1.7s morph.
const settledShot = async (page) => {
  let shot = null;
  await expect
    .poll(async () => {
      const previous = shot;
      await page.waitForTimeout(300);
      shot = await page.screenshot();
      return previous !== null && previous.equals(shot);
    }, { timeout: CANVAS_TIMEOUT })
    .toBe(true);
  return shot;
};

// Share of pixels that differ between two screenshots, counting a pixel when
// any channel is off by more than 16: software GL can land a few pixels
// differently on two draws of the same scene.
const shotDiff = (page, a, b) =>
  page.evaluate(async ([first, second]) => {
    const read = async (url) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      return context.getImageData(0, 0, img.width, img.height);
    };
    const [x, y] = await Promise.all([read(first), read(second)]);
    if (x.width !== y.width || x.height !== y.height) return 1;
    let differing = 0;
    for (let index = 0; index < x.data.length; index += 4) {
      for (let channel = 0; channel < 4; channel += 1) {
        if (Math.abs(x.data[index + channel] - y.data[index + channel]) > 16) {
          differing += 1;
          break;
        }
      }
    }
    return differing / (x.width * x.height);
  }, [a, b].map((shot) => `data:image/png;base64,${shot.toString("base64")}`));

test("the embed's switch turns the globe into the flat map and back", async ({ page }) => {
  await page.goto(embed({ viewSwitch: true }));
  await waitForCanvas(page);
  const map = page.getByRole("button", { name: "Map view" });
  const globe = page.getByRole("button", { name: "Globe view" });
  await expect(globe).toHaveAttribute("aria-pressed", "true");
  const globeShot = await settledShot(page);

  await map.click();
  await expect(map).toHaveAttribute("aria-pressed", "true");
  const mapShot = await settledShot(page);
  expect(await shotDiff(page, globeShot, mapShot)).toBeGreaterThan(0.05);

  // Back with the keyboard, then out of the button so its focus ring isn't
  // in the frame.
  await globe.focus();
  await page.keyboard.press("Enter");
  await expect(globe).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => document.activeElement?.blur());
  expect(await shotDiff(page, globeShot, await settledShot(page))).toBeLessThan(0.01);
});

test("an embed whose config doesn't ask for the switch shows none", async ({ page }) => {
  await page.goto(embed({}));
  await waitForCanvas(page);
  await expect(page.getByRole("group", { name: "View" })).toHaveCount(0);
});
