import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FLAT_PROJECTION_OPTIONS } from "../three/world-texture.js";
import {
  buildShareUrl,
  clearShareConfigFromUrl,
  normalizeConfig,
  parseShareConfig,
} from "./share-config.js";

afterEach(() => {
  vi.unstubAllEnvs();
  if (typeof window !== "undefined") {
    window.history.replaceState({}, "", "/");
  }
});

describe("share-config", () => {
  it("round-trips a basic config", () => {
    const config = { selection: "country:USA", dotColor: "#ff0044", density: 60 };
    const url = buildShareUrl(config, "https://globestudio.app");
    expect(url).toMatch(/^https:\/\/globestudio\.app\/\?c=/);

    const search = url.split("?")[1];
    const parsed = parseShareConfig(`?${search}`);
    expect(parsed).toMatchObject(config);
  });

  it("round-trips deeply-nested config (gradients, shader/globe settings)", () => {
    const config = {
      selection: "continent:Europe",
      backgroundStyle: "flow",
      dotGradient: { from: "#ff0", to: "#0ff", angle: 45 },
      shaderSettings: { effect: "halftone", cellSize: 10, intensity: 80 },
      globeSettings: { autoSpin: false, networkMono: true, glowStrength: 64 },
      flowSettings: { colorA: "#635bff", colorB: "#00d4ff", colorC: "#ff5c93", turbulence: 72 },
    };
    const url = buildShareUrl(config, "https://globestudio.app");
    const parsed = parseShareConfig(`?${url.split("?")[1]}`);
    expect(parsed).toMatchObject(config);
  });

  it("round-trips the Transparent background, style included", () => {
    // Before, backgroundStyle "transparent" was dropped, so the link opened on
    // the recipient's last style (a Space user saw stars, not transparency).
    const config = { background: "#0a0a0a", transparent: true, backgroundStyle: "transparent" };
    const url = buildShareUrl(config, "https://globestudio.app");
    expect(parseShareConfig(`?${url.split("?")[1]}`)).toMatchObject(config);
  });

  it("publishes every importable background style in the config schema", () => {
    const schemaPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/schema/config.json");
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    for (const style of schema.properties.backgroundStyle.enum) {
      expect(normalizeConfig({ backgroundStyle: style })).toMatchObject({ backgroundStyle: style });
    }
    expect(schema.properties.backgroundStyle.enum).toContain("transparent");
  });

  it("turns the transparent flag on for the Transparent style, even when a config leaves it off", () => {
    // A hand written config naming only the style previewed see-through but
    // exported an opaque SVG and embedded on a solid page.
    expect(normalizeConfig({ backgroundStyle: "transparent" })).toEqual({ backgroundStyle: "transparent", transparent: true });
    expect(normalizeConfig({ backgroundStyle: "transparent", transparent: false }).transparent).toBe(true);
    expect(normalizeConfig({ backgroundStyle: "space" })).toEqual({ backgroundStyle: "space" });
  });

  it("round-trips data-binding (points + arcs + marker color) and drops invalid points", () => {
    const config = {
      selection: "world",
      globeSettings: {
        dataPoints: [
          { lat: 40.7, lng: -74, value: 10 },
          { lat: 51.5, lng: -0.1, value: 6 },
          { lat: 999, lng: 0, value: 5 }, // out of range — dropped
        ],
        dataArcs: true,
        dataMarkerColor: "#ff8800",
      },
    };
    const url = buildShareUrl(config, "https://globestudio.app");
    const parsed = parseShareConfig(`?${url.split("?")[1]}`);
    expect(parsed.globeSettings.dataPoints).toEqual([
      { lat: 40.7, lng: -74, value: 10 },
      { lat: 51.5, lng: -0.1, value: 6 },
    ]);
    expect(parsed.globeSettings.dataArcs).toBe(true);
    expect(parsed.globeSettings.dataMarkerColor).toBe("#ff8800");
  });

  it("round-trips view state + overlay settings", () => {
    const config = {
      viewMode: "flat",
      flatProjection: "equalEarth",
      riversVisible: true,
      citiesVisible: true,
      citiesMinPop: 1000000,
    };
    const url = buildShareUrl(config, "https://globestudio.app");
    const parsed = parseShareConfig(`?${url.split("?")[1]}`);
    expect(parsed).toMatchObject(config);
  });

  it("round-trips every flat projection the picker offers", () => {
    for (const { value } of FLAT_PROJECTION_OPTIONS) {
      const url = buildShareUrl({ viewMode: "flat", flatProjection: value }, "https://globestudio.app");
      expect(parseShareConfig(`?${url.split("?")[1]}`).flatProjection, value).toBe(value);
    }
  });

  it("maps the kebab-case projection ids the schema used to publish", () => {
    expect(normalizeConfig({ flatProjection: "equal-earth" }).flatProjection).toBe("equalEarth");
    expect(normalizeConfig({ flatProjection: "natural-earth" }).flatProjection).toBe("naturalEarth1");
    expect(normalizeConfig({ flatProjection: "winkel-tripel" }).flatProjection).toBe("winkel3");
    // Never a renderer projection (it fell back to Mercator), so it's dropped.
    expect(normalizeConfig({ density: 40, flatProjection: "equirectangular" })).toEqual({ density: 40 });
  });

  it("publishes the renderer's projection ids in the config schema", () => {
    const schemaPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/schema/config.json");
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    expect(schema.properties.flatProjection.enum).toEqual(FLAT_PROJECTION_OPTIONS.map((option) => option.value));
  });

  it("drops invalid view state + overlay values", () => {
    const normalized = normalizeConfig({
      density: 50,
      viewMode: "cube",
      flatProjection: "bogus",
      riversVisible: "yes",
      citiesVisible: 1,
      citiesMinPop: "not-a-number",
    });
    expect(normalized).toEqual({ density: 50 });
  });

  it("clamps citiesMinPop to the supported range", () => {
    expect(normalizeConfig({ citiesMinPop: 9999999999 }).citiesMinPop).toBe(50000000);
    expect(normalizeConfig({ citiesMinPop: -10 }).citiesMinPop).toBe(0);
  });

  it("strips the version marker so importConfig doesn't see it", () => {
    const url = buildShareUrl({ selection: "world" }, "https://globestudio.app");
    const parsed = parseShareConfig(`?${url.split("?")[1]}`);
    expect(parsed).not.toHaveProperty("v");
    expect(parsed).not.toHaveProperty("version");
  });

  it("returns null for missing or malformed config", () => {
    expect(parseShareConfig("")).toBe(null);
    expect(parseShareConfig("?other=value")).toBe(null);
    expect(parseShareConfig("?c=not-valid-base64-json")).toBe(null);
    expect(parseShareConfig(null)).toBe(null);
    expect(parseShareConfig(undefined)).toBe(null);
  });

  it("clamps imported numeric settings to supported ranges", () => {
    const normalized = normalizeConfig({
      density: 999,
      dotSize: -5,
      dotColorAlpha: 10,
      shaderSettings: { effect: "halftone", intensity: 180, cellSize: 99 },
      globeSettings: { glowStrength: -20, gridSize: 999 },
    });

    expect(normalized.density).toBe(100);
    expect(normalized.dotSize).toBe(0.1);
    expect(normalized.dotColorAlpha).toBe(1);
    expect(normalized.shaderSettings.intensity).toBe(100);
    expect(normalized.shaderSettings.cellSize).toBe(30);
    expect(normalized.globeSettings.glowStrength).toBe(0);
    expect(normalized.globeSettings.gridSize).toBe(90);
  });

  it("rejects unknown fields and invalid custom-shape payloads", () => {
    const normalized = normalizeConfig({
      density: 50,
      unknown: "ignored",
      shape: "Custom",
      customShape: {
        type: "text/html",
        dataUrl: "data:text/html,<script>alert(1)</script>",
      },
    });

    expect(normalized).toEqual({ density: 50, shape: "Custom" });
  });

  it("sanitizes imported SVG custom shapes", () => {
    const normalized = normalizeConfig({
      customShape: {
        name: "Logo",
        type: "image/svg+xml",
        svgSource: `<svg onload="bad()"><script>bad()</script><path d="M0 0" /></svg>`,
        dataUrl: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
      },
    });

    expect(normalized.customShape.type).toBe("image/svg+xml");
    expect(normalized.customShape.svgSource).not.toContain("<script>");
    expect(normalized.customShape.svgSource).not.toContain("onload");
  });

  it("lands at / by default — not the caller's current path", () => {
    // Important so the recipient's mount doesn't apply /looks/:id preset
    // defaults on top of the share config and clobber its differences.
    const url = buildShareUrl({ selection: "world" }, "https://globestudio.app");
    expect(new URL(url).pathname).toBe("/");
  });

  it("honors an explicit pathname override", () => {
    const url = buildShareUrl({ selection: "world" }, "https://globestudio.app", "/embed");
    expect(new URL(url).pathname).toBe("/embed");
  });

  it("appends the ?app=1 teaser bypass in VITE_TEASER=1 builds", () => {
    // Without the bypass, recipients land on the coming-soon page and the
    // share config is discarded.
    vi.stubEnv("VITE_TEASER", "1");
    const url = new URL(buildShareUrl({ selection: "world" }, "https://globestudio.app"));
    expect(url.searchParams.get("app")).toBe("1");
    // The appended param must not corrupt the config payload.
    const parsed = parseShareConfig(url.search);
    expect(parsed).toMatchObject({ selection: "world" });
  });

  it("omits the teaser bypass when VITE_TEASER is unset, like the build scripts", () => {
    // Unset means launch mode everywhere (App.jsx, vite.config.js,
    // prerender.js, generate-sitemap.js all test `=== "1"`).
    vi.stubEnv("VITE_TEASER", undefined);
    const url = new URL(buildShareUrl({ selection: "world" }, "https://globestudio.app"));
    expect(url.searchParams.has("app")).toBe(false);
  });

  it("omits the teaser bypass once VITE_TEASER=0 retires the teaser", () => {
    vi.stubEnv("VITE_TEASER", "0");
    const url = new URL(buildShareUrl({ selection: "world" }, "https://globestudio.app"));
    expect(url.searchParams.has("app")).toBe(false);
  });

  it("strips ?c= from the URL after applying", () => {
    if (typeof window === "undefined") return;
    window.history.replaceState({}, "", "/?c=encoded-thing&other=keep");
    expect(window.location.search).toContain("c=");

    clearShareConfigFromUrl();
    expect(window.location.search).not.toContain("c=");
    expect(window.location.search).toContain("other=keep");
  });

  it("clearShareConfigFromUrl is a no-op when ?c= isn't present", () => {
    if (typeof window === "undefined") return;
    window.history.replaceState({}, "", "/looks/halftone?other=value");
    const before = window.location.href;
    clearShareConfigFromUrl();
    expect(window.location.href).toBe(before);
  });
});
