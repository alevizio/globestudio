import { expect, test } from "@playwright/test";

// The Background section's Transparent option: panel sync, the PNG it
// exports, share links and the embed's background=transparent spelling.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;

const waitForCanvas = async (page) => {
  const canvas = page.locator(".globe-background canvas");
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await expect
    .poll(() => canvas.evaluate((node) => node.width > 0 && node.height > 0), { timeout: CANVAS_TIMEOUT })
    .toBe(true);
};

// The globe repaints every frame, which can stall Playwright's actionability
// checks under software GL, so clicks go straight to the element (same as
// the export tests in globestudio.spec.js).
const press = (locator) => locator.evaluate((el) => el.click());

const openBackgroundSection = async (page) => {
  await press(page.getByRole("button", { name: "Background", exact: true }));
  return page.getByRole("group", { name: "Background style" });
};

test("Transparent is a Background option that stays in sync with the eye", async ({ page }) => {
  await page.goto("/");
  await waitForCanvas(page);
  const shell = page.locator("main.app-shell");
  const styles = await openBackgroundSection(page);
  const eye = page.getByRole("button", { name: "Toggle background" });

  await expect(styles.getByRole("button")).toHaveText(["Solid", "Space", "Transparent"]);
  await expect(page.getByRole("button", { name: /select background color/i })).toBeVisible();

  await press(styles.getByRole("button", { name: "Transparent" }));
  await expect(shell).toHaveClass(/is-transparent-preview/);
  await expect(eye).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: /select background color/i })).toHaveCount(0);

  await press(eye);
  await expect(styles.getByRole("button", { name: "Solid" })).toHaveAttribute("aria-pressed", "true");
  await expect(shell).not.toHaveClass(/is-transparent-preview/);

  await press(eye);
  await expect(styles.getByRole("button", { name: "Transparent" })).toHaveAttribute("aria-pressed", "true");
  await expect(shell).toHaveClass(/is-transparent-preview/);
});

test("a PNG exported with a Transparent background has see-through corners", async ({ page }) => {
  // Keep every PNG the app hands to a download so the test can read it back.
  await page.addInitScript(() => {
    window.__pngs = [];
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      if (blob?.type === "image/png") window.__pngs.push(blob);
      return create(blob);
    };
  });
  await page.goto("/");
  await waitForCanvas(page);
  const styles = await openBackgroundSection(page);
  await press(styles.getByRole("button", { name: "Transparent" }));

  await page.keyboard.press("d");
  await press(page.getByRole("dialog", { name: /export/i }).getByRole("button", { name: /export png/i }));
  await expect(page.locator('.visually-hidden[role="status"]'))
    .toHaveText(/PNG saved/i, { timeout: process.env.CI ? 45_000 : 30_000 });

  const corners = await page.evaluate(async () => {
    const bitmap = await createImageBitmap(window.__pngs.at(-1));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0);
    const alpha = (x, y) => context.getImageData(x, y, 1, 1).data[3];
    return [alpha(0, 0), alpha(bitmap.width - 1, 0), alpha(0, bitmap.height - 1), alpha(bitmap.width - 1, bitmap.height - 1)];
  });
  expect(corners).toEqual([0, 0, 0, 0]);
});

test("a share link keeps Transparent, even for someone whose last style was Space", async ({ browser, page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text) => { window.__copied = text; } },
    });
  });
  await page.goto("/");
  await waitForCanvas(page);
  const styles = await openBackgroundSection(page);
  await press(styles.getByRole("button", { name: "Transparent" }));
  await page.keyboard.press("d");
  const dialog = page.getByRole("dialog", { name: /export/i });
  await press(dialog.getByRole("tab", { name: "Share" }));
  await press(dialog.getByRole("button", { name: /copy share link/i }));
  await expect.poll(() => page.evaluate(() => window.__copied ?? "")).toContain("?c=");
  const shareUrl = new URL(await page.evaluate(() => window.__copied));
  // One software-GL globe at a time: a second live context can starve the first.
  await page.close();

  const recipient = await browser.newContext();
  const other = await recipient.newPage();
  await other.addInitScript(() => {
    if (!localStorage.getItem("globestudio:backgroundStyle")) {
      localStorage.setItem("globestudio:backgroundStyle", JSON.stringify("space"));
    }
  });
  await other.goto(shareUrl.href);
  await waitForCanvas(other);
  await expect(other.locator("main.app-shell")).toHaveClass(/is-transparent-preview/);
  const recipientStyles = await openBackgroundSection(other);
  await expect(recipientStyles.getByRole("button", { name: "Transparent" })).toHaveAttribute("aria-pressed", "true");
  await recipient.close();
});

test("the embed reads background=transparent as a see-through page", async ({ page }) => {
  await page.goto("/embed?look=default&background=transparent");
  await waitForCanvas(page);
  await expect(page.locator('.embed-view[data-transparent="true"]')).toHaveCount(1);
  const pageBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(pageBackground).toBe("rgba(0, 0, 0, 0)");
});
