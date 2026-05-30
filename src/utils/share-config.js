// Share-link encoding / decoding for the current canvas configuration.
//
// The export-modal's "Copy share link" button used to just copy
// window.location.href, which only captured the preset (via /looks/:id)
// — any user customizations (color tweaks, density changes, shader
// fiddling) were lost on receive. This module bridges that gap: it
// serializes the full config into a URL-safe string the app can decode
// on the other end via importConfig().
//
// The encoding pipeline:
//   1. JSON.stringify(config) — same shape importConfig already accepts.
//   2. encodeURIComponent — URL-safe escaping. Cheap, no btoa Unicode
//      headache, lets the underlying JSON stay grep-able if a curious
//      user inspects the URL.
//
// Trade-off: encodeURIComponent inflates ~20% over raw JSON (mostly
// escaping curly braces, quotes, colons). Base64 is similar. Compression
// (LZ-string) could halve URL length but adds 3kb of runtime weight —
// not worth it for a v1 share feature where typical configs land at
// 800-1500 chars. Most chat/social platforms handle that fine.

import { CUSTOM_SHAPE_MAX_BYTES, dotShapeOptions } from "../config/constants.js";
import { DEFAULT_FLOW_SETTINGS, DEFAULT_SPACE_SETTINGS } from "../config/backgrounds.js";
import { DEFAULT_GLOBE_SETTINGS } from "../config/globe-settings.js";
import { DEFAULT_SHADER_SETTINGS, shaderEffectOptions } from "../config/shader-effects.js";
import { sanitizeSvgSource } from "./custom-shape.js";
import { clampNumber } from "./math.js";

const PARAM_KEY = "c";
const VERSION = 1;
const HEX_RE = /^#?[0-9a-fA-F]{3,8}$/;
const ALLOWED_IMAGE_DATA_RE = /^data:image\/(?:png|jpe?g|webp);base64,/i;
const ALLOWED_ENCODED_SVG_RE = /^data:image\/svg\+xml(?:;charset=[^;,]+)?,/i;
const MAX_ASCII_SYMBOL_LENGTH = 12;

const enumValues = (items) => new Set(items.map((item) => item.value ?? item));
const SHAPES = enumValues(dotShapeOptions);
const SHADER_EFFECTS = enumValues(shaderEffectOptions);
const BACKGROUND_STYLES = new Set(["solid", "space", "flow"]);
const RENDER_MODES = new Set(["dots", "solid"]);
const GLOBE_LOOKS = new Set(["classic", "borderless"]);
const FLAT_PROJECTIONS = new Set(["mercator", "equirectangular", "equal-earth", "winkel-tripel", "robinson"]);

const normalizeHex = (value) => {
  if (typeof value !== "string" || !HEX_RE.test(value)) return undefined;
  return value.startsWith("#") ? value : `#${value}`;
};

const normalizeBoolean = (value) => (typeof value === "boolean" ? value : undefined);
const normalizeEnum = (value, allowed) => (typeof value === "string" && allowed.has(value) ? value : undefined);
const normalizeNumber = (value, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return clampNumber(number, min, max);
};
const apply = (target, key, value) => {
  if (value !== undefined) target[key] = value;
};

const normalizeGradient = (value) => {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const from = normalizeHex(value.from);
  const to = normalizeHex(value.to);
  if (!from || !to) return undefined;
  const gradient = { from, to };
  apply(gradient, "angle", normalizeNumber(value.angle, 0, 360));
  apply(gradient, "fromAlpha", normalizeNumber(value.fromAlpha, 0, 1));
  apply(gradient, "toAlpha", normalizeNumber(value.toAlpha, 0, 1));
  return gradient;
};

const normalizeCustomShape = (value) => {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const type = typeof value.type === "string" ? value.type : "";
  const dataUrl = typeof value.dataUrl === "string" ? value.dataUrl : "";
  if (!dataUrl || dataUrl.length > CUSTOM_SHAPE_MAX_BYTES * 2) return undefined;

  if (type === "image/svg+xml" || ALLOWED_ENCODED_SVG_RE.test(dataUrl)) {
    let encoded = "";
    try {
      encoded = ALLOWED_ENCODED_SVG_RE.test(dataUrl)
        ? decodeURIComponent(dataUrl.replace(ALLOWED_ENCODED_SVG_RE, ""))
        : "";
    } catch (_err) {
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

const normalizeSettings = (value, defaults, rules) => {
  if (!value || typeof value !== "object") return undefined;
  const next = {};
  for (const [key, rule] of Object.entries(rules)) {
    if (value[key] === undefined) continue;
    apply(next, key, rule(value[key]));
  }
  return Object.keys(next).length > 0 ? { ...defaults, ...next } : undefined;
};

const percent = (value) => normalizeNumber(value, 0, 100);
const hexOrNull = (value) => (value === null ? null : normalizeHex(value));

export const normalizeConfig = (config) => {
  if (!config || typeof config !== "object" || Array.isArray(config)) return null;
  const next = {};

  apply(next, "selection", typeof config.selection === "string" && /^(world|country:[A-Z]{3}|continent:[\w\s-]+|subregion:[\w\s-]+)$/.test(config.selection) ? config.selection : undefined);
  apply(next, "stateSelection", typeof config.stateSelection === "string" ? config.stateSelection.slice(0, 32) : undefined);
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
  apply(next, "flatProjection", normalizeEnum(config.flatProjection, FLAT_PROJECTIONS));
  apply(next, "riversVisible", normalizeBoolean(config.riversVisible));
  apply(next, "citiesVisible", normalizeBoolean(config.citiesVisible));
  apply(next, "citiesMinPop", normalizeNumber(config.citiesMinPop, 0, 50_000_000));

  apply(next, "shaderSettings", normalizeSettings(config.shaderSettings, DEFAULT_SHADER_SETTINGS, {
    effect: (value) => normalizeEnum(value, SHADER_EFFECTS),
    intensity: percent,
    split: percent,
    grain: percent,
    scanlines: percent,
    cellSize: (value) => normalizeNumber(value, 0, 30),
    threshold: percent,
    warp: percent,
    motion: percent,
  }));

  apply(next, "globeSettings", normalizeSettings(config.globeSettings, DEFAULT_GLOBE_SETTINGS, {
    look: (value) => normalizeEnum(value, GLOBE_LOOKS),
    autoSpin: normalizeBoolean,
    autoSpinSpeed: percent,
    dotLift: percent,
    glow: normalizeBoolean,
    glowStrength: percent,
    glowSpread: percent,
    grid: normalizeBoolean,
    gridColor: normalizeHex,
    gridGradient: normalizeGradient,
    gridLift: percent,
    gridSize: (value) => normalizeNumber(value, 5, 90),
    gridStrength: percent,
    network: normalizeBoolean,
    networkStrength: percent,
    networkArcs: (value) => typeof value === "boolean" ? value : percent(value),
    networkPulses: (value) => typeof value === "boolean" ? value : percent(value),
    arcColor: hexOrNull,
    pulseColor: hexOrNull,
    networkMono: normalizeBoolean,
    routes: normalizeBoolean,
    routesStrength: percent,
    surface: normalizeBoolean,
    surfaceStrength: percent,
    surfaceColor: normalizeHex,
    surfaceGradient: normalizeGradient,
  }));

  apply(next, "spaceSettings", normalizeSettings(config.spaceSettings, DEFAULT_SPACE_SETTINGS, {
    density: percent,
    motion: percent,
    nebula: percent,
    hue: (value) => normalizeNumber(value, 0, 360),
    brightness: (value) => normalizeNumber(value, 0, 200),
  }));

  apply(next, "flowSettings", normalizeSettings(config.flowSettings, DEFAULT_FLOW_SETTINGS, {
    colorA: normalizeHex,
    colorB: normalizeHex,
    colorC: normalizeHex,
    motion: percent,
    turbulence: percent,
    grain: percent,
    scale: percent,
    brightness: (value) => normalizeNumber(value, 0, 200),
  }));

  return Object.keys(next).length > 0 ? next : null;
};

// Build a sharable URL from the current config + origin. If `pathname`
// is omitted, we land at "/" so the embed doesn't accidentally inherit
// a /looks/:id route (which would import the preset's defaults on top
// of the user's customizations and clobber them).
export const buildShareUrl = (config, origin, pathname = "/") => {
  const payload = { v: VERSION, ...config };
  const json = JSON.stringify(payload);
  const encoded = encodeURIComponent(json);
  const base = (origin || "").replace(/\/+$/, "");
  return `${base}${pathname}?${PARAM_KEY}=${encoded}`;
};

// Decode the share config from a window.location.search string. Returns
// null if no config is present or the payload is malformed (importConfig
// is null-safe on its end too — defensive double-guard).
export const parseShareConfig = (search) => {
  if (typeof search !== "string" || !search) return null;
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const raw = params.get(PARAM_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!parsed || typeof parsed !== "object") return null;
    // Strip the version marker before handing off to importConfig — it
    // doesn't know about `v` and would warn on the unknown key.
    const { v: _v, ...config } = parsed;
    return normalizeConfig(config);
  } catch (_err) {
    return null;
  }
};

// After applying a share config, strip ?c=… from the URL so subsequent
// edits don't accumulate a stale config in the history. Uses
// replaceState so the user's history isn't polluted with the
// "decoded" step.
export const clearShareConfigFromUrl = () => {
  if (typeof window === "undefined" || typeof window.history === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM_KEY)) return;
  url.searchParams.delete(PARAM_KEY);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
};
