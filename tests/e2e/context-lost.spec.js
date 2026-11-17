import { expect, test } from "@playwright/test";

// A lost WebGL context (a GPU reset, a phone reclaiming memory) pauses the
// globe, and GlobeBackground builds it again on a new canvas with no reload:
// at once if the browser restores the context, in low power mode if it
// doesn't within 5 s. A loss on that canvas that isn't restored ends in the
// error card with its Reload button.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;
// The new canvas comes 5 s after the loss; give a loaded software GL main
// thread room on top. The card comes 5 s after the second loss.
const REBUILD_TIMEOUT = process.env.CI ? 60_000 : 30_000;
const CARD_TIMEOUT = process.env.CI ? 60_000 : 30_000;
// A restore took about 25 s in software GL, then the reload starts.
const RELOAD_TIMEOUT = process.env.CI ? 120_000 : 30_000;
const ERROR_CARD = "Couldn’t load the globe view.";

// In software GL, as on CI, a spinning globe keeps the page's main thread
// busy, so the script that loses the context can wait a minute to run and
// the restore and reload queue behind it. A still globe draws nothing and
// leaves the thread free. The loss and restore are handled the same way
// with motion or without.
test.use({ contextOptions: { reducedMotion: "reduce" } });

const globeCanvas = (page) => page.locator(".globe-background canvas");
// The canvas built after a loss: loseCanvas marks the one it loses.
const newCanvas = (page) => page.locator(".globe-background canvas:not([data-lost])");

// Loses the canvas's context the way a GPU reset does. It stays lost until
// restoreContext(), kept on window for the tests that call it.
const loseCanvas = (page) =>
  globeCanvas(page).evaluate((node) => {
    node.dataset.lost = "1";
    window.__loseContext = node.getContext("webgl2").getExtension("WEBGL_lose_context");
    window.__loseContext.loseContext();
  });

// Set on the page before a loss: still there after it, so no reload.
const markPage = (page) => page.evaluate(() => {
  window.__samePage = true;
});
const samePage = (page) => page.evaluate(() => window.__samePage === true);

test.describe("on a 2x screen", () => {
  test.use({ deviceScaleFactor: 2 });

  test("a lost context that never comes back: the globe is built again in low power mode, with no reload", async ({ page }) => {
    await page.goto("/");
    await expect(globeCanvas(page)).toBeVisible({ timeout: CANVAS_TIMEOUT });
    const ratio = (locator) => locator.evaluate((node) => node.width / node.clientWidth);
    expect(await ratio(globeCanvas(page))).toBeGreaterThan(1.4);
    await markPage(page);
    await loseCanvas(page);
    const rebuilt = newCanvas(page);
    await expect(rebuilt).toBeVisible({ timeout: REBUILD_TIMEOUT });
    // Low power mode draws at one device pixel.
    expect(await ratio(rebuilt)).toBeCloseTo(1, 1);
    await expect(page.getByText(ERROR_CARD)).toHaveCount(0);
    expect(await samePage(page)).toBe(true);
  });
});

test("a lost context that comes back brings the globe back with no reload", async ({ page }) => {
  await page.goto("/");
  await expect(globeCanvas(page)).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await markPage(page);
  await globeCanvas(page).evaluate((node) => {
    node.dataset.lost = "1";
    const lose = node.getContext("webgl2").getExtension("WEBGL_lose_context");
    lose.loseContext();
    setTimeout(() => lose.restoreContext(), 500);
  });
  await expect(newCanvas(page)).toBeVisible({ timeout: REBUILD_TIMEOUT });
  await expect(page.getByText(ERROR_CARD)).toHaveCount(0);
  expect(await samePage(page)).toBe(true);
});

test("a second lost context that never comes back ends in the error card, not a blank globe", async ({ page }) => {
  await page.goto("/");
  await expect(globeCanvas(page)).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await loseCanvas(page);
  await expect(newCanvas(page)).toBeVisible({ timeout: REBUILD_TIMEOUT });
  await loseCanvas(page);
  const card = page.getByRole("alert").filter({ hasText: ERROR_CARD });
  await expect(card).toBeVisible({ timeout: CARD_TIMEOUT });
  await expect(card.getByRole("button", { name: "Reload" })).toBeVisible();
  // The rest of the visit, a reload included, starts in low power mode.
  expect(await page.evaluate(() => window.sessionStorage.getItem("gs_context_lost"))).toBe("1");
});

test("a lost context the browser restores after the error card still reloads the page", async ({ page }) => {
  await page.goto("/");
  await expect(globeCanvas(page)).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await loseCanvas(page);
  await expect(newCanvas(page)).toBeVisible({ timeout: REBUILD_TIMEOUT });
  await loseCanvas(page);
  await expect(page.getByRole("alert").filter({ hasText: ERROR_CARD })).toBeVisible({ timeout: CARD_TIMEOUT });
  const reloaded = page.waitForEvent("framenavigated", { timeout: RELOAD_TIMEOUT });
  await page.evaluate(() => window.__loseContext.restoreContext());
  await reloaded;
  await expect(globeCanvas(page)).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await expect(page.getByText(ERROR_CARD)).toHaveCount(0);
});
