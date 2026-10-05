import { expect, test } from "@playwright/test";

// A lost WebGL context (a GPU reset, a phone reclaiming memory) pauses the
// globe. If the browser restores it, the page reloads; if it never does,
// the error card with its Reload button replaces the blank canvas.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;
// The card comes 10 s after the loss; give a loaded software GL main thread
// room on top.
const CARD_TIMEOUT = process.env.CI ? 60_000 : 30_000;
const ERROR_CARD = "Couldn’t load the globe view.";

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
  const reloaded = page.waitForEvent("framenavigated");
  await canvas.evaluate((node) => {
    const lose = node.getContext("webgl2").getExtension("WEBGL_lose_context");
    lose.loseContext();
    setTimeout(() => lose.restoreContext(), 500);
  });
  await reloaded;
  await expect(page.locator(".globe-background canvas")).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await expect(page.getByText(ERROR_CARD)).toHaveCount(0);
});
