import { DEFAULT_GLOBE_SETTINGS } from "../config/globe-settings.js";
import { effectPresets } from "../config/shader-effects.js";

const base = {
  selection: "world",
  stateSelection: "all",
  background: "#0a0a0a",
  backgroundStyle: "solid",
  transparent: false,
  density: 40,
  dotSize: 10,
  dotColor: "#ffffff",
  dotsVisible: true,
  shape: "Circle",
  asciiSymbol: "*",
  renderMode: "dots",
  worldFill: "#5a5a64",
  worldStroke: "#f6f2ea",
  shaderSettings: { ...effectPresets.none },
  globeSettings: { ...DEFAULT_GLOBE_SETTINGS },
  spaceSettings: { density: 65, motion: 35, nebula: 55, hue: 0, brightness: 100 },
  mapDepth: 55,
  tiltX: 0,
  tiltY: 0,
};

const merge = (overrides = {}) => ({
  ...base,
  ...overrides,
  shaderSettings: { ...base.shaderSettings, ...(overrides.shaderSettings ?? {}) },
  globeSettings: { ...base.globeSettings, ...(overrides.globeSettings ?? {}) },
  spaceSettings: { ...base.spaceSettings, ...(overrides.spaceSettings ?? {}) },
});

export const lookPresets = [
  {
    id: "default",
    name: "Default",
    blurb: "Clean dotted globe",
    settings: merge(),
  },
  {
    id: "print",
    name: "Print",
    blurb: "Halftone magazine plate",
    settings: merge({
      renderMode: "solid",
      worldFill: "#cfcabd",
      worldStroke: "#181818",
      shaderSettings: { ...effectPresets.halftone, cellSize: 7, intensity: 80 },
      globeSettings: { ...DEFAULT_GLOBE_SETTINGS, grid: false, glow: false, surface: true, surfaceStrength: 100 },
    }),
  },
  {
    id: "wireframe",
    name: "Wireframe",
    blurb: "Edge-traced lithograph",
    settings: merge({
      density: 90,
      dotSize: 16,
      shape: "Hexagon",
      shaderSettings: { ...effectPresets.edge, intensity: 65, threshold: 16 },
      globeSettings: { ...DEFAULT_GLOBE_SETTINGS, glow: false, gridStrength: 64 },
    }),
  },
  {
    id: "crt",
    name: "CRT",
    blurb: "Cathode-ray phosphor",
    settings: merge({
      density: 70,
      dotSize: 14,
      shaderSettings: { ...effectPresets.crt, intensity: 65, scanlines: 78, cellSize: 9 },
      globeSettings: { ...DEFAULT_GLOBE_SETTINGS, glow: true, glowStrength: 65 },
    }),
  },
  {
    id: "glitch",
    name: "Glitch",
    blurb: "Broken signal",
    settings: merge({
      density: 75,
      dotSize: 14,
      shape: "Square",
      shaderSettings: { ...effectPresets.glitch, intensity: 70, split: 35, motion: 85 },
      globeSettings: { ...DEFAULT_GLOBE_SETTINGS, glow: false },
    }),
  },
  {
    id: "bloom",
    name: "Bloom",
    blurb: "Glowing aurora",
    settings: merge({
      density: 80,
      dotSize: 12,
      shaderSettings: { ...effectPresets.bloom, intensity: 78 },
      globeSettings: { ...DEFAULT_GLOBE_SETTINGS, glow: true, glowStrength: 85 },
    }),
  },
  {
    id: "pixel",
    name: "Pixel",
    blurb: "8-bit world",
    settings: merge({
      density: 90,
      dotSize: 16,
      shape: "Square",
      shaderSettings: { ...effectPresets.pixel, intensity: 70, cellSize: 14 },
    }),
  },
  {
    id: "ascii",
    name: "ASCII",
    blurb: "Type-set globe",
    settings: merge({
      density: 80,
      dotSize: 12,
      shape: "ASCII",
      asciiSymbol: ".+#",
      globeSettings: { ...DEFAULT_GLOBE_SETTINGS, grid: false },
    }),
  },
  {
    id: "topographic",
    name: "Topo",
    blurb: "Filled landmass",
    settings: merge({
      renderMode: "solid",
      worldFill: "#3a3a44",
      worldStroke: "#e7e2d4",
      globeSettings: { ...DEFAULT_GLOBE_SETTINGS, glow: false, gridStrength: 32 },
    }),
  },
  {
    id: "particles",
    name: "Space",
    blurb: "Deep space backdrop",
    settings: merge({
      density: 85,
      dotSize: 8,
      backgroundStyle: "space",
      background: "#03030a",
      shaderSettings: { ...effectPresets.none },
      spaceSettings: { density: 70, motion: 30, nebula: 60, hue: 0, brightness: 110 },
      globeSettings: { ...DEFAULT_GLOBE_SETTINGS, glow: true, glowStrength: 65 },
    }),
  },
];
