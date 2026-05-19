export const DEFAULT_SHADER_SETTINGS = {
  effect: "none",
  intensity: 45,
  split: 7,
  grain: 8,
  scanlines: 36,
  cellSize: 14,
  threshold: 50,
  warp: 24,
  motion: 35,
};

export const shaderEffectOptions = [
  { value: "none", label: "None" },
  { value: "bloom", label: "Bloom" },
  { value: "chromatic", label: "Chromatic" },
  { value: "crt", label: "CRT" },
  { value: "halftone", label: "Halftone" },
  { value: "pixel", label: "Pixel" },
  { value: "threshold", label: "Threshold" },
  { value: "glitch", label: "Glitch" },
  { value: "edge", label: "Edge" },
  { value: "wave", label: "Wave" },
  { value: "metal", label: "Metal" },
  { value: "pencil", label: "Pencil" },
  { value: "toon", label: "Toon" },
  { value: "stripes", label: "Stripes" },
  { value: "badtv", label: "Bad TV" },
  { value: "rgb", label: "RGB" },
];

export const effectsWithSplit = new Set(["bloom", "chromatic", "crt", "glitch", "wave"]);
export const effectsWithScanlines = new Set(["crt", "pixel", "halftone", "glitch"]);
export const effectsWithCellSize = new Set(["pixel", "halftone", "crt", "stripes"]);
export const effectsWithWarp = new Set(["bloom", "chromatic", "crt", "threshold", "wave"]);
export const effectsWithMotion = new Set(["bloom", "chromatic", "crt", "halftone", "threshold", "glitch", "wave", "metal", "stripes", "badtv", "rgb"]);
export const effectsWithThreshold = new Set(["threshold", "edge"]);

const baseDefaults = {
  intensity: 45,
  split: 7,
  grain: 8,
  scanlines: 36,
  cellSize: 14,
  threshold: 50,
  warp: 24,
  motion: 35,
};

export const effectPresets = {
  none: { ...baseDefaults },
  bloom: { ...baseDefaults, intensity: 60, split: 10, grain: 3, motion: 20, warp: 30 },
  chromatic: { ...baseDefaults, intensity: 55, split: 14, grain: 6, motion: 35 },
  crt: { ...baseDefaults, intensity: 55, split: 8, scanlines: 70, cellSize: 10, grain: 10, motion: 30, warp: 30 },
  halftone: { ...baseDefaults, intensity: 75, cellSize: 6, scanlines: 0, grain: 0, motion: 20 },
  pixel: { ...baseDefaults, intensity: 60, cellSize: 10, grain: 4, motion: 0 },
  threshold: { ...baseDefaults, intensity: 65, threshold: 32, grain: 14, warp: 24, motion: 30 },
  glitch: { ...baseDefaults, intensity: 55, split: 28, grain: 14, scanlines: 32, motion: 80 },
  edge: { ...baseDefaults, intensity: 60, threshold: 18, grain: 0, motion: 0 },
  wave: { ...baseDefaults, intensity: 55, split: 18, warp: 60, motion: 50, grain: 4 },
  metal: { ...baseDefaults, intensity: 70, grain: 0, scanlines: 0, motion: 30 },
  pencil: { ...baseDefaults, intensity: 60, grain: 0, scanlines: 0, motion: 0 },
  toon: { ...baseDefaults, intensity: 55, grain: 0, scanlines: 0, motion: 0 },
  stripes: { ...baseDefaults, intensity: 50, cellSize: 8, grain: 0, scanlines: 0, motion: 40 },
  badtv: { ...baseDefaults, intensity: 60, grain: 24, scanlines: 0, motion: 60 },
  rgb: { ...baseDefaults, intensity: 50, grain: 0, scanlines: 0, motion: 30 },
};

export const presetForEffect = (effect) => effectPresets[effect] ?? effectPresets.none;
