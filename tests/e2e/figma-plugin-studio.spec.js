import { expect, test } from "@playwright/test";
import axeSource from "axe-core";

const expectNoSeriousAxeViolations = async (page) => {
  await page.addScriptTag({ content: axeSource.source });
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return result.violations
      .filter((violation) => ["serious", "critical"].includes(violation.impact))
      .map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target.join(" ")) }));
  });
  expect(violations).toEqual([]);
};

// A share link the way the studio's Share tab writes one, on a look.
const shareLink = (config, path = "/") =>
  `https://globestudio.app${path}?c=${encodeURIComponent(JSON.stringify({ v: 2, ...config }))}`;

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
    await expect(dialog.getByRole("tab", { name: "MCP" })).toHaveCount(0);
    await expect(dialog.getByRole("tab", { name: "Skill" })).toHaveCount(0);

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

// A designer copies a share link on globestudio.app and pastes it into the
// plugin to bring that exact design into Figma. Real Cmd/Ctrl+V presses read
// the clipboard the test writes, as a paste in Figma's iframe would.
test.describe("pasting a share link into the Figma plugin", () => {
  test.use({ viewport: { width: 400, height: 720 }, permissions: ["clipboard-read", "clipboard-write"] });

  const paste = async (page, text) => {
    await page.evaluate((value) => navigator.clipboard.writeText(value), text);
    await page.keyboard.press("ControlOrMeta+V");
  };
  const openSheet = async (page) => {
    await page.getByRole("button", { name: "All options", expanded: false }).click();
    await expect(page.locator(".control-rail")).not.toHaveClass(/is-collapsed/);
  };
  const region = (page) => page.getByRole("button", { name: /^Country or region/ });
  // The shortcut toast a paste outside the field shows lasts 1.4 s, which a
  // busy software GL frame can outlast, so its text is recorded as it lands.
  const toasts = (page) => page.evaluate(() => window.__toasts);
  // The app's status region, which says it to screen readers too.
  const announced = (page) => page.locator("div.visually-hidden[role=status]");

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__toasts = [];
      new MutationObserver(() => {
        const toast = document.querySelector(".keyboard-hint");
        if (toast && window.__toasts.at(-1) !== toast.textContent) window.__toasts.push(toast.textContent);
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto("/?plugin=figma");
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("a link pasted on the globe loads its look and design", async ({ page }) => {
    await page.locator("canvas").first().click();
    await paste(page, `${shareLink({ selection: "country:FRA" }, "/looks/halftone")}&app=1`);
    await expect.poll(() => toasts(page)).toEqual(["⌘VLoaded the design from your link"]);
    await expect(announced(page)).toHaveText("Loaded the design from your link");
    await openSheet(page);
    await expect(page.locator(".looks-chip", { hasText: "Halftone" })).toHaveClass(/is-current/);
    await expect(region(page)).toContainText("France");
  });

  test("anything else pasted on the globe changes nothing", async ({ page }) => {
    await page.locator("canvas").first().click();
    await paste(page, "https://example.com/looks/halftone");
    await expect.poll(() => toasts(page)).toEqual(["⌘VThat is not a Globestudio link"]);
    await expect(announced(page)).toHaveText("That is not a Globestudio link");
    await openSheet(page);
    await expect(page.locator(".looks-chip", { hasText: "Halftone" })).not.toHaveClass(/is-current/);
    await expect(region(page)).toContainText("World");
  });

  test("the share link field loads a pasted or typed link and says what happened", async ({ page }) => {
    await openSheet(page);
    const field = page.getByRole("textbox", { name: "Paste a share link" });
    const status = page.locator(".paste-link").getByRole("status");

    await field.click();
    await paste(page, shareLink({ version: 1, selection: "country:JPN", density: 70 }));
    await expect(status).toHaveText("Loaded the design from your link");
    await expect(region(page)).toContainText("Japan");
    await expect(field).toHaveValue("");
    // The field's line says it, so the status region doesn't say it again.
    await expect(announced(page)).toHaveText("");

    await paste(page, "not a link");
    await expect(status).toHaveText("That is not a Globestudio link");
    await expect(field).toHaveValue("not a link");
    await expect(region(page)).toContainText("Japan");
    await expectNoSeriousAxeViolations(page);

    await field.fill("https://www.globestudio.app/embed?look=aurora&selection=continent:Europe&theme=light");
    await field.press("Enter");
    await expect(status).toHaveText("Loaded the design from your link");
    await expect(page.locator(".looks-chip", { hasText: "Aurora" })).toHaveClass(/is-current/);
    await expect(region(page)).toContainText("Europe");

    await field.fill("https://globestudio.app/");
    await field.press("Enter");
    await expect(status).toHaveText("That link has no design in it");
  });

  test("a pasted design is what Insert sends", async ({ page }) => {
    await page.evaluate(() => {
      window.__inserts = [];
      window.addEventListener("message", (event) => {
        if (event.data?.type === "globestudio-insert") window.__inserts.push(event.data.presetName);
      });
    });
    await page.locator("canvas").first().click();
    await paste(page, shareLink({ selection: "country:BRA" }, "/looks/risograph"));
    await expect.poll(() => toasts(page)).toEqual(["⌘VLoaded the design from your link"]);
    await page.getByRole("button", { name: "Insert into Figma" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Insert into Figma" }).click();
    await expect.poll(() => page.evaluate(() => window.__inserts), { timeout: 60_000 }).toEqual(["Globestudio · Risograph"]);
  });
});
