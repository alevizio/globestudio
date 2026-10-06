import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import axeSource from "axe-core";

// First paint compiles the three.js graph through the dev server and warms up
// the swiftshader renderer, which is slow on CI — allow extra headroom there.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;

const waitForCanvas = async (page) => {
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await expect
    .poll(async () => canvas.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return node.width > 0 && node.height > 0 && rect.width > 100 && rect.height > 100;
    }), { timeout: CANVAS_TIMEOUT })
    .toBe(true);
  await expect
    .poll(async () => canvas.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return Math.round(rect.width * rect.height);
    }), { timeout: CANVAS_TIMEOUT })
    .toBeGreaterThan(10_000);
  const box = await canvas.boundingBox();
  expect(box.width).toBeGreaterThan(100);
  expect(box.height).toBeGreaterThan(100);
  return canvas;
};

// `include` narrows the audit to one CSS selector; the whole page without it.
const expectNoSeriousAxeViolations = async (page, include) => {
  await page.addScriptTag({ content: axeSource.source });
  const violations = await page.evaluate(async (selector) => {
    const result = await window.axe.run(selector ?? document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return result.violations
      .filter((violation) => ["serious", "critical"].includes(violation.impact))
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.map((node) => node.target.join(" ")),
      }));
  }, include);
  expect(violations).toEqual([]);
};

// Presses Tab `count` times and returns each focused element's name and
// effective opacity (its own times every ancestor's).
const walkTabStops = async (page, count) => {
  const stops = [];
  for (let i = 0; i < count; i += 1) {
    await page.keyboard.press("Tab");
    stops.push(await page.evaluate(() => {
      const el = document.activeElement;
      let opacity = 1;
      for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
        opacity *= Number(getComputedStyle(node).opacity);
      }
      return { label: el?.getAttribute("aria-label") || el?.textContent?.trim().slice(0, 30), opacity };
    }));
  }
  return stops;
};

// Canvas pixels painted in a pure red, the color the tests below give the
// markers or dots: how many, and the size of the box around them. Nothing
// else they draw comes close to it. A clipped page shot, not an element
// one: in the flat view under swiftshader the element screenshot's
// "stable" wait timed out on this canvas.
const redArea = async (page) => {
  const clip = await page.locator(".globe-background canvas").boundingBox();
  const png = await page.screenshot({ clip });
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
    let count = 0;
    let [left, top, right, bottom] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 150 && data[i + 1] < 80 && data[i + 2] < 80) {
        count += 1;
        const x = (i / 4) % img.width;
        const y = Math.floor(i / 4 / img.width);
        [left, top, right, bottom] = [Math.min(left, x), Math.min(top, y), Math.max(right, x), Math.max(bottom, y)];
      }
    }
    return { count, width: right - left + 1, height: bottom - top + 1 };
  }, png.toString("base64"));
};
const redPixels = async (page) => (await redArea(page)).count;

test("home renders the globe canvas", async ({ page }) => {
  await page.goto("/");
  await waitForCanvas(page);
  await expect(page.getByRole("heading", { name: /free dotted map and 3D globe generator/i })).toBeVisible();
});

test("preset routes apply the requested look", async ({ page }) => {
  await page.goto("/looks/halftone");
  await waitForCanvas(page);
  await expect(page.getByText(/Applied Halftone/i)).toBeVisible();
});

test("a look link's own settings win over the look", async ({ page }) => {
  await page.goto(`/looks/halftone?c=${encodeURIComponent(JSON.stringify({ v: 2, density: 77 }))}`);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("globestudio:density"))).toBe("77");
});

test("a look link that still ends in app=1, as the MCP server built them, opens its settings", async ({ page }) => {
  // app=1 was the pre-launch teaser bypass. The server no longer adds it,
  // and the links out there that carry it keep working.
  await page.goto(`/looks/halftone?c=${encodeURIComponent(JSON.stringify({ v: 2, density: 77 }))}&app=1`);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("globestudio:density"))).toBe("77");
});

test("a look link with only some settings keeps the look's glow, grid and shader", async ({ page }) => {
  // What an MCP link for Sonar with data points carries, plus one shader knob.
  const config = {
    v: 2,
    globeSettings: { dataPoints: [{ lat: 35.68, lng: 139.69, value: 3 }, { lat: 51.5, lng: -0.1, value: 2 }], dataArcs: true },
    shaderSettings: { intensity: 80 },
  };
  await page.goto(`/looks/topographic?c=${encodeURIComponent(JSON.stringify(config))}`);
  const saved = (key) => page.evaluate((name) => JSON.parse(localStorage.getItem(`globestudio:${name}`)), key);
  await expect.poll(() => saved("globeSettings")).toMatchObject({ glow: false, grid: false, dataArcs: true });
  expect((await saved("globeSettings")).dataPoints).toHaveLength(2);
  expect(await saved("shaderSettings")).toMatchObject({ effect: "wave", intensity: 80, warp: 55 });
});

test("an embed with a look and only some settings keeps the look's shader", async ({ page }) => {
  const config = { v: 2, shaderSettings: { intensity: 80 } };
  await page.goto(`/embed?look=topographic&c=${encodeURIComponent(JSON.stringify(config))}`);
  await waitForCanvas(page);
  await expect(page.locator(".globe-background")).toHaveClass(/\beffect-wave\b/);
});

test("an embed with a look draws a design copied from the studio as it is", async ({ page }) => {
  // As embed.js sends data-look with data-config. A design made on the
  // Default look carries no shader effect, and showed Halftone's.
  const { links } = JSON.parse(readFileSync("src/utils/fixtures/legacy-share-links.json", "utf8"));
  const { url } = links.find((link) => link.name === "studio link, default");
  await page.goto(`/embed?look=halftone&${new URL(url).search.slice(1)}`);
  await waitForCanvas(page);
  await expect(page.locator(".globe-background")).toHaveClass(/\beffect-none\b/);
});

test("<globe-studio look config> embeds the config over that look", async ({ page }) => {
  // The element points its iframe at globestudio.app; keep it off the
  // network and open the same embed address on this server instead.
  await page.route("https://globestudio.app/**", (route) => route.abort());
  await page.setContent("<!doctype html><title>Element</title><body></body>");
  await page.addScriptTag({ path: "packages/web-component/index.js", type: "module" });
  await page.waitForFunction(() => Boolean(customElements.get("globe-studio")));
  const config = JSON.stringify({ v: 2, shaderSettings: { intensity: 80 } });
  const src = await page.evaluate((value) => {
    const element = document.createElement("globe-studio");
    element.setAttribute("look", "topographic");
    element.setAttribute("config", value);
    document.body.append(element);
    return element.querySelector("iframe").src;
  }, config);
  const embed = new URL(src);
  expect(embed.searchParams.get("look")).toBe("topographic");
  await page.goto(`${embed.pathname}${embed.search}`);
  await waitForCanvas(page);
  await expect(page.locator(".globe-background")).toHaveClass(/\beffect-wave\b/);
});

test.describe('<globe-studio theme="light">', () => {
  test.use({ viewport: { width: 900, height: 600 }, contextOptions: { reducedMotion: "reduce" } });

  // Wireframe is see-through, so a page shot with no page color behind it
  // holds only the globe's own pixels: the share of the page they cover in
  // graphite, and in white.
  const inkShares = async (page) => {
    const png = await page.screenshot({ omitBackground: true });
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
      let graphite = 0;
      let white = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        if (Math.max(data[i], data[i + 1], data[i + 2]) < 110) graphite += 1;
        else if (Math.min(data[i], data[i + 1], data[i + 2]) > 200) white += 1;
      }
      const pixels = data.length / 4;
      return { graphite: graphite / pixels, white: white / pixels };
    }, png.toString("base64"));
  };

  test("draws Wireframe's ink in graphite for a light page, where it was white", async ({ page }) => {
    // As the test above: build the address with the element, open it here.
    await page.route("https://globestudio.app/**", (route) => route.abort());
    await page.setContent("<!doctype html><title>Element</title><body></body>");
    await page.addScriptTag({ path: "packages/web-component/index.js", type: "module" });
    await page.waitForFunction(() => Boolean(customElements.get("globe-studio")));
    const src = await page.evaluate(() => {
      const element = document.createElement("globe-studio");
      element.setAttribute("look", "wireframe");
      element.setAttribute("theme", "light");
      document.body.append(element);
      return element.querySelector("iframe").src;
    });
    const embed = new URL(src);
    expect(embed.searchParams.get("theme")).toBe("light");

    await page.goto(`${embed.pathname}${embed.search}`);
    await waitForCanvas(page);
    await expect.poll(async () => (await inkShares(page)).graphite, { timeout: CANVAS_TIMEOUT }).toBeGreaterThan(0.05);
    expect((await inkShares(page)).white).toBeLessThan(0.001);

    // The same address without the theme: the ink is white, which a light
    // page doesn't show.
    embed.searchParams.delete("theme");
    await page.goto(`${embed.pathname}${embed.search}`);
    await waitForCanvas(page);
    await expect.poll(async () => (await inkShares(page)).white, { timeout: CANVAS_TIMEOUT }).toBeGreaterThan(0.05);
    expect((await inkShares(page)).graphite).toBeLessThan(0.001);
  });

  test("draws Halftone's ink in graphite where the page shows through, with the config the docs pair it with", async ({ page }) => {
    // Halftone paints a dark page of its own, where graphite ink is lost, so
    // the docs make it see-through in the config as well.
    await page.route("https://globestudio.app/**", (route) => route.abort());
    await page.setContent("<!doctype html><title>Element</title><body></body>");
    await page.addScriptTag({ path: "packages/web-component/index.js", type: "module" });
    await page.waitForFunction(() => Boolean(customElements.get("globe-studio")));
    const src = await page.evaluate(() => {
      const element = document.createElement("globe-studio");
      element.setAttribute("look", "halftone");
      element.setAttribute("theme", "light");
      element.setAttribute("config", '{"backgroundStyle":"transparent"}');
      document.body.append(element);
      return element.querySelector("iframe").src;
    });
    const embed = new URL(src);
    await page.goto(`${embed.pathname}${embed.search}`);
    await waitForCanvas(page);
    await expect.poll(async () => (await inkShares(page)).graphite, { timeout: CANVAS_TIMEOUT }).toBeGreaterThan(0.05);
    // Most of the page shows through: Halftone's own dark page would count
    // as graphite nearly everywhere.
    const { graphite, white } = await inkShares(page);
    expect(graphite).toBeLessThan(0.5);
    expect(white).toBeLessThan(0.001);
  });
});

test("embed.js draws the design of a whole share link pasted into data-config", async ({ page }) => {
  // A link the MCP server built, app=1 and all. The script points its iframe
  // at globestudio.app; keep it off the network and open the same embed
  // address on this server instead.
  await page.route("https://globestudio.app/**", (route) => route.abort());
  await page.setContent("<!doctype html><title>Loader</title><body></body>");
  const config = JSON.stringify({ v: 2, shaderSettings: { effect: "wave" } });
  await page.evaluate((link) => {
    const div = document.createElement("div");
    div.setAttribute("data-globestudio", "");
    div.setAttribute("data-config", link);
    document.body.append(div);
  }, `https://globestudio.app/looks/halftone?c=${encodeURIComponent(config)}&app=1`);
  await page.addScriptTag({ path: "public/embed.js" });
  const embed = new URL(await page.locator("[data-globestudio] iframe").getAttribute("src"));
  await page.goto(`${embed.pathname}${embed.search}`);
  await waitForCanvas(page);
  await expect(page.locator(".globe-background")).toHaveClass(/\beffect-wave\b/);
});

test.describe("an embed of a look alone", () => {
  test.use({ viewport: { width: 900, height: 600 }, contextOptions: { reducedMotion: "reduce" } });

  // The look as the studio holds it on /looks/<id>. A setting is saved once
  // it changes, so one that stays at the studio's default isn't there.
  const studioLook = async (page, id) => {
    await page.goto(`/looks/${id}`);
    await waitForCanvas(page);
    const saved = (key) => page.evaluate((name) => JSON.parse(localStorage.getItem(`globestudio:${name}`)), key);
    await expect.poll(() => saved("dotSize"), { timeout: CANVAS_TIMEOUT }).not.toBeNull();
    return {
      density: await saved("density"),
      dotSize: await saved("dotSize"),
      transparent: (await saved("transparent")) === true,
      page: await page.locator(".app-shell").evaluate((node) => node.style.getPropertyValue("--preview-bg")),
    };
  };

  // A screenshot once two in a row match, so the globe has settled.
  const settledShot = async (page, path) => {
    await page.goto(path);
    await waitForCanvas(page);
    let shot = null;
    await expect
      .poll(async () => {
        const previous = shot;
        await page.waitForTimeout(300);
        shot = await page.screenshot();
        return Boolean(previous?.equals(shot));
      }, { timeout: CANVAS_TIMEOUT })
      .toBe(true);
    return shot;
  };

  // Share of pixels that differ between two screenshots, counting a pixel
  // when any channel is off by more than 16.
  const shotDiff = (page, a, b) =>
    page.evaluate(async (urls) => {
      const [x, y] = await Promise.all(urls.map(async (url) => {
        const img = new Image();
        img.src = url;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0);
        return context.getImageData(0, 0, img.width, img.height);
      }));
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

  for (const id of ["pixel", "wireframe"]) {
    test(`draws ${id} with the studio's density, dot size and page`, async ({ page }) => {
      const look = await studioLook(page, id);
      const own = await settledShot(page, `/embed?look=${id}&static=1`);
      if (look.transparent) {
        await expect(page.locator('.embed-view[data-transparent="true"]')).toHaveCount(1);
      } else {
        await expect(page.locator(".embed-view")).toHaveCSS("--preview-bg", look.page);
      }
      // The same embed with the studio's values in its address.
      const pageParam = look.transparent ? "transparent=1" : `background=${look.page.slice(1)}`;
      const named = await settledShot(page, `/embed?look=${id}&static=1&density=${look.density}&dotSize=${look.dotSize}&${pageParam}`);
      expect(await shotDiff(page, own, named)).toBeLessThan(0.01);
    });
  }
});

test.describe("a US state in a share link", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  const link = (path, config) => `${path}?c=${encodeURIComponent(JSON.stringify({ v: 2, selection: "country:USA", ...config }))}`;

  test("opens the studio on the state its postal code names", async ({ page }) => {
    await page.goto(link("/", { stateSelection: "CA" }));
    await expect(page.getByRole("button", { name: "State: California" })).toBeVisible({ timeout: CANVAS_TIMEOUT });
  });

  test("opens the whole country for a code the app doesn't know, not the first state", async ({ page }) => {
    await page.goto(link("/", { stateSelection: "ZZ" }));
    await expect(page.getByRole("button", { name: "State: All States" })).toBeVisible({ timeout: CANVAS_TIMEOUT });
  });

  test("draws only that state in an embed, as the studio does", async ({ page }) => {
    // Red dots on a flat map, so every dot faces the camera. The country's
    // dots spread wide; California's, which the state view fits to the
    // frame as the studio does, stand tall.
    const design = { viewMode: "flat", dotColor: "#ff0000", background: "#000000", globeSettings: { glow: false } };
    const shape = async () => {
      const { count, width, height } = await redArea(page);
      return count > 500 ? width / height : null;
    };
    await page.goto(link("/embed", design));
    await waitForCanvas(page);
    await expect.poll(shape, { timeout: CANVAS_TIMEOUT }).toBeGreaterThan(1);
    await page.goto(link("/embed", { ...design, stateSelection: "06" }));
    await waitForCanvas(page);
    await expect.poll(shape, { timeout: CANVAS_TIMEOUT }).toBeLessThan(0.8);
  });
});

test("retired look URLs land on the gallery", async ({ page }) => {
  // vercel.json 308s these before the app loads. The dev server has no
  // redirects, so this checks the router sends them to the same place.
  for (const look of ["particles", "ascii"]) {
    await page.goto(`/looks/${look}`);
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(page.getByRole("heading", { level: 1, name: "Looks gallery" })).toBeVisible();
  }
});

test("embed route renders canvas-only output", async ({ page }) => {
  await page.goto("/embed?look=halftone&density=60&autoSpin=1");
  await waitForCanvas(page);
  await expect(page.locator(".control-rail")).toHaveCount(0);
  await expect(page.locator(".looks-bar")).toHaveCount(0);
});

test("keyboard shortcuts expose core workflows", async ({ page }) => {
  await page.goto("/");
  await waitForCanvas(page);

  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeVisible();
  const shortcutsDialog = page.getByRole("dialog", { name: /keyboard shortcuts/i });
  await page.keyboard.press("Escape");
  await expect(shortcutsDialog).toBeHidden();

  await page.keyboard.press("d");
  await expect(page.getByRole("dialog", { name: /export/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /export/i })).toBeHidden();

  await page.keyboard.press("g");
  await expect(page.getByText(/Switched to flat view/i)).toBeVisible();
  await page.keyboard.press("s");
  await expect(page.getByText(/Shuffled to/i)).toBeVisible();
});

test("PNG export announces 'PNG saved' via the aria-live status region", async ({ page }) => {
  // Glow off: it is a CSS filter on the canvas, never in the PNG, and its six
  // drop-shadow blurs take seconds per frame in software compositing on a 2
  // CPU Linux runner. The capture's toBlob waits behind those frames for 20 s
  // or more, which trips the 8 s watchdog and the slower Canvas2D fallback.
  await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 1, globeSettings: { glow: false } }))}`);
  await waitForCanvas(page);
  await page.keyboard.press("d");
  const exportButton = page.getByRole("button", { name: /export png/i });
  await expect(exportButton).toBeVisible();
  await expect(exportButton).toBeEnabled();

  // The globe repaints every frame behind the modal, so a normal click stalls
  // on the actionability "stable" check, and a forced click still waits on
  // page responsiveness (it can hang when software-GL rendering janks the main
  // thread). Trigger the React handler directly in-page with neither wait.
  await exportButton.evaluate((el) => el.click());

  // Assert the aria-live status region (bound to `statusMessage` in App.jsx),
  // which flashPngSaved() sets to "PNG saved" after a real PNG blob reaches
  // downloadBlob(). This text is NEVER cleared by a timer — only the button's
  // separate `pngStatus` CTA resets to "idle" after 1.8 s — so it's stable to
  // assert here even under slow CI software-GL captures. (Contract: if a future
  // change adds a timer that clears `statusMessage`, this assertion will start
  // flaking.) The old test monkey-patched URL.createObjectURL / anchor.click,
  // which raced downloadBlob()'s synchronous revokeObjectURL and recorded
  // nothing. captureAtScale → SwiftShader → toBlob is slow on CI.
  await expect(page.locator('.app-shell > .visually-hidden[role="status"]'))
    .toHaveText(/PNG saved/i, { timeout: process.env.CI ? 45_000 : 30_000 });
});

test("a PNG export that yields no image says so in the dialog", async ({ page }) => {
  await page.goto("/");
  await waitForCanvas(page);
  await page.evaluate(() => {
    // Hi-res capture fails, then the Canvas2D fallback gets no context, the
    // way iOS answers a canvas over its area limit at High and Ultra.
    const globe = [...document.querySelectorAll("canvas")]
      .find((node) => typeof node.captureAtScale === "function");
    Object.defineProperty(globe, "captureAtScale", {
      configurable: true,
      get: () => () => Promise.reject(new Error("capture failed in test")),
      set: () => {},
    });
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (type === "2d" && !this.isConnected) return null;
      return getContext.call(this, type, ...rest);
    };
  });
  await page.keyboard.press("d");
  const dialog = page.getByRole("dialog", { name: /export/i });
  const exportButton = dialog.getByRole("button", { name: /export png/i });
  await expect(exportButton).toBeEnabled();
  // Same in-page click as the test above: the repainting globe stalls a normal click.
  await exportButton.evaluate((el) => el.click());
  await expect(dialog.getByRole("alert")).toHaveText(/Export failed/);
  await expect(page.locator('.app-shell > .visually-hidden[role="status"]')).not.toHaveText(/PNG saved/i);
  await expect(exportButton).toBeEnabled();

  // Closing the dialog clears the message; it doesn't greet the next visit.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.keyboard.press("d");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
});

test.describe("Copy image", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  // Size and corner pixels of a PNG blob, read in the page.
  const describePng = async (blob) => {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0);
    const pixel = (x, y) => [...context.getImageData(x, y, 1, 1).data];
    return {
      size: [bitmap.width, bitmap.height],
      corners: [pixel(0, 0), pixel(bitmap.width - 1, 0), pixel(0, bitmap.height - 1), pixel(bitmap.width - 1, bitmap.height - 1)],
    };
  };

  test("puts the PNG that Export PNG would save on the clipboard", async ({ page }) => {
    // Keep the file Export PNG hands to the download, to compare with.
    await page.addInitScript(() => {
      window.__pngs = [];
      const create = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (blob) => {
        if (blob?.type === "image/png") window.__pngs.push(blob);
        return create(blob);
      };
    });
    // Glow off, as in the PNG saved test. The background is the color the
    // corners of both images should come back with.
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 1, background: "#204060", globeSettings: { glow: false } }))}`);
    await waitForCanvas(page);
    await page.keyboard.press("d");
    const dialog = page.getByRole("dialog", { name: /export/i });
    const press = (locator) => locator.evaluate((el) => el.click());
    // A square at Draft (1x) keeps both images small. The size fields follow
    // each choice a render later, so wait for them before pressing on.
    const width = dialog.getByLabel("Export width");
    const height = dialog.getByLabel("Export height");
    await press(dialog.getByRole("button", { name: "1:1" }));
    await expect.poll(async () => (await width.inputValue()) === (await height.inputValue())).toBe(true);
    const side = Number(await width.inputValue()) / 2;
    await press(dialog.getByRole("button", { name: "Draft" }));
    await expect(width).toHaveValue(String(side));
    await expect(height).toHaveValue(String(side));

    const copy = dialog.getByRole("button", { name: "Copy image" });
    await expect(copy).toHaveClass(/is-secondary/);
    await press(copy);
    const timeout = process.env.CI ? 45_000 : 30_000;
    await expect(dialog.getByRole("status")).toHaveText("Image copied to clipboard", { timeout });
    const copied = await page.evaluate(async (describe) => {
      const [item] = await navigator.clipboard.read();
      const blob = await item.getType("image/png");
      return { types: item.types, ...(await new Function(`return (${describe})`)()(blob)) };
    }, describePng.toString());
    expect(copied.types).toEqual(["image/png"]);
    expect(copied.size).toEqual([side, side]);
    expect(copied.corners).toEqual(Array(4).fill([32, 64, 96, 255]));
    // Nothing was downloaded by the copy.
    expect(await page.evaluate(() => window.__pngs.length)).toBe(0);

    await press(dialog.getByRole("button", { name: /export png/i }));
    await expect(page.locator('.app-shell > .visually-hidden[role="status"]')).toHaveText(/PNG saved/i, { timeout });
    const saved = await page.evaluate(
      (describe) => new Function(`return (${describe})`)()(window.__pngs.at(-1)),
      describePng.toString(),
    );
    expect({ size: copied.size, corners: copied.corners }).toEqual(saved);
  });
});

test.describe("with reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  // Share of pixels that differ between two PNG frames, decoded in the page.
  const changedShare = (page, a, b) =>
    page.evaluate(async ([first, second]) => {
      const pixels = async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0);
        return context.getImageData(0, 0, img.width, img.height).data;
      };
      const [p, q] = [await pixels(first), await pixels(second)];
      let changed = 0;
      for (let i = 0; i < p.length; i += 4) {
        if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 12) changed += 1;
      }
      return changed / (p.length / 4);
    }, [a.toString("base64"), b.toString("base64")]);

  // Animated, Glitch and Bad TV change about 12% of the canvas every
  // second. Frozen, the frame settles once the camera's easing ends. (Aurora
  // runs on the same uTime path but takes most of a minute to draw under
  // swiftshader, so it is left out.)
  for (const look of ["glitch", "badtv"]) {
    test(`the ${look} look holds still`, async ({ page }) => {
      await page.goto(`/looks/${look}`);
      await waitForCanvas(page);
      const canvas = page.locator(".globe-background canvas");
      await expect
        .poll(async () => {
          const first = await canvas.screenshot();
          await page.waitForTimeout(1000);
          const second = await canvas.screenshot();
          return changedShare(page, first, second);
        }, { timeout: CANVAS_TIMEOUT, intervals: [0] })
        .toBeLessThan(0.005);
    });
  }

  // Desktop hides the chrome with a 260ms fade that headless swiftshader never
  // finishes; reduced motion drops the fade, so the end state can be checked.
  test("chrome hidden with the panel takes no keyboard focus on desktop", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Hide panel" }).click();
    await expect(page.getByRole("button", { name: "Show panel" })).toBeVisible();
    const stops = await walkTabStops(page, 12);
    expect(stops.map((stop) => stop.label)).toContain("Show panel");
    expect(stops.filter((stop) => stop.opacity < 0.1).map((stop) => stop.label)).toEqual([]);
  });
});

test.describe("the Data section", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("its paste box shows the points a share link loads and keeps them on edit", async ({ page }) => {
    const points = [
      { lat: 40.7, lng: -74, value: 10 },
      { lat: 51.5, lng: -0.1, value: 10 },
      { lat: 35.7, lng: 139.7, value: 10 },
    ];
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 1, globeSettings: { dataPoints: points } }))}`);
    // The link is applied after the panel mounts, so the box has to pick
    // the points up then, not only when it first renders.
    await page.getByRole("button", { name: "Data", exact: true }).click();
    const box = page.getByRole("textbox", { name: /Data points/ });
    await expect(box).toHaveValue("40.7,-74,10\n51.5,-0.1,10\n35.7,139.7,10");

    // Change the middle line's value one key at a time. Each key has to land
    // where the caret was put, so the box can't be rewritten mid typing.
    const middleLineEnd = "40.7,-74,10\n51.5,-0.1,10".length;
    await box.evaluate((node, at) => {
      node.focus();
      node.setSelectionRange(at, at);
    }, middleLineEnd);
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("25");
    await expect(box).toHaveValue("40.7,-74,10\n51.5,-0.1,25\n35.7,139.7,10");
    expect(await box.evaluate((node) => node.selectionStart)).toBe(middleLineEnd);
    await expect(page.getByText(/^3 points plotted\./)).toBeVisible();
    // The other two points are kept in the saved settings, not just the box.
    await expect
      .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("globestudio:globeSettings"))?.dataPoints))
      .toEqual([points[0], { ...points[1], value: 25 }, points[2]]);
  });

  test("Try an example plots eight cities, and undo or clearing the box brings it back", async ({ page }) => {
    // Three pixel polls on swiftshader: up to 50 s locally beside the other
    // Data tests, close to the default limit, so give it the eye test's headroom.
    test.slow();
    // Flat view with red markers and glow off, as in the eye test below, so
    // every marker faces the camera and the pixel count stays quick.
    const config = { v: 1, viewMode: "flat", globeSettings: { glow: false, dataPoints: [], dataMarkerColor: "#ff0000" } };
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify(config))}`);
    await waitForCanvas(page);
    expect(await redPixels(page)).toBe(0);
    const savedPoints = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("globestudio:globeSettings"))?.dataPoints?.length);

    const disclosure = page.getByRole("button", { name: "Data", exact: true });
    await disclosure.click();
    const box = page.getByRole("textbox", { name: /Data points/ });
    const example = page.getByRole("button", { name: "Try an example" });
    await expect(box).toHaveValue("");
    await expect(example).toBeVisible();
    await expectNoSeriousAxeViolations(page);

    await example.click();
    await expect(box).toHaveValue(/^40\.71,-74\.01,19\n19\.43,-99\.13,22\n/);
    expect((await box.inputValue()).split("\n")).toHaveLength(8);
    await expect(page.getByText(/^8 points plotted\./)).toBeVisible();
    await expect.poll(savedPoints).toBe(8);
    // The button goes away and leaves focus in the box, not on the page.
    await expect(example).toBeHidden();
    await expect(box).toBeFocused();

    // Undo in the box takes the example back out, and the button returns.
    await page.keyboard.press("ControlOrMeta+z");
    await expect(box).toHaveValue("");
    await expect(example).toBeVisible();
    await expect.poll(savedPoints).toBe(0);

    // The markers draw. Close the section to count them: its marker color
    // swatch is the same red and would pass for markers while it shows.
    await example.click();
    await disclosure.click();
    await expect.poll(() => redPixels(page), { timeout: CANVAS_TIMEOUT }).toBeGreaterThan(20);

    // Clearing the box by hand brings the button back and the markers go.
    await disclosure.click();
    await box.press("ControlOrMeta+a");
    await box.press("Backspace");
    await expect(box).toHaveValue("");
    await expect(example).toBeVisible();
    await expect.poll(savedPoints).toBe(0);
    await disclosure.click();
    await expect.poll(() => redPixels(page), { timeout: CANVAS_TIMEOUT }).toBe(0);
  });

  test("its eye hides the markers and keeps the pasted points", async ({ page }) => {
    // Two cold canvas boots (the reload) plus pixel polls: over a minute on
    // swiftshader locally, so give CI's slower runners the headroom.
    test.slow();
    // Flat view, so every marker faces the camera and none sits behind the globe.
    // Glow off: its six drop-shadow blurs on the full-screen canvas made one
    // page screenshot take over a minute in software compositing on a 2 CPU
    // Linux runner, longer than the pixel polls wait. The markers don't need it.
    const config = {
      v: 1,
      viewMode: "flat",
      globeSettings: {
        glow: false,
        dataPoints: [
          { lat: 40.7, lng: -74, value: 10 },
          { lat: 51.5, lng: -0.1, value: 10 },
          { lat: 35.7, lng: 139.7, value: 10 },
          { lat: -23.5, lng: -46.6, value: 10 },
        ],
        dataMarkerColor: "#ff0000",
      },
    };
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify(config))}`);
    await waitForCanvas(page);
    await expect.poll(() => redPixels(page), { timeout: CANVAS_TIMEOUT }).toBeGreaterThan(20);

    const disclosure = page.getByRole("button", { name: "Data", exact: true });
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    const eye = page.getByRole("button", { name: "Show data markers" });
    await expect(eye).toHaveAttribute("aria-pressed", "true");
    await eye.click();
    await expect(eye).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => redPixels(page), { timeout: CANVAS_TIMEOUT }).toBe(0);

    // Hidden, not deleted: after a reload the eye is still off and the
    // points are still in the paste box, ready to come back.
    await page.reload();
    await waitForCanvas(page);
    await expect(eye).toHaveAttribute("aria-pressed", "false");
    // The view isn't saved, so the reload opens in Globe view, where most
    // markers are out of sight. Back to Flat so all four can be counted.
    const flat = page.getByRole("button", { name: "Flat view", exact: true });
    await flat.click();
    await expect(flat).toHaveAttribute("aria-pressed", "true");
    await disclosure.click();
    await expect(page.getByRole("textbox", { name: /Data points/ })).toHaveValue(/^40\.7,-74,10\n51\.5,-0\.1,10/);
    // Close the section before counting again: its marker color swatch is
    // the same red and sits over the canvas, so while it shows it passes for
    // markers and the count below could never fail.
    await disclosure.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(await redPixels(page)).toBe(0);
    await eye.click();
    await expect.poll(() => redPixels(page), { timeout: CANVAS_TIMEOUT }).toBeGreaterThan(20);
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    test("Try an example fills the box on a tap and keeps the keyboard shut", async ({ page }) => {
      await page.goto("/");
      await waitForCanvas(page);
      await page.getByRole("button", { name: "All options", expanded: false }).tap();
      await page.getByRole("button", { name: "Data", exact: true }).tap();
      const box = page.getByRole("textbox", { name: /Data points/ });
      const example = page.getByRole("button", { name: "Try an example" });
      await expect(example).toBeVisible();
      await expectNoSeriousAxeViolations(page);

      await example.tap();
      await expect(box).toHaveValue(/^40\.71,-74\.01,19\n/);
      await expect(page.getByText(/^8 points plotted\./)).toBeVisible();
      await expect(example).toBeHidden();
      // Focus in the box would open the phone's keyboard over the markers.
      await expect(box).not.toBeFocused();

      await box.fill("");
      await expect(example).toBeVisible();
    });
  });
});

test("the look just picked keeps a readable label while its chip pulses", async ({ page }) => {
  await page.goto("/");
  // The chip is current and applied at once for only about 0.7 s, so catch
  // the moment the classes land instead of polling. Transitions off, so the
  // colors read then are the ones the rules set.
  await page.addStyleTag({ content: ".looks-chip { transition: none !important; }" });
  const label = page.evaluate(() => new Promise((resolve) => {
    const read = () => {
      const node = document.querySelector(".looks-chip.is-current.is-applied");
      if (!node) return false;
      const style = getComputedStyle(node);
      resolve(style.color === style.backgroundColor ? `unreadable: ${style.color}` : "readable");
      return true;
    };
    const observer = new MutationObserver(() => { if (read()) observer.disconnect(); });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
  }));
  // By keyboard, so no pointer hovers the chip: the hover style has readable
  // colors of its own and would hide the bug (the bar re-centering after a
  // click also slides the chip out from under the pointer).
  await page.locator(".looks-chip", { hasText: "Halftone" }).focus();
  await page.keyboard.press("Enter");
  expect(await label).toBe("readable");
});

test("the phone sheet lists Data between Network and Animations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const disclosures = page.locator(".control-panel .option-block-disclosure");
  await expect(disclosures.filter({ hasText: /^Data$/ })).toHaveCount(1);
  const titles = await disclosures.allTextContents();
  expect(titles.indexOf("Data")).toBe(titles.indexOf("Network") + 1);
  expect(titles.indexOf("Animations")).toBe(titles.indexOf("Data") + 1);
});

test("mobile home does not overflow horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitForCanvas(page);
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow).toBe(false);
});

test.describe("on a phone with the sheet collapsed", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("the visible sheet is in the accessibility tree", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await expect(page.locator(".control-rail")).toHaveClass(/is-collapsed/);
    // getByRole skips anything under aria-hidden, like a screen reader does.
    await expect(page.getByRole("button", { name: "Open export dialog" })).toBeVisible();
    await expect(page.getByRole("button", { name: "All options", expanded: false })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });

  test("chrome faded out with the panel takes no keyboard focus", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    const stops = await walkTabStops(page, 12);
    expect(stops.filter((stop) => stop.opacity < 0.1).map((stop) => stop.label)).toEqual([]);
  });
});

test.describe("on a short phone screen", () => {
  // iPhone 14's Safari viewport.
  test.use({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });

  test("Export PNG is on screen and clickable without scrolling the dialog", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Open export dialog" }).click();
    await expect(page.getByRole("dialog", { name: /export/i })).toBeVisible();
    const cta = page.getByRole("button", { name: /export png/i });
    await expect(cta).toBeVisible();
    const reachable = await cta.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return rect.bottom <= window.innerHeight && Boolean(hit && el.contains(hit));
    });
    expect(reachable).toBe(true);
    // Opaque on phones, so the control sheet can't read through the text.
    const background = await page.locator(".export-modal").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).toMatch(/^rgb\(/);
  });
});

test.describe("on a phone, swiping the sheet", () => {
  test.use({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });

  // Real touch input through Chromium's gesture pipeline, so native scrolling
  // and scroll chaining happen exactly as they would under a finger.
  const swipe = async (page, x, y, dy) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= 12; i += 1) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + (dy * i) / 12 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  // Waits out the sheet's open/close spring so boxes are read at rest.
  const settled = (locator) =>
    expect.poll(() => locator.evaluate((el) => el.getAnimations().length)).toBe(0);
  const box = (locator) => locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, height: rect.height };
  });

  test("keeps the look's copy in the sheet and the page still", async ({ page }) => {
    await page.goto("/looks/halftone");
    await waitForCanvas(page);
    await expect(page.locator(".control-rail .preset-detail")).toHaveCount(1);
    const rail = page.locator(".control-rail");
    await page.getByRole("button", { name: "All options", expanded: false }).click();
    await expect(rail).not.toHaveClass(/is-collapsed/);
    await settled(rail);
    const sheet = await box(rail);
    for (let i = 0; i < 3; i += 1) await swipe(page, sheet.x, sheet.y + 120, -300);
    await expect.poll(() => rail.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => [window.scrollY, document.scrollingElement.scrollHeight - window.innerHeight])).toEqual([0, 0]);
    // The grabber stays on top of the list scrolling under it.
    const grabber = await box(page.locator(".mobile-drag-handle"));
    const onTop = await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest(".mobile-drag-handle")), grabber);
    expect(onTop).toBe(true);
  });

  test("opens from the peek and closes from the list, with a 44px grabber", async ({ page }) => {
    await page.goto("/");
    await waitForCanvas(page);
    const rail = page.locator(".control-rail");
    const grabber = page.locator(".mobile-drag-handle");
    await expect(rail).toHaveClass(/is-collapsed/);
    await settled(rail);
    expect((await box(grabber)).height).toBe(44);
    const looks = await box(page.locator(".looks-bar"));
    await swipe(page, looks.x, looks.y, -200);
    await expect(rail).not.toHaveClass(/is-collapsed/);
    await settled(rail);
    const section = await box(page.locator(".option-block-header").first());
    await swipe(page, section.x, section.y, 200);
    await expect(rail).toHaveClass(/is-collapsed/);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

for (const path of ["/", "/docs", "/integrations", "/brand", "/privacy", "/terms"]) {
  test(`axe has no serious violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    if (path === "/") await waitForCanvas(page);
    // /privacy and /terms are lazy routes: audit the page, not the Suspense
    // fallback.
    if (path === "/privacy") {
      await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
    }
    if (path === "/terms") {
      await expect(page.getByRole("heading", { level: 1, name: "Terms of use" })).toBeVisible();
    }
    await expectNoSeriousAxeViolations(page);
  });
}

test("/terms shows the terms of use, links the privacy page and gives GitHub issues as the only contact", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1, name: "Terms of use" })).toBeVisible();
  await expect(page).toHaveTitle("Terms of use · Globestudio");
  for (const name of ["Using Globestudio", "What you make", "Map data", "Source code", "The service", "Liability", "Privacy", "Changes", "Contact"]) {
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  }
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "privacy page" })).toHaveAttribute("href", "/privacy");
  await expect(main.getByRole("link", { name: "github.com/alevizio/globestudio/issues" })).toHaveAttribute(
    "href",
    "https://github.com/alevizio/globestudio/issues",
  );
  // Ale's call: no email address anywhere on the policy pages.
  expect(await main.innerText()).not.toMatch(/\S+@\S+\.\w+/);
  await expect(main.locator('a[href^="mailto:"]')).toHaveCount(0);
});

for (const path of ["/docs", "/privacy", "/terms"]) {
  test(`the footer on ${path} links Privacy and Terms`, async ({ page }) => {
    await page.goto(path);
    const footer = page.getByRole("navigation", { name: "Site links" });
    await expect(footer.getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute("href", "/privacy");
    await expect(footer.getByRole("link", { name: "Terms", exact: true })).toHaveAttribute("href", "/terms");
  });
}

// The React starter's degit command, on the two pages that offer it.
test.describe("React starter on a 320px wide phone", () => {
  test.use({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, permissions: ["clipboard-read", "clipboard-write"] });

  const DEGIT = "npx degit alevizio/globestudio/examples/starter-react my-globe";
  const STACKBLITZ = "https://stackblitz.com/github/alevizio/globestudio/tree/main/examples/starter-react";

  for (const [path, label, link] of [
    ["/docs", "degit", "open it in StackBlitz"],
    ["/integrations", "Starter project", "Open the starter in StackBlitz →"],
  ]) {
    test(`${path} keeps the command in its box, copies it whole and links to StackBlitz`, async ({ page }) => {
      await page.goto(path);
      const block = page.locator(".code-block").filter({ has: page.locator(".code-block-language", { hasText: new RegExp(`^${label}$`) }) });
      const pre = block.locator("pre");
      await expect(pre).toHaveText(DEGIT);
      await block.scrollIntoViewIfNeeded();
      // The path is one argument too long for the box: the box scrolls, by
      // keyboard too, and the page does not.
      expect(await pre.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
      await expect(pre).toHaveAttribute("tabindex", "0");
      await expect(pre).toHaveAttribute("aria-label", label);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
      await block.getByRole("button", { name: "Copy code to clipboard" }).click();
      await expect(block.getByRole("button", { name: "Copied" })).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(DEGIT);
      await expect(page.getByRole("link", { name: link, exact: true })).toHaveAttribute("href", STACKBLITZ);
      // The starter's block only: at this width the pages' other snippets
      // scroll without taking focus, which this test doesn't cover.
      await expectNoSeriousAxeViolations(page, `.code-block[data-language="${label}"]`);
    });
  }
});

// A command box joins the tab order only while it scrolls. The code font
// often loads after the first measure and runs narrower than the fallback,
// so a box that fits once it lands must leave the tab order again.
for (const width of [320, 390]) {
  test.describe(`command boxes at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });

    for (const [path, labels] of [
      ["/docs", ["degit"]],
      ["/integrations", ["Claude Code", "Codex", "Cursor mcp.json", "Local server", "GitHub CLI", "Claude Code plugin", "Starter project"]],
    ]) {
      test(`${path} puts a box in the tab order only while it scrolls`, async ({ page }) => {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        const mismatched = () =>
          page.evaluate(
            (names) =>
              names.filter((name) => {
                const pre = document.querySelector(`.code-block[data-language="${name}"] pre`);
                return pre.scrollWidth > pre.clientWidth !== pre.hasAttribute("tabindex");
              }),
            labels,
          );
        await expect.poll(mismatched).toEqual([]);
      });
    }
  });
}

test("axe passes with export modal open and focus returns on close", async ({ page }) => {
  await page.goto("/");
  await waitForCanvas(page);
  const trigger = page.getByRole("button", { name: /export/i }).first();
  await trigger.focus();
  await trigger.press("Enter");
  await expect(page.getByRole("dialog", { name: /export/i })).toBeVisible();
  await expectNoSeriousAxeViolations(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /export/i })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test.describe("export dialog on a 320px wide phone", () => {
  test.use({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });

  test("every tab fits the dialog with its label whole, and the last one opens with a tap", async ({ page }) => {
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 1, globeSettings: { glow: false } }))}`);
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Open export dialog" }).click();
    const dialog = page.getByRole("dialog", { name: /export/i });
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.evaluate((el) => el.getAnimations().length)).toBe(0);

    const tablist = dialog.getByRole("tablist", { name: "Export type" });
    const row = await tablist.evaluate((list) => {
      const edge = list.getBoundingClientRect();
      return {
        left: edge.left,
        right: edge.right,
        overflows: list.scrollWidth > list.clientWidth,
        tabs: [...list.querySelectorAll('[role="tab"]')].map((tab) => {
          const rect = tab.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return {
            label: tab.textContent,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
            clipped: tab.scrollWidth > tab.clientWidth,
            reachable: hit === tab,
          };
        }),
      };
    });
    // Six tabs don't fit this row, so the Figma tab is left out on a phone.
    expect(row.tabs.map((tab) => tab.label)).toEqual(["Image", "Video", "SVG", "Share", "MCP"]);
    expect(row.overflows).toBe(false);
    for (const tab of row.tabs) {
      expect(tab.left, tab.label).toBeGreaterThanOrEqual(row.left);
      expect(tab.right, tab.label).toBeLessThanOrEqual(row.right + 0.5);
      expect(tab.clipped, tab.label).toBe(false);
      expect(tab.reachable, tab.label).toBe(true);
      // The row keeps its height. WCAG 2.5.8 asks for 24px each way.
      expect(tab.width, tab.label).toBeGreaterThanOrEqual(24);
      expect(tab.height, tab.label).toBeGreaterThanOrEqual(38);
    }

    const last = tablist.getByRole("tab").last();
    await last.tap();
    await expect(last).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByRole("heading", { name: "Connect your agent" })).toBeVisible();
    // Nothing in the tab pushes the dialog wider than the screen.
    const body = await dialog.locator(".export-modal-body").evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);

    // A command too long for this width scrolls inside its own box, and the
    // keyboard can reach the box to scroll it. Cursor's mcp.json is the
    // widest, and still scrolls at 360px.
    const scrolling = dialog.locator("pre").filter({ hasText: "https://globestudio.app/mcp" }).last();
    expect(await scrolling.evaluate((pre) => pre.scrollWidth > pre.clientWidth)).toBe(true);
    await expect(scrolling).toHaveAttribute("tabindex", "0");
    // axe reads colors as drawn, so wait out the client toggle's sliding
    // pill: mid-slide a label sits half on the pill and fails contrast.
    const clients = dialog.getByRole("tablist", { name: "Connect your agent" });
    const settled = () => expect.poll(() => clients.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    await settled();
    await expectNoSeriousAxeViolations(page);
    await dialog.getByRole("tab", { name: "Cursor" }).tap();
    await expect(dialog.getByRole("group", { name: "mcp.json" })).toHaveAttribute("tabindex", "0");
    await settled();
    await expectNoSeriousAxeViolations(page);
  });
});

test.describe("MCP tab", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  const openMcpTab = async (page) => {
    // Glow off, as in the PNG saved test: under software compositing the
    // glowing globe repaints behind the dialog for seconds per frame, and the
    // MCP tab click then times out waiting for the tab to hold still.
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 1, globeSettings: { glow: false } }))}`);
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Open export dialog" }).click();
    const dialog = page.getByRole("dialog", { name: /export/i });
    await dialog.getByRole("tab", { name: "MCP" }).click();
    await expect(dialog.getByRole("heading", { name: "Connect your agent" })).toBeVisible();
    return dialog;
  };

  test("the dialog keeps its height while the MCP tab's chunk loads", async ({ page }) => {
    // Hold the chunk back, as a slow connection would.
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    await page.route(/agent-share\.jsx/, async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 1, globeSettings: { glow: false } }))}`);
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Open export dialog" }).click();
    const dialog = page.getByRole("dialog", { name: /export/i });
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.evaluate((el) => el.getAnimations().length)).toBe(0);
    const height = () => dialog.evaluate((el) => el.getBoundingClientRect().height);
    const onImage = await height();

    await dialog.getByRole("tab", { name: "MCP" }).click();
    await expect(dialog.locator(".export-modal-pending")).toBeVisible();
    // The block is taller than the Image tab, so its stand-in is too.
    const whileLoading = await height();
    expect(whileLoading).toBeGreaterThanOrEqual(onImage);

    release();
    await expect(dialog.getByRole("heading", { name: "Connect your agent" })).toBeVisible();
    await expect(dialog.locator(".export-modal-pending")).toHaveCount(0);
    // The block lands in the room that was held, give or take a line.
    expect(Math.abs((await height()) - whileLoading)).toBeLessThanOrEqual(24);
  });

  test("Copy for AI puts a prompt with the current share link on the clipboard", async ({ page }) => {
    const dialog = await openMcpTab(page);

    // The link itself lives on the Share tab, which no longer has the AI block.
    await dialog.getByRole("tab", { name: "Share" }).click();
    await expect(dialog.getByRole("button", { name: "Copy for AI" })).toHaveCount(0);
    await expect(dialog.getByRole("heading", { name: "Connect your agent" })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Copy share link" }).click();
    await expect(dialog.getByRole("button", { name: "Link copied to clipboard" })).toBeVisible();
    const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(shareUrl).toContain("?c=");

    await dialog.getByRole("tab", { name: "MCP" }).click();
    await dialog.getByRole("button", { name: "Copy for AI" }).click();
    await expect(dialog.getByRole("button", { name: "Prompt copied to clipboard" })).toBeVisible();
    const prompt = await page.evaluate(() => navigator.clipboard.readText());
    expect(prompt).toContain(`Link: ${shareUrl}`);
    expect(prompt).toContain("Connect the Globestudio MCP server for full control: https://globestudio.app/mcp");
  });

  test("Copy for AI names the look until the design is edited, then says where it started", async ({ page }) => {
    const copyPrompt = async () => {
      await page.keyboard.press("d");
      const dialog = page.getByRole("dialog", { name: /export/i });
      await dialog.getByRole("tab", { name: "MCP" }).click();
      await dialog.getByRole("button", { name: "Copy for AI" }).click();
      await expect(dialog.getByRole("button", { name: "Prompt copied to clipboard" })).toBeVisible();
      const prompt = await page.evaluate(() => navigator.clipboard.readText());
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      return prompt;
    };

    await page.goto("/looks/halftone");
    await waitForCanvas(page);
    await expect(page.getByText(/Applied Halftone/i)).toBeVisible();
    expect(await copyPrompt()).toContain("Look: Halftone");

    await page.keyboard.press("g");
    await expect(page.getByText(/Switched to flat view/i)).toBeVisible();
    const edited = await copyPrompt();
    expect(edited).toContain("Started from: Halftone");
    expect(edited).not.toContain("Look: Halftone");

    // An imported configuration replaces the look's settings too.
    await page.goto("/looks/halftone");
    await waitForCanvas(page);
    await expect(page.getByText(/Applied Halftone/i)).toBeVisible();
    await page.keyboard.press("d");
    const dialog = page.getByRole("dialog", { name: /export/i });
    await dialog.getByRole("tab", { name: "Share" }).click();
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "globe.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ version: 1, density: 77 })),
    });
    await expect(page.getByText(/Configuration imported/i)).toBeVisible();
    await dialog.getByRole("tab", { name: "MCP" }).click();
    await dialog.getByRole("button", { name: "Copy for AI" }).click();
    await expect(dialog.getByRole("button", { name: "Prompt copied to clipboard" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Started from: Halftone");
  });

  test("each Connect tab shows its command for the hosted server", async ({ page }) => {
    const dialog = await openMcpTab(page);
    const panel = dialog.getByRole("tabpanel");

    // Connecting comes first, the one-off prompt after it.
    const headings = await dialog.getByRole("heading", { level: 3 }).allTextContents();
    expect(headings).toEqual(["Connect your agent", "Or send this design once"]);

    await expect(dialog.getByRole("tab", { name: "Claude" })).toHaveAttribute("aria-selected", "true");
    await expect(panel).toContainText("claude mcp add --transport http globestudio https://globestudio.app/mcp");
    await expect(panel).toContainText("Add custom connector");
    await expect(panel).toContainText("On Team or Enterprise, an owner adds it in Organization settings.");

    await dialog.getByRole("tab", { name: "Codex" }).click();
    await expect(panel).toContainText("codex mcp add globestudio --url https://globestudio.app/mcp");

    await dialog.getByRole("tab", { name: "Cursor" }).click();
    await expect(panel).toContainText('"url": "https://globestudio.app/mcp"');
    await expect(dialog.getByRole("link", { name: "Add to Cursor" })).toHaveAttribute(
      "href",
      /^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=globestudio&config=/,
    );

    // Arrow keys move between clients, like the dialog's own tabs.
    await dialog.getByRole("tab", { name: "Cursor" }).press("ArrowRight");
    await expect(dialog.getByRole("tab", { name: "Claude" })).toBeFocused();
    await expect(panel).toContainText("claude mcp add");

    // Tab reaches the command's Copy button, which shows a focus ring.
    await page.keyboard.press("Tab");
    const copyCommand = panel.getByRole("button", { name: "Copy code to clipboard" }).first();
    await expect(copyCommand).toBeFocused();
    await expect(copyCommand).toHaveCSS("outline-style", "solid");

    await expectNoSeriousAxeViolations(page);
  });

  test("the dialog's arrow keys, Home and End reach all seven tabs", async ({ page }) => {
    const dialog = await openMcpTab(page);
    const selected = dialog.getByRole("tablist", { name: "Export type" }).getByRole("tab", { selected: true });
    await expect(dialog.getByRole("tablist", { name: "Export type" }).getByRole("tab")).toHaveText([
      "Image",
      "Video",
      "SVG",
      "Figma",
      "Share",
      "MCP",
      "Skill",
    ]);

    // Focus moves with the selection, as it does between the clients.
    await dialog.getByRole("tab", { name: "MCP" }).press("ArrowRight");
    await expect(selected).toHaveText("Skill");
    await expect(selected).toBeFocused();
    for (const name of ["Image", "Video", "SVG", "Figma", "Share", "MCP"]) {
      await page.keyboard.press("ArrowRight");
      await expect(selected).toHaveText(name);
      await expect(selected).toBeFocused();
    }
    await page.keyboard.press("Home");
    await expect(selected).toHaveText("Image");
    await expect(selected).toBeFocused();
    await page.keyboard.press("End");
    await expect(selected).toHaveText("Skill");
    await expect(selected).toBeFocused();
    await expect(dialog.getByRole("heading", { name: "Teach your coding agent Globestudio" })).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(selected).toHaveText("MCP");
    await expect(dialog.getByRole("heading", { name: "Connect your agent" })).toBeVisible();
    // Tab then goes into the tab that is shown, not to another tab.
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("tab", { name: "Claude" })).toBeFocused();
    // Focus stays inside the dialog the whole way.
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
  });

  test("holds no skill line, which has a tab of its own", async ({ page }) => {
    const dialog = await openMcpTab(page);
    await expect(dialog.locator(".export-modal-pane")).not.toContainText(/skill/i);
    await expect(dialog.locator(".export-modal-pane pre")).toHaveText([
      "claude mcp add --transport http globestudio https://globestudio.app/mcp",
      "https://globestudio.app/mcp",
    ]);
  });
});

test.describe("Embed code", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  // A flat map on a red page, glow off (see the PNG saved test): the view
  // and the page color, which the embed route reads from the config.
  const DESIGN = { v: 1, viewMode: "flat", background: "#7a1f1f", globeSettings: { glow: false } };

  const openShareTab = async (page) => {
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify(DESIGN))}`);
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Open export dialog" }).click();
    const dialog = page.getByRole("dialog", { name: /export/i });
    await dialog.getByRole("tab", { name: "Share" }).click();
    await expect(dialog.getByRole("heading", { name: "Embed code" })).toBeVisible();
    return dialog;
  };
  // Waits out the toggle's sliding pill, so axe reads the colors at rest.
  const settled = (locator) =>
    expect.poll(() => locator.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  // The box the white dots cover in a clip of the page, as width over height.
  const dotsAspect = async (page, clip) => {
    const png = await page.screenshot({ clip });
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
      let [left, top, right, bottom] = [img.width, img.height, -1, -1];
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) continue;
        const x = (i / 4) % img.width;
        const y = Math.floor(i / 4 / img.width);
        [left, top, right, bottom] = [Math.min(left, x), Math.min(top, y), Math.max(right, x), Math.max(bottom, y)];
      }
      return right < 0 ? 0 : (right - left) / Math.max(bottom - top, 1);
    }, png.toString("base64"));
  };
  const copySnippet = async (page, dialog) => {
    await dialog.getByRole("tabpanel").getByRole("button", { name: "Copy code to clipboard" }).click();
    await expect(dialog.getByRole("tabpanel").getByRole("button", { name: "Copied" })).toBeVisible();
    return page.evaluate(() => navigator.clipboard.readText());
  };

  test("copies an iframe, a React and a web component snippet for the current design", async ({ page }) => {
    const dialog = await openShareTab(page);
    await expect(dialog.getByRole("button", { name: /Copy as React/ })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Copy share link" }).click();
    await expect(dialog.getByRole("button", { name: "Link copied to clipboard" })).toBeVisible();
    const config = new URL(await page.evaluate(() => navigator.clipboard.readText())).searchParams.get("c");
    expect(JSON.parse(config)).toMatchObject({ viewMode: "flat", background: "#7a1f1f" });

    const kinds = dialog.getByRole("tablist", { name: "Embed code" });
    await expect(kinds.getByRole("tab")).toHaveText(["iframe", "React", "Web component"]);
    await expect(kinds.getByRole("tab", { name: "iframe" })).toHaveAttribute("aria-selected", "true");
    const panel = dialog.getByRole("tabpanel");

    // Full width, at the height the canvas has on screen.
    const iframe = await copySnippet(page, dialog);
    expect(iframe).toBe(await panel.locator("code").textContent());
    const attrs = await page.evaluate((html) => {
      const node = new DOMParser().parseFromString(html, "text/html").querySelector("iframe");
      return { src: node.getAttribute("src"), width: node.getAttribute("width"), height: node.getAttribute("height") };
    }, iframe);
    const src = new URL(attrs.src);
    expect(`${src.origin}${src.pathname}`).toBe("https://globestudio.app/embed");
    expect(Object.fromEntries(src.searchParams)).toEqual({ c: config });
    expect(attrs.width).toBe("100%");
    const canvasHeight = await page.locator(".globe-background canvas").first().evaluate((node) => node.clientHeight);
    expect(Number(attrs.height)).toBe(canvasHeight);

    // Arrow keys move between the options, taking focus along.
    await kinds.getByRole("tab", { name: "iframe" }).press("ArrowRight");
    await expect(kinds.getByRole("tab", { name: "React" })).toBeFocused();
    await expect(kinds.getByRole("tab", { name: "React" })).toHaveAttribute("aria-selected", "true");
    const react = await copySnippet(page, dialog);
    expect(react).toBe(
      `import { Globe } from "@globestudio/react";\n\n<Globe\n  config={${JSON.stringify(config)}}\n  width="100%"\n  height={${attrs.height}}\n/>`,
    );

    await kinds.getByRole("tab", { name: "React" }).press("End");
    await expect(kinds.getByRole("tab", { name: "Web component" })).toBeFocused();
    const element = await copySnippet(page, dialog);
    const [script, tag] = element.split("\n");
    expect(script).toBe('<script type="module" src="https://esm.sh/@globestudio/element"></script>');
    const parsed = await page.evaluate((html) => {
      const node = new DOMParser().parseFromString(html, "text/html").querySelector("globe-studio");
      return { config: node.getAttribute("config"), height: node.getAttribute("height") };
    }, tag);
    expect(parsed).toEqual({ config, height: attrs.height });

    // Tab goes from the options to the snippet's Copy button, which shows a ring.
    await kinds.getByRole("tab", { name: "Web component" }).focus();
    await page.keyboard.press("Tab");
    const copy = panel.getByRole("button", { name: /Cop/ });
    await expect(copy).toBeFocused();
    await expect(copy).toHaveCSS("outline-style", "solid");
    // The long config line scrolls inside its box, and the keyboard reaches it next.
    const pre = panel.locator("pre");
    expect(await pre.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    await page.keyboard.press("Tab");
    await expect(pre).toBeFocused();
    await expect(pre).toHaveCSS("outline-style", "solid");
    await settled(kinds);
    await expectNoSeriousAxeViolations(page);
  });

  // The snippet's address carries the config alone, which is also all the
  // React and web component packages send.
  test("the iframe snippet opens the embed route as the flat map on its own background", async ({ page, baseURL }) => {
    const dialog = await openShareTab(page);
    const snippet = await copySnippet(page, dialog);
    // Paste it into an empty page, pointed at this build instead of production.
    const sized = snippet.replace(/width="[^"]*"/, 'width="1200"').replace(/height="\d+"/, 'height="600"');
    await page.setContent(`<body style="margin:0">${sized.replace("https://globestudio.app", baseURL)}</body>`);
    const embed = page.frameLocator("iframe");
    await expect(embed.locator(".globe-background canvas")).toBeVisible({ timeout: CANVAS_TIMEOUT });
    await expect(embed.locator(".embed-view")).toHaveCSS("background-color", "rgb(122, 31, 31)");
    // The white dots of a flat world map cover a box about twice as wide
    // as it is tall. A globe's stay inside a circle.
    await expect
      .poll(() => dotsAspect(page, { x: 0, y: 0, width: 1200, height: 600 }), { timeout: CANVAS_TIMEOUT })
      .toBeGreaterThan(1.5);
  });
});

test.describe("embed code for a design with a large custom shape", () => {
  test("says the design is too large, in place of code the site would turn down", async ({ page }) => {
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 1, globeSettings: { glow: false } }))}`);
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Open export dialog" }).click();
    const dialog = page.getByRole("dialog", { name: /export/i });
    await dialog.getByRole("tab", { name: "Share" }).click();
    await expect(dialog.getByRole("button", { name: "Open in CodePen" })).toBeVisible();

    // A shape file of noise, which PNG can't shrink: about 85 kB as a data URL.
    const dataUrl = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const context = canvas.getContext("2d");
      const image = context.createImageData(128, 128);
      crypto.getRandomValues(image.data);
      context.putImageData(image, 0, 0);
      return canvas.toDataURL("image/png");
    });
    expect(dataUrl.length).toBeGreaterThan(40_000);
    const config = { shape: "Custom", customShape: { name: "noise.png", type: "image/png", dataUrl } };
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "large.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(config)),
    });

    await expect(
      dialog.getByText(
        "This design is too large to embed, because its URL would be too long. Try a smaller custom shape file or fewer data points.",
      ),
    ).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Embed code" })).toBeVisible();
    await expect(dialog.getByRole("tablist", { name: "Embed code" })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Open in CodePen" })).toHaveCount(0);
    // The rest of the tab is as it was.
    await expect(dialog.getByRole("button", { name: "Copy share link" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Export configuration" })).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  });
});

test.describe("Open in CodePen", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("opens a new tab with a pen prefilled with the current design", async ({ page, context }) => {
    // Stand in for CodePen, and keep what the form posted to it.
    let posted;
    await context.route("https://codepen.io/**", async (route) => {
      const request = route.request();
      posted = { url: request.url(), method: request.method(), body: request.postData() };
      await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Pen</title>" });
    });

    const design = { v: 1, background: "#7a1f1f", asciiSymbol: `"<&'>`, globeSettings: { glow: false } };
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify(design))}`);
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Open export dialog" }).click();
    const dialog = page.getByRole("dialog", { name: /export/i });
    await dialog.getByRole("tab", { name: "Share" }).click();
    await dialog.getByRole("button", { name: "Copy share link" }).click();
    await expect(dialog.getByRole("button", { name: "Link copied to clipboard" })).toBeVisible();
    const config = new URL(await page.evaluate(() => navigator.clipboard.readText())).searchParams.get("c");
    expect(JSON.parse(config).asciiSymbol).toBe(`"<&'>`);

    const button = dialog.getByRole("button", { name: "Open in CodePen" });
    await expect(button).toHaveClass(/is-secondary/);
    const [pen] = await Promise.all([context.waitForEvent("page"), button.click()]);
    await pen.waitForLoadState();
    expect(await pen.title()).toBe("Pen");
    // The studio stays where it was, with the dialog open.
    await expect(dialog).toBeVisible();

    expect(posted.method).toBe("POST");
    expect(posted.url).toBe("https://codepen.io/pen/define");
    const fields = new URLSearchParams(posted.body);
    expect([...fields.keys()]).toEqual(["data"]);
    const data = JSON.parse(fields.get("data"));
    expect(Object.keys(data)).toEqual(["title", "html", "css", "js"]);
    // A page with no margin, as tall as the pen, in the design's background.
    expect(data.css).toBe("html,\nbody {\n  height: 100%;\n  margin: 0;\n  background: #7a1f1f;\n}");
    const [script, tag] = data.html.split("\n");
    expect(script).toBe('<script type="module" src="https://esm.sh/@globestudio/element"></script>');
    // Rendered as HTML, the tag gives the element the config unchanged.
    const parsed = await page.evaluate((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const node = doc.querySelector("globe-studio");
      return { config: node.getAttribute("config"), height: node.getAttribute("height"), elements: doc.body.children.length };
    }, tag);
    expect(parsed).toEqual({ config, height: "100%", elements: 1 });
    await pen.close();
  });
});

test.describe("embed code on a 320px wide phone", () => {
  test.use({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });

  test("every option keeps its label whole and the snippet scrolls inside its box", async ({ page }) => {
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 1, globeSettings: { glow: false } }))}`);
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Open export dialog" }).click();
    const dialog = page.getByRole("dialog", { name: /export/i });
    await dialog.getByRole("tab", { name: "Share" }).tap();
    const kinds = dialog.getByRole("tablist", { name: "Embed code" });
    await kinds.getByRole("tab", { name: "Web component" }).tap();
    await expect(kinds.getByRole("tab", { name: "Web component" })).toHaveAttribute("aria-selected", "true");
    const labels = await kinds.getByRole("tab").evaluateAll((tabs) =>
      tabs.map((tab) => {
        const range = document.createRange();
        range.selectNodeContents(tab);
        const text = range.getBoundingClientRect();
        const box = tab.getBoundingClientRect();
        return { label: tab.textContent, whole: text.left >= box.left && text.right <= box.right && tab.scrollWidth <= tab.clientWidth };
      }),
    );
    expect(labels).toEqual([
      { label: "iframe", whole: true },
      { label: "React", whole: true },
      { label: "Web component", whole: true },
    ]);
    // Nothing in the tab pushes the dialog wider than the screen.
    const body = await dialog.locator(".export-modal-body").evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
    const pre = dialog.getByRole("tabpanel").locator("pre");
    expect(await pre.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    await expect(pre).toHaveAttribute("tabindex", "0");
    // Wait out the toggle's sliding pill, so axe reads the colors at rest.
    await expect.poll(() => kinds.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    await expectNoSeriousAxeViolations(page);
  });
});

test.describe("Figma tab", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  const tabRow = (dialog) => dialog.getByRole("tablist", { name: "Export type" }).getByRole("tab");
  const openDialog = async (page) => {
    // Glow off, as in the PNG saved test.
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 1, globeSettings: { glow: false } }))}`);
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Open export dialog" }).click();
    const dialog = page.getByRole("dialog", { name: /export/i });
    await expect(dialog).toBeVisible();
    return dialog;
  };

  test("copies the design as vectors or as an image, and links to the plugin", async ({ page }) => {
    const dialog = await openDialog(page);
    await expect(tabRow(dialog)).toHaveText(["Image", "Video", "SVG", "Figma", "Share", "MCP", "Skill"]);
    // The row still ends inside the dialog with seven tabs in it.
    const edges = await dialog.evaluate((el) => {
      const last = [...el.querySelectorAll('[role="tablist"][aria-label="Export type"] [role="tab"]')].pop();
      return { tab: last.getBoundingClientRect().right, dialog: el.getBoundingClientRect().right };
    });
    expect(edges.tab).toBeLessThanOrEqual(edges.dialog);

    await dialog.getByRole("tab", { name: "Figma" }).click();
    await expect(dialog.getByRole("heading", { level: 3 })).toHaveText(["Paste into Figma", "Or design inside Figma"]);
    await expect(dialog.getByText("Copy the design, then paste it into a Figma file.")).toBeVisible();
    await expect(dialog.locator(".export-modal-footer")).toHaveCount(0);

    // Vectors: the same SVG the SVG tab's Copy puts on the clipboard.
    const vectors = dialog.getByRole("button", { name: "Copy as vectors" });
    await expect(vectors).not.toHaveClass(/is-secondary/);
    await vectors.click();
    await expect(dialog.getByRole("button", { name: "Vectors copied to clipboard" })).toBeVisible();
    const fromFigmaTab = await page.evaluate(() => navigator.clipboard.readText());
    expect(fromFigmaTab.startsWith("<svg")).toBe(true);
    await dialog.getByRole("tab", { name: "SVG" }).click();
    await dialog.getByRole("button", { name: /Copy SVG to clipboard|SVG copied to clipboard/ }).click();
    await expect(dialog.getByRole("button", { name: "SVG copied to clipboard" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(fromFigmaTab);

    // Image: a PNG at the size set on the Image tab.
    await dialog.getByRole("tab", { name: "Image" }).click();
    const press = (locator) => locator.evaluate((el) => el.click());
    const width = dialog.getByLabel("Export width");
    await press(dialog.getByRole("button", { name: "1:1" }));
    await expect.poll(async () => (await width.inputValue()) === (await dialog.getByLabel("Export height").inputValue())).toBe(true);
    const side = Number(await width.inputValue()) / 2;
    await press(dialog.getByRole("button", { name: "Draft" }));
    await expect(width).toHaveValue(String(side));
    await dialog.getByRole("tab", { name: "Figma" }).click();
    const image = dialog.getByRole("button", { name: "Copy as image" });
    await expect(image).toHaveClass(/is-secondary/);
    await press(image);
    await expect(dialog.getByRole("status").last()).toHaveText("Image copied to clipboard", {
      timeout: process.env.CI ? 45_000 : 30_000,
    });
    const copied = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      const bitmap = await createImageBitmap(await item.getType("image/png"));
      return { types: item.types, size: [bitmap.width, bitmap.height] };
    });
    expect(copied).toEqual({ types: ["image/png"], size: [side, side] });

    const link = dialog.getByRole("link", { name: "Open the Figma plugin" });
    await expect(link).toHaveAttribute("href", "https://www.figma.com/community/plugin/1641603648370488902/globestudio");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener");
    await expect(link).toHaveClass(/export-modal-cta/);
    await expect(link).toHaveClass(/is-secondary/);
    await expect(link).toHaveCSS("text-decoration-line", "none");

    // From the tab, Tab walks the three actions in order, each with a ring.
    await dialog.getByRole("tab", { name: "Figma" }).focus();
    for (const action of [dialog.getByRole("button", { name: /vectors/i }), image, link]) {
      await page.keyboard.press("Tab");
      await expect(action).toBeFocused();
      await expect(action).toHaveCSS("outline-style", "solid");
    }
    await expect.poll(() => dialog.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    await expectNoSeriousAxeViolations(page);
  });

  // The copy changes the button's label twice, on the copy and when it
  // resets, and App renders the dialog again each time.
  test("leaves focus on Copy as vectors after a copy from the keyboard", async ({ page }) => {
    const dialog = await openDialog(page);
    await dialog.getByRole("tab", { name: "Figma" }).click();
    await dialog.getByRole("button", { name: "Copy as vectors" }).focus();
    await page.keyboard.press("Enter");
    await expect(dialog.getByRole("button", { name: "Vectors copied to clipboard" })).toBeFocused();
    await expect(dialog.getByRole("button", { name: "Copy as vectors" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Copy as image" })).toBeFocused();
  });

  test("gives way to Image when the window gets as narrow as a phone", async ({ page }) => {
    const dialog = await openDialog(page);
    await dialog.getByRole("tab", { name: "Figma" }).click();
    await expect(dialog.getByRole("heading", { name: "Paste into Figma" })).toBeVisible();

    await page.setViewportSize({ width: 540, height: 720 });
    await expect(tabRow(dialog)).toHaveText(["Image", "Video", "SVG", "Share", "MCP"]);
    await expect(dialog.getByRole("tab", { name: "Image" })).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByRole("heading", { name: "Paste into Figma" })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: /export png/i })).toBeVisible();
    // The Figma tab had the focus, and the dialog takes it from there.
    await expect(dialog).toBeFocused();
    // One px wider the Figma tab is back.
    // The Skill tab waits for the dialog's full width, from 688px.
    await page.setViewportSize({ width: 541, height: 720 });
    await expect(tabRow(dialog)).toHaveText(["Image", "Video", "SVG", "Figma", "Share", "MCP"]);
  });
});

test.describe("the note on what vectors leave out", () => {
  // A still globe keeps the frames coming for the clicks in software GL.
  test.use({ permissions: ["clipboard-read", "clipboard-write"], contextOptions: { reducedMotion: "reduce" } });

  const openDialog = async (page, path) => {
    await page.goto(path);
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Open export dialog" }).click();
    const dialog = page.getByRole("dialog", { name: /export/i });
    await expect(dialog).toBeVisible();
    return dialog;
  };
  // Glow off, as in the Figma tab tests: the glow has nothing to do with the
  // note and only slows software GL down.
  const link = (path, config = {}) => `${path}?c=${encodeURIComponent(JSON.stringify({ v: 1, ...config, globeSettings: { glow: false } }))}`;
  const note = (dialog) => dialog.getByText(/only comes? through/);
  const settle = (dialog) => expect.poll(() => dialog.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);

  test("names what the CRT look loses on the SVG and Figma tabs, and points to the image", async ({ page }) => {
    const dialog = await openDialog(page, link("/looks/crt"));

    await dialog.getByRole("tab", { name: "SVG" }).click();
    const svgNote = "The scanlines and glow only come through in PNG.";
    await expect(note(dialog)).toHaveText(svgNote);
    await expect(note(dialog)).toHaveClass("export-modal-caption");
    await expect(dialog.getByRole("button", { name: "Download SVG" })).toHaveAccessibleDescription(svgNote);
    await expect(dialog.getByRole("button", { name: "Copy SVG to clipboard" })).toHaveAccessibleDescription(svgNote);
    await settle(dialog);
    await expectNoSeriousAxeViolations(page);

    await dialog.getByRole("tab", { name: "Figma" }).click();
    const figmaNote = "The scanlines and glow only come through with Copy as image.";
    await expect(note(dialog)).toHaveText(figmaNote);
    const vectors = dialog.getByRole("button", { name: "Copy as vectors" });
    await expect(vectors).toHaveAccessibleDescription(figmaNote);
    // Between the two copies, under the vectors it is about. Tab skips it.
    const order = await dialog.evaluate((el) => {
      const pane = el.querySelector(".export-modal-pane");
      return [...pane.querySelectorAll("p:not(.visually-hidden), button")].map((node) => node.textContent);
    });
    expect(order.indexOf(figmaNote)).toBe(order.indexOf("Copy as vectors") + 2);
    expect(order.indexOf("Copy as image")).toBe(order.indexOf(figmaNote) + 1);
    await vectors.focus();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Copy as image" })).toBeFocused();
    await settle(dialog);
    await expectNoSeriousAxeViolations(page);
  });

  // A look whose effect is turned off loses nothing either: the note reads
  // the design as it is, not the look it started from.
  for (const [what, path] of [
    ["Default", link("/")],
    ["CRT with its effect turned off", link("/looks/crt", { shaderSettings: { effect: "none" } })],
  ]) {
    test(`says nothing for ${what}, and leaves the vector buttons as they are`, async ({ page }) => {
      const dialog = await openDialog(page, path);
      await dialog.getByRole("tab", { name: "SVG" }).click();
      const download = dialog.getByRole("button", { name: "Download SVG" });
      await expect(download).toBeVisible();
      await expect(note(dialog)).toHaveCount(0);
      await expect(download).not.toHaveAttribute("aria-describedby");
      await dialog.getByRole("tab", { name: "Figma" }).click();
      const vectors = dialog.getByRole("button", { name: "Copy as vectors" });
      await expect(vectors).toBeVisible();
      await expect(note(dialog)).toHaveCount(0);
      await expect(vectors).not.toHaveAttribute("aria-describedby");
    });
  }
});

test.describe("Skill tab", () => {
  test.use({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });

  const SKILL_HEADING = "Teach your coding agent Globestudio";
  const tabRow = (dialog) => dialog.getByRole("tablist", { name: "Export type" }).getByRole("tab");
  const openDialog = async (page) => {
    // Glow off, as in the PNG saved test.
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 1, globeSettings: { glow: false } }))}`);
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Open export dialog" }).click();
    const dialog = page.getByRole("dialog", { name: /export/i });
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.evaluate((el) => el.getAnimations().length)).toBe(0);
    return dialog;
  };
  const openSkillTab = async (page) => {
    const dialog = await openDialog(page);
    await dialog.getByRole("tab", { name: "Skill", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: SKILL_HEADING })).toBeVisible();
    return dialog;
  };
  // Where each tab of the dialog's row sits against the row's edges, as in
  // the 320px phone test. The last tab has to end inside the row's side
  // padding, which lines the tabs up with the header and the body.
  const measureRow = (dialog) =>
    dialog.getByRole("tablist", { name: "Export type" }).evaluate((list) => {
      const edge = list.getBoundingClientRect();
      return {
        left: edge.left,
        right: edge.right,
        innerRight: edge.right - parseFloat(getComputedStyle(list).paddingRight),
        overflows: list.scrollWidth > list.clientWidth,
        tabs: [...list.querySelectorAll('[role="tab"]')].map((tab) => {
          const rect = tab.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return {
            label: tab.textContent,
            left: rect.left,
            right: rect.right,
            clipped: tab.scrollWidth > tab.clientWidth,
            reachable: hit === tab,
          };
        }),
      };
    });
  const expectRowFits = (row, labels) => {
    expect(row.tabs.map((tab) => tab.label)).toEqual(labels);
    expect(row.overflows).toBe(false);
    for (const tab of row.tabs) {
      expect(tab.left, tab.label).toBeGreaterThanOrEqual(row.left);
      expect(tab.right, tab.label).toBeLessThanOrEqual(row.innerRight + 0.5);
      expect(tab.clipped, tab.label).toBe(false);
      expect(tab.reachable, tab.label).toBe(true);
    }
  };
  const SEVEN = ["Image", "Video", "SVG", "Figma", "Share", "MCP", "Skill"];

  test("comes last, and gives the heading, what the skill does, three ways to add it and the telemetry note", async ({ page }) => {
    const dialog = await openSkillTab(page);
    expectRowFits(await measureRow(dialog), SEVEN);
    await expect(tabRow(dialog).last()).toHaveAttribute("aria-selected", "true");

    const pane = dialog.locator(".export-modal-pane");
    await expect(dialog.getByRole("heading", { level: 3 })).toHaveText([SKILL_HEADING]);
    await expect(dialog.getByRole("heading", { name: SKILL_HEADING })).toHaveClass("export-modal-label");
    await expect(pane.locator("p.export-modal-caption")).toHaveText([
      "The skill shows Claude Code, Codex, Cursor and other coding agents how to add and edit Globestudio globes and maps in your project.",
      "npx skills sends anonymous install data to skills.sh unless you set DISABLE_TELEMETRY=1. See the skill on skills.sh",
    ]);
    await expect(pane.getByRole("link", { name: "See the skill on skills.sh" })).toHaveAttribute(
      "href",
      "https://skills.sh/alevizio/globestudio/globestudio",
    );
    const options = dialog.getByRole("tablist", { name: SKILL_HEADING });
    await expect(options.getByRole("tab")).toHaveText(["npx skills", "Claude Code", "GitHub"]);
    await expect(options.getByRole("tab", { name: "npx skills" })).toHaveAttribute("aria-selected", "true");
    // The MCP tab's own toggle, three across.
    const toggle = await options.evaluate((el) => ({
      columns: getComputedStyle(el).gridTemplateColumns.split(" ").length,
      indicator: el.querySelector(".segmented-toggle-indicator").getBoundingClientRect().width,
      button: el.querySelector('[role="tab"]').getBoundingClientRect().width,
    }));
    expect(toggle.columns).toBe(3);
    expect(Math.abs(toggle.indicator - toggle.button)).toBeLessThanOrEqual(1);
    await expect(dialog.locator(".export-modal-footer")).toHaveCount(0);

    // Each option's command, copied as it is shown.
    const panel = dialog.getByRole("tabpanel");
    for (const [name, label, command] of [
      ["npx skills", "npx skills", "npx skills add alevizio/globestudio"],
      [
        "Claude Code",
        "Claude Code plugin",
        "claude plugin marketplace add alevizio/globestudio && claude plugin install globestudio@globestudio",
      ],
      ["GitHub", "GitHub CLI", "gh skill install alevizio/globestudio globestudio"],
    ]) {
      await options.getByRole("tab", { name }).click();
      await expect(panel.locator(".code-block-language")).toHaveText(label);
      await expect(panel.locator("pre")).toHaveText(command);
      await panel.getByRole("button", { name: "Copy code to clipboard" }).click();
      await expect(panel.getByRole("button", { name: "Copied" })).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(command);
    }
    // Nothing in the tab pushes the dialog wider than its body.
    const body = await dialog.locator(".export-modal-body").evaluate((el) => [el.scrollWidth, el.clientWidth]);
    expect(body[0]).toBeLessThanOrEqual(body[1]);
  });

  test("its options move with the arrow keys, Home and End, and Tab reaches Copy with a ring", async ({ page }) => {
    const dialog = await openSkillTab(page);
    const options = dialog.getByRole("tablist", { name: SKILL_HEADING });
    const panel = dialog.getByRole("tabpanel");
    // From the dialog's Skill tab, Tab goes into the tab that is shown.
    await dialog.getByRole("tab", { name: "Skill", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(options.getByRole("tab", { name: "npx skills" })).toBeFocused();
    for (const [key, name, command] of [
      ["ArrowRight", "Claude Code", "claude plugin marketplace add"],
      ["ArrowRight", "GitHub", "gh skill install"],
      ["ArrowRight", "npx skills", "npx skills add"],
      ["ArrowLeft", "GitHub", "gh skill install"],
      ["Home", "npx skills", "npx skills add"],
      ["End", "GitHub", "gh skill install"],
    ]) {
      await page.keyboard.press(key);
      const option = options.getByRole("tab", { name });
      await expect(option).toBeFocused();
      await expect(option).toHaveAttribute("aria-selected", "true");
      await expect(panel).toContainText(command);
    }
    // The dialog's own row stays on Skill.
    await expect(tabRow(dialog).last()).toHaveAttribute("aria-selected", "true");
    await expect(options.getByRole("tab", { name: "GitHub" })).toHaveCSS("outline-style", "solid");

    await page.keyboard.press("Tab");
    const copy = panel.getByRole("button", { name: "Copy code to clipboard" });
    await expect(copy).toBeFocused();
    await expect(copy).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await expect(panel.getByRole("button", { name: "Copied" })).toBeFocused();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("gh skill install alevizio/globestudio globestudio");
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
  ]) {
    test(`fits seven tabs and passes axe at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const dialog = await openSkillTab(page);
      expectRowFits(await measureRow(dialog), SEVEN);
      await dialog.getByRole("tab", { name: "Claude Code" }).click();
      // Wait out the toggle's sliding pill and the pane's fade, so axe reads
      // the colors at rest.
      await expect.poll(() => dialog.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
      await expectNoSeriousAxeViolations(page);
    });
  }

  test("shows from the dialog's full width, where seven tabs fit, and gives way to Image below it", async ({ page }) => {
    // Without the web font the labels set in a wider fallback, the widest
    // case the row has to hold.
    await page.route(/GeistPixel/, (route) => route.abort());
    const dialog = await openSkillTab(page);
    await page.setViewportSize({ width: 688, height: 800 });
    await expect(tabRow(dialog)).toHaveText(SEVEN);
    expectRowFits(await measureRow(dialog), SEVEN);
    await expect(tabRow(dialog).last()).toHaveAttribute("aria-selected", "true");

    // One px narrower the Skill tab goes, and Image shows. The Figma tab stays.
    await page.setViewportSize({ width: 687, height: 800 });
    await expect(tabRow(dialog)).toHaveText(["Image", "Video", "SVG", "Figma", "Share", "MCP"]);
    await expect(dialog.getByRole("tab", { name: "Image" })).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByRole("heading", { name: SKILL_HEADING })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: /export png/i })).toBeVisible();
    // The Skill tab had the focus, and the dialog takes it from there.
    await expect(dialog).toBeFocused();

    // Wide enough again, the dialog goes back to Skill, as it does to Figma.
    await page.setViewportSize({ width: 688, height: 800 });
    await expect(tabRow(dialog)).toHaveText(SEVEN);
    await expect(tabRow(dialog).last()).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByRole("heading", { name: SKILL_HEADING })).toBeVisible();
  });

  test("fits the row at every width from the phone form up to the dialog's full width", async ({ page }) => {
    // The widest labels, as in the test above.
    await page.route(/GeistPixel/, (route) => route.abort());
    const dialog = await openDialog(page);
    const FIVE = ["Image", "Video", "SVG", "Share", "MCP"];
    const SIX = ["Image", "Video", "SVG", "Figma", "Share", "MCP"];
    // From 541px the Figma tab is back, and up to 564px six tabs at their
    // desktop padding ran into the row's side padding or past the dialog.
    const widths = [...Array.from({ length: 25 }, (_, i) => 540 + i), 600, 640, 687, 688];
    for (const width of widths) {
      await test.step(`${width}px`, async () => {
        await page.setViewportSize({ width, height: 800 });
        const labels = width <= 540 ? FIVE : width < 688 ? SIX : SEVEN;
        await expect(tabRow(dialog)).toHaveText(labels);
        expectRowFits(await measureRow(dialog), labels);
      });
    }
    // From 565px the tabs keep their desktop padding.
    await page.setViewportSize({ width: 565, height: 800 });
    await expect(tabRow(dialog).first()).toHaveCSS("padding-left", "20px");
  });

  test("the dialog keeps the block's height while the Skill tab's chunk loads", async ({ page }) => {
    // Hold the chunk back, as a slow connection would.
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    await page.route(/agent-skill\.jsx/, async (route) => {
      await held;
      await route.continue();
    });
    const dialog = await openDialog(page);
    const height = () => dialog.evaluate((el) => el.getBoundingClientRect().height);

    await dialog.getByRole("tab", { name: "Skill", exact: true }).click();
    await expect(dialog.locator(".export-modal-pending")).toBeVisible();
    const whileLoading = await height();

    release();
    await expect(dialog.getByRole("heading", { name: SKILL_HEADING })).toBeVisible();
    await expect(dialog.locator(".export-modal-pending")).toHaveCount(0);
    // The block lands in the room that was held, give or take a line.
    expect(Math.abs((await height()) - whileLoading)).toBeLessThanOrEqual(24);
  });
});

test.describe("Skill tab on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("is left out of the tab row, like the Figma tab", async ({ page }) => {
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 1, globeSettings: { glow: false } }))}`);
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Open export dialog" }).click();
    const dialog = page.getByRole("dialog", { name: /export/i });
    await expect(dialog.getByRole("tablist", { name: "Export type" }).getByRole("tab")).toHaveText([
      "Image",
      "Video",
      "SVG",
      "Share",
      "MCP",
    ]);
    await expect(dialog.getByRole("tab", { name: "Skill", exact: true })).toHaveCount(0);
  });
});

test.describe("Figma tab on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("is left out of the tab row, which keeps its five tabs", async ({ page }) => {
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 1, globeSettings: { glow: false } }))}`);
    await waitForCanvas(page);
    await page.getByRole("button", { name: "Open export dialog" }).click();
    const dialog = page.getByRole("dialog", { name: /export/i });
    await expect(dialog.getByRole("tablist", { name: "Export type" }).getByRole("tab")).toHaveText([
      "Image",
      "Video",
      "SVG",
      "Share",
      "MCP",
    ]);
    // Copy image is still there, so a phone can paste into Figma's app.
    await expect(dialog.getByRole("button", { name: "Copy image" })).toBeVisible();
  });
});
