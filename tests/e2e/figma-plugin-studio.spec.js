import { expect, test } from "@playwright/test";

// The Figma plugin (figma-plugin/ui.html) loads the full studio with
// ?plugin=figma. Exports go to the plugin shell as a postMessage instead of a
// download. Loaded top level here, window.parent is the page itself, so the
// test listens on window for what the shell would receive.
test.describe("studio inside the Figma plugin", () => {
  test.use({ viewport: { width: 400, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__inserts = [];
      window.addEventListener("message", (event) => {
        const data = event.data;
        if (data?.type === "globestudio-insert") {
          window.__inserts.push({
            bytes: data.bytes ? data.bytes.length : 0,
            dots: data.svg ? (data.svg.match(/data-dot-id=/g) || []).length : 0,
            width: data.width,
            height: data.height,
          });
        }
      });
    });
    await page.goto("/?plugin=figma");
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("offers Image and SVG only, and inserts a square PNG", async ({ page }) => {
    await expect(page.getByRole("navigation", { name: "Site links" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Report a bug" })).toHaveCount(0);

    await page.getByRole("button", { name: "Insert into Figma" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("tab", { name: "Image" })).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "SVG" })).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "Video" })).toHaveCount(0);
    await expect(dialog.getByRole("tab", { name: "Share" })).toHaveCount(0);

    await dialog.getByRole("button", { name: "Insert into Figma" }).click();
    await expect.poll(() => page.evaluate(() => window.__inserts.length), { timeout: 60_000 }).toBe(1);
    const [png] = await page.evaluate(() => window.__inserts);
    expect(png.bytes).toBeGreaterThan(1000);
    expect(png.width).toBe(png.height);
  });

  test("inserts editable vectors from the SVG tab", async ({ page }) => {
    await page.getByRole("button", { name: "Insert into Figma" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("tab", { name: "SVG" }).click();
    await dialog.getByRole("button", { name: "Insert vectors into Figma" }).click();
    await expect.poll(() => page.evaluate(() => window.__inserts.length), { timeout: 60_000 }).toBe(1);
    const [svg] = await page.evaluate(() => window.__inserts);
    expect(svg.dots).toBeGreaterThan(100);
  });
});
