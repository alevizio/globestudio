import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FLOW_SETTINGS } from "../config/backgrounds.js";
import { DEFAULT_GLOBE_SETTINGS } from "../config/globe-settings.js";
import { DEFAULT_SHADER_SETTINGS, shaderEffectOptions } from "../config/shader-effects.js";
import { dotShapeOptions, FLAT_PROJECTION_OPTIONS } from "../config/constants.js";
import { lookPresets } from "../data/look-presets.js";
import { US_STATE_FIPS } from "../data/us-state-codes.js";
import { lookFromPath } from "../hooks/use-route-look.js";
import { FLAT_PROJECTION_KEYS } from "../three/world-texture.js";
import { legacyColorsToLinear } from "./color-space.js";
import {
  BACKGROUND_STYLES,
  buildShareUrl,
  clearShareConfigFromUrl,
  GLOBE_LOOKS,
  normalizeConfig,
  parseShareConfig,
  RENDER_MODES,
  VIEW_MODES,
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

    it("reads a config that carries version, as every link and file the app writes does, as a whole design", () => {
      // The rest comes from the app defaults over any look, as it always
      // did. A design made on the Default look has no shader effect, and
      // over Halftone it took Halftone's shader.
      const config = { version: 1, shaderSettings: { intensity: 80 }, globeSettings: { dataArcs: true } };
      for (const base of [sonar, {}, undefined]) {
        expect(normalizeConfig(config, base)).toEqual({
          shaderSettings: { ...DEFAULT_SHADER_SETTINGS, intensity: 80 },
          globeSettings: { ...DEFAULT_GLOBE_SETTINGS, dataArcs: true },
        });
      }
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

  describe("the config schema, key by key", () => {
    const schemaPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/schema/config.json");
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    const def = (prop) => (prop.$ref ? { ...schema.$defs[prop.$ref.replace("#/$defs/", "")], ...prop } : prop);
    const props = (prop) => def(prop).properties;
    // Not settings: an exported file's $schema, the app's version number in
    // it, and the link format marker v of a ?c= payload. The parser keeps
    // none of them, and reads version only to tell a whole design.
    const MARKERS = ["$schema", "version", "v"];
    const NESTED = ["shaderSettings", "globeSettings", "spaceSettings", "flowSettings"];
    const GRADIENT = { from: "#000000", to: "#ffffff" };

    // The keys normalizeConfig reads from the object `place` puts it in,
    // recorded as it reads them. `answers` lets it read on past a check.
    const keysRead = (place, answers = {}) => {
      const seen = new Set();
      normalizeConfig(place(new Proxy({}, {
        get: (_, key) => {
          if (typeof key === "string") seen.add(key);
          return answers[key];
        },
      })));
      return [...seen].sort();
    };
    const sorted = (keys) => [...keys].sort();

    it("documents every key the parser reads, and no other", () => {
      const top = Object.keys(schema.properties).filter((key) => !MARKERS.includes(key) || key === "version");
      expect(sorted(top)).toEqual(keysRead((config) => config));
      for (const key of NESTED) {
        expect(sorted(Object.keys(props(schema.properties[key]))), key).toEqual(keysRead((value) => ({ [key]: value })));
      }
      expect(sorted(Object.keys(schema.$defs.gradient.properties))).toEqual(keysRead((value) => ({ dotGradient: value }), GRADIENT));
      const svg = { type: "image/svg+xml", dataUrl: "data:image/svg+xml,%3Csvg%3E%3C%2Fsvg%3E", svgSource: "<svg></svg>" };
      expect(sorted(Object.keys(props(schema.properties.customShape)))).toEqual(keysRead((value) => ({ customShape: value }), svg));
      const point = props(schema.properties.globeSettings).dataPoints.items.properties;
      expect(sorted(Object.keys(point))).toEqual(keysRead((value) => ({ globeSettings: { dataPoints: [value] } }), { lat: 0, lng: 0 }));
      // The parser needs none of them.
      expect(schema.required ?? []).toEqual([]);
    });

    // What the parser keeps of one value, read back from where it was put.
    const top = (key) => (value) => normalizeConfig({ [key]: value })?.[key];
    const nested = (parent, key) => (value) => normalizeConfig({ [parent]: { [key]: value } }, {})?.[parent]?.[key];
    const inGradient = (key) => (value) => normalizeConfig({ dotGradient: { ...GRADIENT, [key]: value } })?.dotGradient?.[key];
    const HEX_CANDIDATES = ["#ff8800", "ff8800", "#abc", "#ff880080", "red", "#12", "#123456789", ""];

    // The values a property's type, enum, range and pattern allow, against
    // what the parser keeps, clamps or drops.
    const expectAsDocumented = (name, prop, kept) => {
      const { type, enum: allowed, minimum, maximum, pattern, maxLength, examples = [] } = def(prop);
      const types = [type].flat();
      if (types.includes("null")) expect(kept(null), name).toBeNull();
      if (allowed) {
        for (const value of allowed) expect(kept(value), `${name} ${value}`).toEqual(value);
        expect(kept("not-a-value"), name).toBeUndefined();
        return;
      }
      if (types.includes("boolean")) {
        expect(kept(true), name).toBe(true);
        expect(kept(false), name).toBe(false);
        if (!types.includes("number")) expect(kept("yes"), name).toBeUndefined();
      }
      if (types.includes("number")) {
        expect([typeof minimum, typeof maximum], `${name} documents its range`).toEqual(["number", "number"]);
        expect(kept(minimum), name).toBe(minimum);
        expect(kept(maximum), name).toBe(maximum);
        expect(kept(minimum - 1), `${name} below its range`).toBe(minimum);
        expect(kept(maximum + 1), `${name} above its range`).toBe(maximum);
        expect(kept("lots"), name).toBeUndefined();
      }
      if (types.includes("string")) {
        for (const example of examples) if (typeof example === "string") expect(kept(example), `${name} ${example}`).toBeDefined();
        if (pattern) {
          const re = new RegExp(pattern);
          for (const candidate of [...examples.filter((example) => typeof example === "string"), ...HEX_CANDIDATES]) {
            expect(kept(candidate) !== undefined, `${name} ${JSON.stringify(candidate)}`).toBe(re.test(candidate));
          }
        }
        if (maxLength) expect(Array.from(kept("x".repeat(maxLength + 5))), `${name} maxLength`).toHaveLength(maxLength);
      }
    };

    it("takes the values each setting documents, in the ranges it gives", () => {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (MARKERS.includes(key) || NESTED.includes(key) || key === "customShape") continue;
        if (def(prop).properties) continue; // gradients, below
        expectAsDocumented(key, prop, top(key));
      }
      for (const parent of NESTED) {
        for (const [key, prop] of Object.entries(props(schema.properties[parent]))) {
          if (key === "dataPoints") continue; // its own test, above
          if (def(prop).properties) continue;
          expectAsDocumented(`${parent}.${key}`, prop, nested(parent, key));
        }
      }
      for (const [key, prop] of Object.entries(schema.$defs.gradient.properties)) {
        expectAsDocumented(`gradient.${key}`, prop, inGradient(key));
      }
    });

    it("points every gradient at the one gradient the parser reads", () => {
      const gradients = [
        ...Object.entries(schema.properties),
        ...Object.entries(props(schema.properties.globeSettings)).map(([key, prop]) => [`globeSettings.${key}`, prop]),
      ].filter(([key]) => /Gradient$/.test(key));
      expect(gradients.map(([key]) => key).sort()).toEqual([
        "dotGradient", "globeSettings.gridGradient", "globeSettings.surfaceGradient", "worldFillGradient", "worldStrokeGradient",
      ]);
      for (const [key, prop] of gradients) expect(prop.$ref, key).toBe("#/$defs/gradient");
      const full = { ...GRADIENT, angle: 90, fromAlpha: 0.5, toAlpha: 1 };
      expect(normalizeConfig({ worldStrokeGradient: full }).worldStrokeGradient).toEqual(full);
      expect(normalizeConfig({ globeSettings: { gridGradient: full } }, {}).globeSettings.gridGradient).toEqual(full);
      expect(normalizeConfig({ dotGradient: { from: "#000000" } })).toBeNull();
    });

    it("lists the shapes and effects the app offers", () => {
      expect(schema.properties.shape.enum).toEqual(dotShapeOptions.map((option) => option.value ?? option));
      expect(props(schema.properties.shaderSettings).effect.enum).toEqual(shaderEffectOptions.map((option) => option.value));
    });

    it("lists exactly the values the parser takes for each choice", () => {
      // The value checks above catch a value the schema adds; these catch
      // one the parser adds and the schema misses.
      expect(sorted(schema.properties.backgroundStyle.enum)).toEqual(sorted(BACKGROUND_STYLES));
      expect(sorted(schema.properties.renderMode.enum)).toEqual(sorted(RENDER_MODES));
      expect(sorted(schema.properties.viewMode.enum)).toEqual(sorted(VIEW_MODES));
      expect(sorted(props(schema.properties.globeSettings).look.enum)).toEqual(sorted(GLOBE_LOOKS));
    });

    it("describes a custom shape the parser keeps", () => {
      const shape = def(schema.properties.customShape);
      expect(shape.properties.type.enum).toEqual(["image/svg+xml", "image/png", "image/jpeg", "image/webp"]);
      expect(shape.required).toEqual(["type", "dataUrl"]);
      const png = { name: "Logo", type: "image/png", dataUrl: "data:image/png;base64,iVBORw0KGgo=" };
      expect(normalizeConfig({ customShape: png }).customShape).toEqual(png);
      expect(normalizeConfig({ customShape: null }).customShape).toBeNull();
      expect(normalizeConfig({ customShape: "<svg></svg>" })).toBeNull();
      const tooLong = { ...png, dataUrl: `data:image/png;base64,${"A".repeat(shape.properties.dataUrl.maxLength)}` };
      expect(normalizeConfig({ customShape: tooLong })).toBeNull();
    });

    it("lists every US state value the parser takes", () => {
      const documented = schema.properties.stateSelection.anyOf.flatMap((option) => option.enum ?? [option.const]);
      expect(sorted(documented)).toEqual(sorted(["all", ...Object.keys(US_STATE_FIPS), ...Object.values(US_STATE_FIPS)]));
      for (const value of documented) {
        expect(normalizeConfig({ stateSelection: value }).stateSelection, value).toBe(US_STATE_FIPS[value] ?? value);
      }
    });

    it("documents the link format the app writes", () => {
      expect(schema.properties.v.enum).toEqual([1, 2, 3]);
      expect(JSON.parse(new URL(buildShareUrl({}, "https://globestudio.app")).searchParams.get("c")).v).toBe(2);
      expect(JSON.parse(new URL(buildShareUrl({ version: 2 }, "https://globestudio.app")).searchParams.get("c")).v).toBe(3);
      expect(schema.properties.version.type).toEqual(["integer", "string"]);
      for (const version of [1, "1", 2]) {
        expect(normalizeConfig({ version, shaderSettings: { intensity: 80 } }, {}), String(version))
          .toEqual({ shaderSettings: { ...DEFAULT_SHADER_SETTINGS, intensity: 80 } });
      }
    });
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

  it("reads a US state by its postal code or its FIPS code, and drops anything else", () => {
    const state = (stateSelection) => normalizeConfig({ selection: "country:USA", stateSelection })?.stateSelection;
    // The FIPS code is the us-atlas id the studio's State picker stores.
    expect(state("all")).toBe("all");
    expect(state("06")).toBe("06");
    expect(state("CA")).toBe("06");
    expect(state("DC")).toBe("11");
    expect(state("PR")).toBe("72");
    // The studio showed Alabama, the first state in its list, for these.
    for (const unknown of ["ca", "ZZ", "99", "6", "California", "50% off", "", 6, null]) {
      expect(state(unknown), String(unknown)).toBeUndefined();
    }
  });

  describe("colors", () => {
    // A v3 payload, or a design the studio wrote with version 2, has hex
    // colors, which render as their hex. Anything else has old colors,
    // which render darker, as every link always has (utils/color-space.js).
    const link = (config) => `?c=${encodeURIComponent(JSON.stringify(config))}`;
    const picked = {
      dotColor: "#808080",
      dotGradient: { from: "#ff8000", to: "#4080c0", angle: 90 },
      worldFill: "#4080c0",
      globeSettings: { gridColor: "#808080", glowColor: "#4080c0", arcColor: "#ff8000" },
      flowSettings: { colorA: "#635bff" },
    };
    const url = (config) => new URL(buildShareUrl(config, "https://globestudio.app"));

    it("writes a design with old colors as before, and one with hex colors as v3", () => {
      expect(JSON.parse(url({ version: 1, ...picked }).searchParams.get("c")).v).toBe(2);
      expect(JSON.parse(url(picked).searchParams.get("c")).v).toBe(2);
      expect(JSON.parse(url({ version: 2, ...picked }).searchParams.get("c")).v).toBe(3);
    });

    it("reads every color of a link as sent, and marks the ones with hex colors", () => {
      for (const v of [undefined, 1, 2]) {
        const parsed = parseShareConfig(link(v === undefined ? picked : { v, ...picked }));
        expect(parsed, `v${v}`).toMatchObject(picked);
        expect(parsed, `v${v}`).not.toHaveProperty("hexColors");
      }
      for (const config of [{ v: 3, ...picked }, { v: 2, version: 2, ...picked }, { version: "2", ...picked }]) {
        const parsed = parseShareConfig(link(config));
        expect(parsed, JSON.stringify(config).slice(0, 20)).toMatchObject({ ...picked, hexColors: true });
      }
      expect(parseShareConfig(url({ version: 2, ...picked }).search)).toMatchObject({ ...picked, hexColors: true });
      expect(parseShareConfig(link({ v: 3 }))).toBe(null);
    });

    it("fills the gaps of a link with hex colors from the look or the defaults, turned to render the same", () => {
      const toon = lookPresets.find((look) => look.id === "toon").settings;
      const partial = { globeSettings: { gridStrength: 20 }, flowSettings: { motion: 10 } };
      // Over a look, as /looks/toon reads it.
      expect(parseShareConfig(link({ v: 3, ...partial }), toon)).toMatchObject({
        globeSettings: { ...legacyColorsToLinear(toon).globeSettings, gridStrength: 20 },
        flowSettings: { ...legacyColorsToLinear(toon).flowSettings, motion: 10 },
      });
      // A whole design, over the app defaults.
      expect(parseShareConfig(link({ v: 3, version: 2, ...partial }), toon).flowSettings)
        .toEqual({ ...legacyColorsToLinear({ flowSettings: DEFAULT_FLOW_SETTINGS }).flowSettings, motion: 10 });
      // Old colors stay old.
      expect(parseShareConfig(link({ v: 2, ...partial }), toon).flowSettings).toEqual({ ...toon.flowSettings, motion: 10 });
      expect(parseShareConfig(link({ v: 2, ...partial }), toon).globeSettings.gridColor).toBe(toon.globeSettings.gridColor);
    });
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

    // stateSelection takes only a state's code now. Two hand made links here
    // used it to carry free text, which is dropped; every link the app made
    // carries "all" or the code its State picker stores.
    const STATE_VALUES = new Set(["all", ...Object.values(US_STATE_FIPS)]);
    const withoutStateText = (config) => {
      if (config?.stateSelection === undefined || STATE_VALUES.has(config.stateSelection)) return config;
      const { stateSelection, ...rest } = config;
      return rest;
    };

    it("carry no state text but in two hand made links", () => {
      const withText = links.filter(({ expected, now }) => withoutStateText(now ?? expected) !== (now ?? expected));
      expect(withText.map((link) => link.name)).toEqual(["stateSelection with %", "unicode text"]);
    });

    // The Data section added globeSettings.data after 39d9382, defaulting
    // to true (markers shown). An old link can't carry it, so the parser
    // fills the default; strip it to compare with what 39d9382 returned.
    const withoutNewDefaults = (config) => {
      if (config?.globeSettings?.data !== true) return config;
      const { data, ...globeSettings } = config.globeSettings;
      return { ...config, globeSettings };
    };

    it("open exactly as before", () => {
      for (const { name, url, expected, now } of links) {
        if (now) continue;
        expect(withoutNewDefaults(parseShareConfig(new URL(url).search)), name).toEqual(withoutStateText(expected));
      }
    });

    it("open exactly as before in the studio, over the look their path names", () => {
      // As use-share-config-import.js reads them. The embed reads ?c= with {}
      // and layers it over its look itself (embed-view.jsx).
      for (const { name, url, expected, now } of links) {
        const { pathname, search } = new URL(url);
        if (now || pathname === "/embed") continue;
        expect(withoutNewDefaults(parseShareConfig(search, lookFromPath(pathname)?.settings)), name).toEqual(withoutStateText(expected));
      }
    });

    it("that the studio made open exactly as before over any look, as an embed with a look reads them", () => {
      // Every design the studio writes carries version (App.jsx
      // buildCurrentConfig). One made on the Default look has no shader
      // effect, and embed.js with data-look and data-config showed the
      // look's shader over it.
      const designs = links.filter(({ url }) => new URL(url).searchParams.get("c")?.includes('"version":1'));
      expect(designs.length).toBeGreaterThanOrEqual(30);
      for (const { name, url, expected } of designs) {
        for (const base of [{}, ...lookPresets.map((look) => look.settings)]) {
          expect(withoutNewDefaults(parseShareConfig(new URL(url).search, base)), name).toEqual(withoutStateText(expected));
        }
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
        expect(parseShareConfig(new URL(url).search), name).toEqual(withoutStateText(now));
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
