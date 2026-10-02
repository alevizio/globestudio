import { expect, test } from "@playwright/test";

// Wider than a phone and narrower than 1280 px, the editor keeps the desktop
// layout: the panel on the left, the globe behind it. The globe was centred
// on the window, so the open panel covered part of it, and the control at
// the top centre sat on the panel's header and hid its Export button. The
// globe and the floating controls belong in the space beside the panel.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;

// Three red markers on the equator in the Pacific, 55 degrees apart, where
// no white map dot can wash one out. With the middle one facing the camera
// the globe's centre is halfway between the outer two. Glow off, as in the
// Data tests: its blurs make a page screenshot take over a minute in software
// compositing. Grid and network off: their lines cross or colour the markers.
const FACING = { lat: 0, lng: -158 };
const MARKERS = {
  v: 1,
  globeSettings: {
    glow: false,
    grid: false,
    network: false,
    dataPoints: [-55, 0, 55].map((turn) => ({ lat: FACING.lat, lng: ((FACING.lng + turn + 540) % 360) - 180, value: 10 })),
    dataMarkerColor: "#ff0000",
  },
};

// Left and right edge of the red pixels on screen, in CSS px.
const markerSpan = async (page) => {
  const png = await page.screenshot();
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const context = canvas.getContext("2d");
    context.drawImage(img, 0, 0);
    const { data } = context.getImageData(0, 0, img.width, img.height);
    let left = Infinity;
    let right = -Infinity;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 150 && data[i + 1] < 80 && data[i + 2] < 80) {
        const x = (i / 4) % img.width;
        left = Math.min(left, x);
        right = Math.max(right, x + 1);
      }
    }
    const cssPx = window.innerWidth / img.width;
    return { left: left * cssPx, right: right * cssPx, centre: ((left + right) / 2) * cssPx };
  }, png.toString("base64"));
};

// The boxes of the panel, its Export button and the floating controls, and
// what a click in the middle of Export would land on.
const measure = (page) =>
  page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } : null;
    };
    const exportSelector = '.control-rail [aria-label="Open export dialog"]';
    const exportButton = box(exportSelector);
    const hit = document.elementFromPoint(
      (exportButton.left + exportButton.right) / 2,
      (exportButton.top + exportButton.bottom) / 2,
    );
    return {
      panel: box(".control-rail"),
      exportButton,
      exportHit: hit?.closest(exportSelector) ? "Export" : hit?.className || hit?.tagName,
      controls: {
        "view switch": box(".view-mode-switch"),
        "keyboard hint": box(".onboarding-hint"),
        "zoom control": box(".map-zoom-controls"),
        "bug link": box(".bug-link"),
      },
    };
  });

const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

const screens = [
  // No keyboard hint on a touch screen: the view switch is the top control.
  { name: "an upright tablet", hint: false, use: { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true } },
  { name: "a short laptop window", hint: true, use: { viewport: { width: 1024, height: 600 } } },
];

for (const { name, hint, use } of screens) {
  test.describe(`on ${name}`, () => {
    // Reduced motion: the globe holds still, and turning it applies at once.
    test.use({ ...use, contextOptions: { reducedMotion: "reduce" } });

    test("the globe and the floating controls keep clear of the open panel", async ({ page }) => {
      await page.goto(`/?c=${encodeURIComponent(JSON.stringify(MARKERS))}`);
      // Entrances and fades off, so the boxes read below are the resting
      // ones and the hidden panel is gone from the next screenshot. The
      // vignette off: it darkens a marker near the window's edge past red.
      await page.addStyleTag({
        content:
          ".control-rail, .onboarding-hint { animation: none !important; transition: none !important; } .app-shell::after { display: none !important; }",
      });
      const canvas = page.locator(".globe-background canvas");
      await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
      await expect(page.locator(".control-rail")).not.toHaveClass(/is-collapsed/);
      // The hint shows for 12 s on a first visit with a mouse, so read the
      // layout while it is up.
      if (hint) await expect(page.locator(".onboarding-hint")).toBeVisible({ timeout: CANVAS_TIMEOUT });
      const { panel, exportButton, exportHit, controls } = await measure(page);
      if (!hint) delete controls["keyboard hint"];

      expect.soft(exportHit, "a click on Export lands on Export").toBe("Export");
      const onPanel = Object.keys(controls).filter((key) => overlaps(controls[key], panel));
      expect.soft(onPanel, "floating controls over the panel").toEqual([]);
      const onExport = Object.keys(controls).filter((key) => overlaps(controls[key], exportButton));
      expect.soft(onExport, "floating controls over Export").toEqual([]);

      const width = page.viewportSize().width;
      await expect
        .poll(() => page.evaluate(() => document.documentElement.hasAttribute("data-globe-painted")), { timeout: CANVAS_TIMEOUT })
        .toBe(true);
      await canvas.evaluate((node, { lat, lng }) => node.faceLatLng(lat, lng), FACING);
      // Panel open: the globe is in the middle of the space beside it, and
      // the leftmost marker (82% of the way to the globe's edge) is clear.
      const freeMiddle = (panel.right + width) / 2;
      await expect
        .poll(async () => Math.abs((await markerSpan(page)).centre - freeMiddle), { timeout: CANVAS_TIMEOUT })
        .toBeLessThan(4);
      expect((await markerSpan(page)).left).toBeGreaterThan(panel.right);

      // Panel hidden: nothing to keep clear of, so the middle of the window.
      await page.getByRole("button", { name: "Hide panel" }).click();
      await expect(page.locator(".control-rail")).toHaveClass(/is-collapsed/);
      await expect
        .poll(async () => Math.abs((await markerSpan(page)).centre - width / 2), { timeout: CANVAS_TIMEOUT })
        .toBeLessThan(4);
    });
  });
}
