import { expect, test } from "@playwright/test";

// A picked color renders as its own hex, read back from the canvas. Every
// design without a picked color reads its colors the old way, which draws
// #ff8000 as (255, 55, 0), and still renders that way (src/utils/color-space.js).
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;

// Twinkle dims each dot over time; reduced motion holds it at full color.
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

// Big dots at low density in the flat view give flat, unlit dot interiors.
// Glow off: its drop-shadow blurs make page screenshots slow in software GL.
const BIG_DOTS = { viewMode: "flat", density: 12, dotSize: 25, globeSettings: { glow: false } };
const link = (v, config) => `/?c=${encodeURIComponent(JSON.stringify({ v, ...config }))}`;

// Pixels of an RGBA image within 1 of `rgb` on every channel.
const countNear = (page, src, rgb) =>
  page.evaluate(
    async ({ src: url, target }) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      const { data } = context.getImageData(0, 0, img.width, img.height);
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 255 && Math.abs(data[i] - target[0]) <= 1 && Math.abs(data[i + 1] - target[1]) <= 1 && Math.abs(data[i + 2] - target[2]) <= 1) count += 1;
      }
      return count;
    },
    { src, target: rgb },
  );

// The studio's WebGL framebuffer, not a page screenshot: the page lays a
// soft vignette over the canvas. The studio canvas keeps its drawing buffer
// for exports.
const canvasPixelsNear = async (page, rgb) => {
  const src = await page.evaluate(() => {
    const gl = [...document.querySelectorAll("canvas")].find((node) => typeof node.captureAtScale === "function");
    return gl ? gl.toDataURL("image/png") : null;
  });
  return src ? countNear(page, src, rgb) : 0;
};

// A plain embed does not keep its drawing buffer, so it is read from a
// page screenshot.
const screenshotPixelsNear = async (page, rgb) =>
  countNear(page, `data:image/png;base64,${(await page.screenshot()).toString("base64")}`, rgb);

// The panel repaints with the globe, which can stall Playwright's
// actionability checks under software GL, so clicks go straight to the
// element (as in globestudio.spec.js).
const press = (locator) => locator.evaluate((el) => el.click());

test.describe("colors", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("a color picked in the studio renders as its hex, and the SVG export writes it", async ({ page }) => {
    await page.goto(link(2, { ...BIG_DOTS, dotColor: "#ffffff" }));
    await expect.poll(() => canvasPixelsNear(page, [255, 255, 255]), { timeout: CANVAS_TIMEOUT }).toBeGreaterThan(2000);

    await press(page.getByRole("button", { name: "Surface" }));
    await press(page.getByRole("button", { name: "Select dot color" }));
    await page.getByRole("textbox", { name: "Hex value" }).fill("#ff0066");
    await page.keyboard.press("Escape");

    await expect.poll(() => canvasPixelsNear(page, [255, 0, 102]), { timeout: CANVAS_TIMEOUT }).toBeGreaterThan(2000);
    // The old reading drew #ff0066 as (255, 0, 34).
    expect(await canvasPixelsNear(page, [255, 0, 34])).toBe(0);

    await press(page.getByRole("button", { name: "Open export dialog" }));
    const dialog = page.getByRole("dialog", { name: /export/i });
    await press(dialog.getByRole("tab", { name: "SVG" }));
    await press(dialog.getByRole("button", { name: /Copy SVG to clipboard|SVG copied to clipboard/ }));
    await expect(dialog.getByRole("button", { name: "SVG copied to clipboard" })).toBeVisible();
    const svg = await page.evaluate(() => navigator.clipboard.readText());
    expect(svg.toLowerCase()).toContain("#ff0066");
  });

  test("a link without hex colors renders as it always has", async ({ page }) => {
    await page.goto(link(2, { ...BIG_DOTS, dotColor: "#ff8000" }));
    await expect.poll(() => canvasPixelsNear(page, [255, 55, 0]), { timeout: CANVAS_TIMEOUT }).toBeGreaterThan(2000);
    expect(await canvasPixelsNear(page, [255, 128, 0])).toBe(0);
    // The design keeps the color as it came.
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("globestudio:dotColor")))).toBe("#ff8000");
  });

  test("a v3 link renders its colors as their hex", async ({ page }) => {
    await page.goto(link(3, { ...BIG_DOTS, dotColor: "#ff8000" }));
    await expect.poll(() => canvasPixelsNear(page, [255, 128, 0]), { timeout: CANVAS_TIMEOUT }).toBeGreaterThan(2000);
    expect(await canvasPixelsNear(page, [255, 55, 0])).toBe(0);
  });

  test("an embed's ?dotColor= renders as it always has", async ({ page }) => {
    // Embeds already on other sites carry this param with no version, so it
    // keeps its old reading (embed-view.jsx buildSettings).
    await page.goto("/embed?look=default&view=flat&dotColor=ff8000&density=12&dotSize=25&static=1");
    await expect.poll(() => screenshotPixelsNear(page, [255, 55, 0]), { timeout: CANVAS_TIMEOUT }).toBeGreaterThan(2000);
    expect(await screenshotPixelsNear(page, [255, 128, 0])).toBe(0);
  });
});
