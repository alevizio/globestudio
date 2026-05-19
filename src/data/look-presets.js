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
    id: "halftone",
    name: "Halftone",
    blurb: "Halftone shader print",
    settings: merge({
      density: 50,
      dotSize: 11,
      shape: "Circle",
      // Explicit `effect` key so applyLook sets the shader pass — the
      // other spread keys carry the matching tuning (cellSize, intensity).
      shaderSettings: {
        ...effectPresets.halftone,
        effect: "halftone",
        cellSize: 8,
        intensity: 78,
      },
      globeSettings: { ...DEFAULT_GLOBE_SETTINGS, glow: false, grid: false },
    }),
  },
  {
    id: "pixel",
    name: "Pixel",
    blurb: "8-bit pixelation",
    settings: merge({
      density: 75,
      dotSize: 15,
      shape: "Square",
      shaderSettings: {
        ...effectPresets.pixel,
        effect: "pixel",
        cellSize: 12,
        intensity: 70,
      },
      globeSettings: { ...DEFAULT_GLOBE_SETTINGS, glow: false, grid: false },
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
      shaderSettings: { ...effectPresets.edge, effect: "edge", intensity: 65, threshold: 16 },
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
      shaderSettings: { ...effectPresets.crt, effect: "crt", intensity: 65, scanlines: 78, cellSize: 9 },
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
      shaderSettings: { ...effectPresets.glitch, effect: "glitch", intensity: 70, split: 35, motion: 85 },
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
      shaderSettings: { ...effectPresets.bloom, effect: "bloom", intensity: 78 },
      globeSettings: { ...DEFAULT_GLOBE_SETTINGS, glow: true, glowStrength: 85 },
    }),
  },
  {
    id: "metal",
    name: "Metal",
    blurb: "Polished chrome",
    settings: merge({
      density: 70,
      dotSize: 13,
      shape: "Hexagon",
      shaderSettings: { ...effectPresets.metal, effect: "metal", intensity: 78, motion: 30 },
      globeSettings: { ...DEFAULT_GLOBE_SETTINGS, glow: false, grid: false },
    }),
  },
  {
    id: "pencil",
    name: "Pencil",
    blurb: "Cross-hatched sketch",
    settings: merge({
      density: 60,
      dotSize: 14,
      shape: "Circle",
      shaderSettings: { ...effectPresets.pencil, effect: "pencil", intensity: 65 },
      globeSettings: { ...DEFAULT_GLOBE_SETTINGS, glow: false, grid: false },
    }),
  },
  {
    id: "corrupt",
    name: "Corrupt",
    blurb: "Channel-corrupted datamosh",
    settings: merge({
      density: 80,
      dotSize: 12,
      shape: "Square",
      shaderSettings: {
        ...effectPresets.corrupt,
        effect: "corrupt",
        cellSize: 6,
        intensity: 75,
        motion: 45,
      },
      globeSettings: { ...DEFAULT_GLOBE_SETTINGS, glow: false, grid: false },
    }),
  },
];
