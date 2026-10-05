import { expect, test } from "@playwright/test";

// A lost WebGL context (a GPU reset, a phone reclaiming memory) pauses the
// globe. If the browser restores it, the page reloads; if it never does,
// the error card with its Reload button replaces the blank canvas.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;
// The card comes 10 s after the loss; give a loaded software GL main thread
// room on top.
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

test("a lost context that never comes back ends in the error card, not a blank globe", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator(".globe-background canvas");
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  // WEBGL_lose_context loses the context the way a GPU reset does, and it
  // stays lost until restoreContext(), which nothing calls here.
  await canvas.evaluate((node) => node.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext());
  const card = page.getByRole("alert").filter({ hasText: ERROR_CARD });
  await expect(card).toBeVisible({ timeout: CARD_TIMEOUT });
  await expect(card.getByRole("button", { name: "Reload" })).toBeVisible();
});

test("a lost context that comes back reloads the page before any error card", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator(".globe-background canvas");
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  const reloaded = page.waitForEvent("framenavigated", { timeout: RELOAD_TIMEOUT });
  await canvas.evaluate((node) => {
    const lose = node.getContext("webgl2").getExtension("WEBGL_lose_context");
    lose.loseContext();
    setTimeout(() => lose.restoreContext(), 500);
  });
  await reloaded;
  await expect(page.locator(".globe-background canvas")).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await expect(page.getByText(ERROR_CARD)).toHaveCount(0);
});

test("a lost context the browser restores after the error card still reloads the page", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator(".globe-background canvas");
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await canvas.evaluate((node) => {
    // Kept on window: the card takes the canvas out of the page.
    window.__loseContext = node.getContext("webgl2").getExtension("WEBGL_lose_context");
    window.__loseContext.loseContext();
  });
  await expect(page.getByRole("alert").filter({ hasText: ERROR_CARD })).toBeVisible({ timeout: CARD_TIMEOUT });
  const reloaded = page.waitForEvent("framenavigated", { timeout: RELOAD_TIMEOUT });
  await page.evaluate(() => window.__loseContext.restoreContext());
  await reloaded;
  await expect(page.locator(".globe-background canvas")).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await expect(page.getByText(ERROR_CARD)).toHaveCount(0);
});
