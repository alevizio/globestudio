/**
 * The app's `?c=` share-config contract, mirrored for the MCP server.
 *
 * Mirrors normalizeConfig in src/utils/share-config.js (the parser every
 * Globestudio link goes through) so read_share_url reports exactly the values
 * the app applies, and build_share_url only emits values the app keeps. Kept
 * inline for the same reason as the preset catalog in server.ts: the package
 * publishes to npm with zero runtime deps on the app source.
 *
 * One deliberate difference: the app completes a nested settings object
 * (shaderSettings, globeSettings, spaceSettings, flowSettings) that a link
 * gives in part, from the look the link opens on or from its defaults when it
 * names none, and this mirror leaves the missing keys out, so a decoded link
 * lists only the values the link itself carries. The contract test
 * (test/stdio-contract.test.mjs) merges the app's defaults back in and asserts
 * the two parsers agree on real links copied from the app, so any drift fails
 * CI.
 */

export type ShareConfig = Record<string, unknown>;

const PARAM_KEY = "c";
// v2 payloads are decoded once, v1 (every link made before v2) twice, as in
// the app. See "Versions" at the top of src/utils/share-config.js.
const VERSION = 2;
const HEX_RE = /^#?[0-9a-fA-F]{3,8}$/;
const SELECTION_RE = /^(world|country:[A-Z]{3}|continent:[\w\s-]+|subregion:[\w\s-]+)$/;
const ALLOWED_IMAGE_DATA_RE = /^data:image\/(?:png|jpe?g|webp);base64,/i;
const ALLOWED_ENCODED_SVG_RE = /^data:image\/svg\+xml(?:;charset=[^;,]+)?,/i;
const MAX_ASCII_SYMBOL_LENGTH = 12;
// src/config/constants.js CUSTOM_SHAPE_MAX_BYTES
const CUSTOM_SHAPE_MAX_BYTES = 200 * 1024;

// src/config/constants.js dotShapeOptions (all of them, "Custom" included).
const SHAPES = new Set([
  "Circle", "Hexagon", "Triangle", "Pentagon", "Square", "Voxel", "Particle Grid",
  "Diamond", "Star", "Plus", "Ring", "ASCII", "Custom",
]);
// src/config/shader-effects.js shaderEffectOptions values.
const SHADER_EFFECTS = new Set([
  "none", "bloom", "chromatic", "crt", "halftone", "pixel", "threshold", "glitch", "edge",
  "wave", "metal", "pencil", "toon", "stripes", "badtv", "rgb", "chroma", "corrupt", "bayer",
  "iridescent", "risograph", "newsprint", "aurora", "atkinson", "ascii",
]);
const BACKGROUND_STYLES = new Set(["solid", "space", "flow"]);
const RENDER_MODES = new Set(["dots", "solid"]);
const VIEW_MODES = new Set(["globe", "flat"]);
const GLOBE_LOOKS = new Set(["classic", "borderless"]);
const FLAT_PROJECTIONS = new Set(["mercator", "equalEarth", "naturalEarth1", "winkel3", "robinson"]);
const FLAT_PROJECTION_ALIASES: Record<string, string> = {
  "equal-earth": "equalEarth",
  "natural-earth": "naturalEarth1",
  "winkel-tripel": "winkel3",
};

/** The nested settings objects; merged key by key, like the app's importConfig. */
export const NESTED_KEYS = ["shaderSettings", "globeSettings", "spaceSettings", "flowSettings"] as const;

type Rule = (value: unknown) => unknown;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeHex = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !HEX_RE.test(value)) return undefined;
  return value.startsWith("#") ? value : `#${value}`;
};
const normalizeBoolean = (value: unknown): boolean | undefined => (typeof value === "boolean" ? value : undefined);
const normalizeEnum = (value: unknown, allowed: Set<string>): string | undefined =>
  typeof value === "string" && allowed.has(value) ? value : undefined;
const normalizeNumber = (value: unknown, min: number, max: number): number | undefined => {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return clampNumber(number, min, max);
};
// src/data/us-state-codes.js US_STATE_FIPS: each US state, DC and territory
// by postal code, with the FIPS code the app stores as stateSelection.
const US_STATE_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09", DE: "10", DC: "11",
  FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18", IA: "19", KS: "20", KY: "21",
  LA: "22", ME: "23", MD: "24", MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30",
  NE: "31", NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38", OH: "39",
  OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46", TN: "47", TX: "48", UT: "49",
  VT: "50", VA: "51", WA: "53", WV: "54", WI: "55", WY: "56", AS: "60", GU: "66", MP: "69",
  PR: "72", VI: "78",
};
const US_STATE_IDS = new Set(Object.values(US_STATE_FIPS));
// A FIPS code as is, a postal code as its FIPS code; anything else is
// dropped, as in the app.
const normalizeStateSelection = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  if (value === "all" || US_STATE_IDS.has(value)) return value;
  return Object.prototype.hasOwnProperty.call(US_STATE_FIPS, value) ? US_STATE_FIPS[value] : undefined;
};
const normalizeProjection = (value: unknown) =>
  normalizeEnum(
    typeof value === "string" && Object.prototype.hasOwnProperty.call(FLAT_PROJECTION_ALIASES, value) ? FLAT_PROJECTION_ALIASES[value] : value,
    FLAT_PROJECTIONS,
  );
const apply = (target: ShareConfig, key: string, value: unknown) => {
  if (value !== undefined) target[key] = value;
};
const percent: Rule = (value) => normalizeNumber(value, 0, 100);
const hexOrNull: Rule = (value) => (value === null ? null : normalizeHex(value));

const normalizeGradient = (value: unknown) => {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const from = normalizeHex(value.from);
  const to = normalizeHex(value.to);
  if (!from || !to) return undefined;
  const gradient: ShareConfig = { from, to };
  apply(gradient, "angle", normalizeNumber(value.angle, 0, 360));
  apply(gradient, "fromAlpha", normalizeNumber(value.fromAlpha, 0, 1));
  apply(gradient, "toAlpha", normalizeNumber(value.toAlpha, 0, 1));
  return gradient;
};

// ASCII-only lowercase keeps every index in place, which the case-insensitive
// search below relies on (String#toLowerCase can change the length).
const asciiLower = (text: string) => text.replace(/[A-Z]/g, (ch) => ch.toLowerCase());

/**
 * Same output as the app's sanitizeSvgSource (src/utils/custom-shape.js), but
 * the script stripping runs in linear time. The app's lazy /<script[\s\S]*?<\/script>/gi
 * rescans to the end of the input from every unclosed "<script", which is
 * fine in a browser but lets one crafted link burn CPU on a public server.
 */
const sanitizeSvgSource = (source: string) => {
  const lower = asciiLower(source);
  let out = "";
  let from = 0;
  for (;;) {
    const start = lower.indexOf("<script", from);
    if (start === -1) break;
    const end = lower.indexOf("</script>", start + "<script".length);
    // No closing tag after this opener means none after any later opener
    // either, so the regex would stop matching here too.
    if (end === -1) break;
    out += source.slice(from, start);
    from = end + "</script>".length;
  }
  out += source.slice(from);
  return out
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
};

const normalizeCustomShape = (value: unknown) => {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const type = typeof value.type === "string" ? value.type : "";
  const dataUrl = typeof value.dataUrl === "string" ? value.dataUrl : "";
  if (!dataUrl || dataUrl.length > CUSTOM_SHAPE_MAX_BYTES * 2) return undefined;

  if (type === "image/svg+xml" || ALLOWED_ENCODED_SVG_RE.test(dataUrl)) {
    let encoded = "";
    try {
      encoded = ALLOWED_ENCODED_SVG_RE.test(dataUrl)
        ? decodeURIComponent(dataUrl.replace(ALLOWED_ENCODED_SVG_RE, ""))
        : "";
    } catch {
      return undefined;
    }
    const source = typeof value.svgSource === "string" ? value.svgSource : encoded;
    if (!source || !/<svg[\s>]/i.test(source)) return undefined;
    const svgSource = sanitizeSvgSource(source);
    return {
      name: typeof value.name === "string" ? value.name.slice(0, 80) : "Custom shape",
      type: "image/svg+xml",
      svgSource,
      dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgSource)}`,
    };
  }

  if (!["image/png", "image/jpeg", "image/webp"].includes(type) || !ALLOWED_IMAGE_DATA_RE.test(dataUrl)) {
    return undefined;
  }
  return {
    name: typeof value.name === "string" ? value.name.slice(0, 80) : "Custom shape",
    type,
    dataUrl,
  };
};

const normalizeDataPoints = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;
  const points: { lat: number; lng: number; value: number }[] = [];
  for (const p of value) {
    if (!isRecord(p)) continue;
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    const v = Number(p.value);
    points.push({ lat, lng, value: Number.isFinite(v) ? v : 1 });
    if (points.length >= 250) break;
  }
  return points;
};

const normalizeSettings = (value: unknown, rules: Record<string, Rule>) => {
  if (!isRecord(value)) return undefined;
  const next: ShareConfig = {};
  for (const [key, rule] of Object.entries(rules)) {
    if (value[key] === undefined) continue;
    apply(next, key, rule(value[key]));
  }
  return Object.keys(next).length > 0 ? next : undefined;
};

const SHADER_RULES: Record<string, Rule> = {
  effect: (value) => normalizeEnum(value, SHADER_EFFECTS),
  intensity: percent,
  split: percent,
  grain: percent,
  scanlines: percent,
  cellSize: (value) => normalizeNumber(value, 0, 30),
  threshold: percent,
  warp: percent,
  motion: percent,
};

const GLOBE_RULES: Record<string, Rule> = {
  look: (value) => normalizeEnum(value, GLOBE_LOOKS),
  autoSpin: normalizeBoolean,
  autoSpinSpeed: percent,
  dotLift: percent,
  glow: normalizeBoolean,
  glowStrength: percent,
  glowSpread: percent,
  glowColor: hexOrNull,
  grid: normalizeBoolean,
  gridColor: normalizeHex,
  gridGradient: normalizeGradient,
  gridLift: percent,
  gridSize: (value) => normalizeNumber(value, 5, 90),
  gridStrength: percent,
  network: normalizeBoolean,
  networkStrength: percent,
  networkArcs: (value) => (typeof value === "boolean" ? value : percent(value)),
  networkPulses: (value) => (typeof value === "boolean" ? value : percent(value)),
  arcColor: hexOrNull,
  pulseColor: hexOrNull,
  networkMono: normalizeBoolean,
  routes: normalizeBoolean,
  routesStrength: percent,
  surface: normalizeBoolean,
  surfaceStrength: percent,
  surfaceColor: normalizeHex,
  surfaceGradient: normalizeGradient,
  dataPoints: normalizeDataPoints,
  dataArcs: normalizeBoolean,
  dataMarkerColor: hexOrNull,
};

const SPACE_RULES: Record<string, Rule> = {
  density: percent,
  motion: percent,
  nebula: percent,
  hue: (value) => normalizeNumber(value, 0, 360),
  brightness: (value) => normalizeNumber(value, 0, 200),
};

const FLOW_RULES: Record<string, Rule> = {
  colorA: normalizeHex,
  colorB: normalizeHex,
  colorC: normalizeHex,
  motion: percent,
  turbulence: percent,
  grain: percent,
  scale: percent,
  brightness: (value) => normalizeNumber(value, 0, 200),
};

/** Keep only the keys and values the app accepts. Returns {} when none are left. */
export const normalizeConfig = (config: unknown): ShareConfig => {
  if (!isRecord(config)) return {};
  const next: ShareConfig = {};

  apply(next, "selection", typeof config.selection === "string" && SELECTION_RE.test(config.selection) ? config.selection : undefined);
  apply(next, "stateSelection", normalizeStateSelection(config.stateSelection));
  apply(next, "background", normalizeHex(config.background));
  apply(next, "transparent", normalizeBoolean(config.transparent));
  apply(next, "backgroundStyle", normalizeEnum(config.backgroundStyle, BACKGROUND_STYLES));
  apply(next, "density", normalizeNumber(config.density, 1, 100));
  apply(next, "dotSize", normalizeNumber(config.dotSize, 0.1, 30));
  apply(next, "dotColor", normalizeHex(config.dotColor));
  apply(next, "dotColorAlpha", normalizeNumber(config.dotColorAlpha, 0, 1));
  apply(next, "dotGradient", normalizeGradient(config.dotGradient));
  apply(next, "dotsVisible", normalizeBoolean(config.dotsVisible));
  apply(next, "shape", normalizeEnum(config.shape, SHAPES));
  apply(next, "dotRotation", normalizeNumber(config.dotRotation, 0, 360));
  apply(next, "shapeRotationSpeed", normalizeNumber(config.shapeRotationSpeed, 0, 100));
  apply(next, "sizeVary", normalizeBoolean(config.sizeVary));
  apply(next, "asciiSymbol", typeof config.asciiSymbol === "string" ? Array.from(config.asciiSymbol).slice(0, MAX_ASCII_SYMBOL_LENGTH).join("") : undefined);
  apply(next, "customShape", normalizeCustomShape(config.customShape));
  apply(next, "renderMode", normalizeEnum(config.renderMode, RENDER_MODES));
  apply(next, "worldFill", normalizeHex(config.worldFill));
  apply(next, "worldFillAlpha", normalizeNumber(config.worldFillAlpha, 0, 1));
  apply(next, "worldFillGradient", normalizeGradient(config.worldFillGradient));
  apply(next, "worldFillVisible", normalizeBoolean(config.worldFillVisible));
  apply(next, "worldStroke", normalizeHex(config.worldStroke));
  apply(next, "worldStrokeAlpha", normalizeNumber(config.worldStrokeAlpha, 0, 1));
  apply(next, "worldStrokeGradient", normalizeGradient(config.worldStrokeGradient));
  apply(next, "worldStrokeVisible", normalizeBoolean(config.worldStrokeVisible));
  apply(next, "worldStrokeWidth", normalizeNumber(config.worldStrokeWidth, 0, 10));
  apply(next, "mapDepth", percent(config.mapDepth));
  apply(next, "tiltX", normalizeNumber(config.tiltX, -180, 180));
  apply(next, "tiltY", normalizeNumber(config.tiltY, -180, 180));
  apply(next, "animationsEnabled", normalizeBoolean(config.animationsEnabled));
  apply(next, "viewMode", normalizeEnum(config.viewMode, VIEW_MODES));
  apply(next, "flatProjection", normalizeProjection(config.flatProjection));
  apply(next, "riversVisible", normalizeBoolean(config.riversVisible));
  apply(next, "citiesVisible", normalizeBoolean(config.citiesVisible));
  apply(next, "citiesMinPop", normalizeNumber(config.citiesMinPop, 0, 50_000_000));

  apply(next, "shaderSettings", normalizeSettings(config.shaderSettings, SHADER_RULES));
  apply(next, "globeSettings", normalizeSettings(config.globeSettings, GLOBE_RULES));
  apply(next, "spaceSettings", normalizeSettings(config.spaceSettings, SPACE_RULES));
  apply(next, "flowSettings", normalizeSettings(config.flowSettings, FLOW_RULES));

  return next;
};

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

// `raw` is the ?c= value after URLSearchParams' own decode. A v2 payload
// reads as is; anything else takes the old double decode, and only when
// that throws (a v1 link with a "%") does the single decode stand in.
const decodePayload = (raw: string): unknown => {
  const once = parseJson(raw);
  if (isRecord(once) && once.v === VERSION) return once;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return once;
  }
};

/** Decode `?c=` from a query string the way the app's parseShareConfig does. */
export const parseShareConfig = (search: string): ShareConfig | null => {
  if (!search) return null;
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const raw = params.get(PARAM_KEY);
  if (!raw) return null;
  try {
    const parsed = decodePayload(raw);
    if (!isRecord(parsed)) return null;
    const { v: _version, ...config } = parsed;
    const next = normalizeConfig(config);
    return Object.keys(next).length > 0 ? next : null;
  } catch {
    return null;
  }
};

/** The `?c=` value, same encoding as the app's buildShareUrl. */
export const encodeShareConfig = (config: ShareConfig) =>
  encodeURIComponent(JSON.stringify({ v: VERSION, ...config }));

/**
 * Layer `changes` over `base`: top-level keys replace, the nested settings
 * objects merge key by key (what the app does when it imports a config).
 */
export const mergeConfig = (base: ShareConfig, changes: ShareConfig): ShareConfig => {
  const next: ShareConfig = { ...base, ...changes };
  for (const key of NESTED_KEYS) {
    const from = base[key];
    const to = changes[key];
    if (isRecord(from) && isRecord(to)) next[key] = { ...from, ...to };
  }
  return next;
};
