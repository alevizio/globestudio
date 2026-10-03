import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_GLOBE_SETTINGS } from "../config/globe-settings.js";
import { DEFAULT_SHADER_SETTINGS } from "../config/shader-effects.js";
import { FLAT_PROJECTION_OPTIONS } from "../config/constants.js";
import { lookPresets } from "../data/look-presets.js";
import { FLAT_PROJECTION_KEYS } from "../three/world-texture.js";
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

  it("round-trips a hidden Data layer with its points kept", () => {
    const config = {
      globeSettings: {
        data: false,
        dataPoints: [{ lat: 40.7, lng: -74, value: 10 }],
      },
    };
    const url = buildShareUrl(config, "https://globestudio.app");
    const parsed = parseShareConfig(`?${url.split("?")[1]}`);
    expect(parsed.globeSettings.data).toBe(false);
    expect(parsed.globeSettings.dataPoints).toEqual([{ lat: 40.7, lng: -74, value: 10 }]);
    // A saved config or JSON export goes through the same normalizer.
    expect(normalizeConfig(JSON.parse(JSON.stringify(config))).globeSettings.data).toBe(false);
    // Links made before the eye existed keep showing their markers.
    const legacy = normalizeConfig({ globeSettings: { dataPoints: config.globeSettings.dataPoints } });
    expect(legacy.globeSettings.data).toBe(true);
    // Non boolean values are dropped back to the default.
    expect(normalizeConfig({ globeSettings: { data: "no", dataArcs: true } }).globeSettings.data).toBe(true);
  });

  it("round-trips a custom glow color", () => {
    // The panel's glow color picker writes globeSettings.glowColor; the
    // parser had no rule for it, so links opened on the default glow.
    const url = buildShareUrl({ globeSettings: { ...DEFAULT_GLOBE_SETTINGS, glowColor: "#ff00aa" } }, "https://globestudio.app");
    expect(parseShareConfig(`?${url.split("?")[1]}`)?.globeSettings?.glowColor).toBe("#ff00aa");
    // null is the auto glow; anything that isn't hex falls back to it.
    expect(normalizeConfig({ globeSettings: { glowColor: null } })?.globeSettings?.glowColor).toBeNull();
    expect(normalizeConfig({ globeSettings: { glow: true, glowColor: "red" } }).globeSettings.glowColor).toBeNull();
  });

  it("parses every globeSettings key the app stores", () => {
    for (const [key, value] of Object.entries(DEFAULT_GLOBE_SETTINGS)) {
      expect(normalizeConfig({ globeSettings: { [key]: value } })?.globeSettings?.[key], key).toEqual(value);
    }
  });

  describe("a link that gives only some of a nested object's settings", () => {
    const NESTED = ["shaderSettings", "globeSettings", "spaceSettings", "flowSettings"];
    const sonar = lookPresets.find((look) => look.id === "topographic").settings;
    const link = (config) => `?c=${encodeURIComponent(JSON.stringify({ v: 2, ...config }))}`;
    const points = [{ lat: 35.68, lng: 139.69, value: 3 }, { lat: 51.5, lng: -0.1, value: 2 }];

    it("keeps the look's values for the rest on the look it opens on", () => {
      // What an MCP link for Sonar with data points carries. The app used to
      // fill the rest with its defaults and bring back the glow and grid
      // Sonar turns off.
      const parsed = parseShareConfig(link({ globeSettings: { dataPoints: points, dataArcs: true } }), sonar);
      expect(parsed.globeSettings).toEqual({ ...sonar.globeSettings, dataPoints: points, dataArcs: true });
      expect(parsed.globeSettings.glow).toBe(false);
      expect(parsed.globeSettings.grid).toBe(false);
      // One shader knob used to switch the look's shader off.
      expect(parseShareConfig(link({ shaderSettings: { intensity: 80 } }), sonar).shaderSettings)
        .toEqual({ ...sonar.shaderSettings, intensity: 80 });
    });

    it("starts from the app defaults, the Default look's, on a link that names no look", () => {
      expect(parseShareConfig(link({ shaderSettings: { intensity: 80 } })).shaderSettings)
        .toEqual({ ...DEFAULT_SHADER_SETTINGS, intensity: 80 });
      expect(normalizeConfig({ globeSettings: { dataArcs: true } }).globeSettings)
        .toEqual({ ...DEFAULT_GLOBE_SETTINGS, dataArcs: true });
    });

    it("keeps only the keys given for a reader that layers them over its look itself", () => {
      // The embed does, in buildSettings.
      expect(parseShareConfig(link({ shaderSettings: { intensity: 80 }, globeSettings: { dataArcs: true } }), {}))
        .toEqual({ shaderSettings: { intensity: 80 }, globeSettings: { dataArcs: true } });
    });

    it("loses none of a look's own values", () => {
      for (const { id, settings } of lookPresets) {
        for (const key of NESTED) {
          expect(normalizeConfig({ [key]: settings[key] }, {})[key], `${id} ${key}`).toEqual(settings[key]);
        }
      }
    });
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

  it("offers exactly the projections the renderer draws", () => {
    // The picker's list lives apart from the renderer so the panel doesn't
    // load three.js; this keeps the two from drifting.
    expect(FLAT_PROJECTION_OPTIONS.map((option) => option.value)).toEqual(FLAT_PROJECTION_KEYS);
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

  it("documents the Data keys of globeSettings in the shapes the parser accepts", () => {
    const schemaPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/schema/config.json");
    const globe = JSON.parse(readFileSync(schemaPath, "utf8")).properties.globeSettings.properties;
    const kept = (key, value) => normalizeConfig({ globeSettings: { [key]: value } })?.globeSettings?.[key];
    const dataKeys = (keys) => keys.filter((key) => /^data(?:[A-Z]|$)/.test(key)).sort();

    // Every Data setting the app stores is documented.
    expect(dataKeys(Object.keys(globe))).toEqual(dataKeys(Object.keys(DEFAULT_GLOBE_SETTINGS)));

    for (const key of ["data", "dataArcs"]) {
      expect(globe[key].type, key).toBe("boolean");
      expect(kept(key, true), key).toBe(true);
      expect(kept(key, false), key).toBe(false);
      expect(kept(key, "yes"), key).toBeUndefined();
    }

    // dataMarkerColor: a string the schema pattern allows, or null.
    const color = globe.dataMarkerColor;
    expect(color.type).toEqual(["string", "null"]);
    expect(kept("dataMarkerColor", null)).toBeNull();
    const pattern = new RegExp(color.pattern);
    for (const candidate of ["#ff8800", "ff8800", "#abc", "#ff880080", "red", "#12", "#123456789", ""]) {
      expect(kept("dataMarkerColor", candidate) !== undefined, candidate).toBe(pattern.test(candidate));
    }
    for (const example of color.examples) expect(kept("dataMarkerColor", example)).toBe(example);

    // dataPoints: [{ lat, lng, value? }], in range, capped at maxItems.
    const points = globe.dataPoints;
    const { lat, lng, value } = points.items.properties;
    expect(points.type).toBe("array");
    expect(points.items.required).toEqual(["lat", "lng"]);
    const onBounds = [
      { lat: lat.minimum, lng: lng.minimum, value: 1 },
      { lat: lat.maximum, lng: lng.maximum, value: 1 },
    ];
    expect(kept("dataPoints", onBounds)).toEqual(onBounds);
    expect(kept("dataPoints", [
      { lat: lat.minimum - 0.1, lng: 0 },
      { lat: lat.maximum + 0.1, lng: 0 },
      { lat: 0, lng: lng.minimum - 0.1 },
      { lat: 0, lng: lng.maximum + 0.1 },
      { lng: 0, value: 1 },
      { lat: 0, value: 1 },
    ])).toEqual([]);
    expect(kept("dataPoints", [{ lat: 0, lng: 0 }])).toEqual([{ lat: 0, lng: 0, value: value.default }]);
    const tooMany = Array.from({ length: points.maxItems + 1 }, (_, index) => ({ lat: 0, lng: index % 180, value: 1 }));
    expect(kept("dataPoints", tooMany)).toHaveLength(points.maxItems);
    for (const example of points.examples) expect(kept("dataPoints", example)).toEqual(example);
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

  describe("values with a % sign", () => {
    const roundTrip = (config) => parseShareConfig(new URL(buildShareUrl(config, "https://globestudio.app")).search);

    it("round-trips % in the ASCII symbol", () => {
      for (const asciiSymbol of ["%", "100%", "%41", "%25", "%%"]) {
        expect(roundTrip({ shape: "ASCII", asciiSymbol, density: 55 }), asciiSymbol).toEqual({
          shape: "ASCII",
          asciiSymbol,
          density: 55,
        });
      }
    });

    it("round-trips an SVG custom shape, whose data URL is percent encoded", () => {
      const svgSource = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text>50%</text><circle cx="5" cy="5" r="4"/></svg>`;
      const customShape = {
        name: "Dot",
        type: "image/svg+xml",
        svgSource,
        dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgSource)}`,
      };
      expect(roundTrip({ shape: "Custom", customShape })).toEqual({ shape: "Custom", customShape });
    });

    it("round-trips % in the state selection text", () => {
      expect(roundTrip({ selection: "country:USA", stateSelection: "50% off %E2" })).toEqual({
        selection: "country:USA",
        stateSelection: "50% off %E2",
      });
    });

    it("marks new links v2 and reads them with a single decode", () => {
      const url = new URL(buildShareUrl({ asciiSymbol: "%41" }, "https://globestudio.app"));
      expect(JSON.parse(url.searchParams.get("c"))).toEqual({ v: 2, asciiSymbol: "%41" });
    });

    it("reads a v2 token encoded twice, as @globestudio/react and embed.js pass it", () => {
      const url = new URL(buildShareUrl({ shape: "ASCII", asciiSymbol: "%" }, "https://globestudio.app"));
      const token = url.search.slice("?c=".length);
      const embed = new URLSearchParams({ c: token, source: "react" });
      expect(parseShareConfig(`?${embed}`)).toEqual({ shape: "ASCII", asciiSymbol: "%" });
    });
  });

  describe("links in the old v1 format", () => {
    // Built by the encoder of 39d9382, the last commit before v2; expected
    // is what that commit's parser returned. See the fixture's _comment.
    const legacyPath = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/legacy-share-links.json");
    const { links } = JSON.parse(readFileSync(legacyPath, "utf8"));

    it("covers the formats that matter", () => {
      expect(links.length).toBeGreaterThanOrEqual(50);
      const names = links.map((link) => link.name).join("\n");
      for (const part of ["studio link", "embed", "teaser", "encoded twice", "custom SVG", "hand written", "copied from the app"]) {
        expect(names).toContain(part);
      }
    });

    it("open exactly as before", () => {
      // The Data section added globeSettings.data after 39d9382, defaulting
      // to true (markers shown). An old link can't carry it, so the parser
      // fills the default; strip it to compare with what 39d9382 returned.
      const withoutNewDefaults = (config) => {
        if (config?.globeSettings?.data !== true) return config;
        const { data, ...globeSettings } = config.globeSettings;
        return { ...config, globeSettings };
      };
      for (const { name, url, expected, now } of links) {
        if (now) continue;
        expect(withoutNewDefaults(parseShareConfig(new URL(url).search)), name).toEqual(expected);
      }
    });

    it("that used to open with nothing now open with the sender's config", () => {
      const rescued = links.filter((link) => link.now);
      expect(rescued.map((link) => link.name)).toEqual([
        "asciiSymbol %",
        "asciiSymbol 100%",
        "stateSelection with %",
        "custom SVG shape",
        "React config with % from searchParams.get (encoded once)",
      ]);
      for (const { name, url, expected, now } of rescued) {
        expect(expected, name).toBe(null);
        expect(parseShareConfig(new URL(url).search), name).toEqual(now);
      }
    });
  });

  it("returns null for missing or malformed config", () => {
    expect(parseShareConfig("")).toBe(null);
    expect(parseShareConfig("?other=value")).toBe(null);
    expect(parseShareConfig("?c=not-valid-base64-json")).toBe(null);
    // A value Number() cannot convert throws inside normalizeConfig.
    expect(parseShareConfig(`?c=${encodeURIComponent('{"v":2,"density":{"valueOf":1,"toString":1}}')}`)).toBe(null);
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
