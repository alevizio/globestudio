import { describe, it, expect } from "vitest";
import { paletteFromPixels, darkestColor } from "./palette.js";

const pixels = (rows) => Uint8ClampedArray.from(rows.flat());
const hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

describe("paletteFromPixels", () => {
  it("returns the dominant vibrant color first and skips transparent pixels", () => {
    const data = pixels([
      ...Array(60).fill([220, 30, 30, 255]), // mostly red
      ...Array(20).fill([30, 60, 220, 255]), // some blue
      ...Array(20).fill([0, 0, 0, 0]), // fully transparent — ignored
    ]);
    const palette = paletteFromPixels(data, 4);
    expect(palette.length).toBeGreaterThan(0);
    palette.forEach((hex) => expect(hex).toMatch(/^#[0-9a-f]{6}$/));
    const [r, g, b] = hexToRgb(palette[0]);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  it("dedupes perceptually-close colors", () => {
    const data = pixels([
      ...Array(40).fill([200, 40, 40, 255]),
      ...Array(40).fill([202, 42, 41, 255]), // near-identical to the first
      ...Array(40).fill([40, 200, 80, 255]), // clearly different
    ]);
    const palette = paletteFromPixels(data, 5);
    expect(palette.length).toBe(2);
  });
});

describe("darkestColor", () => {
  it("picks the lowest-luminance color", () => {
    expect(darkestColor(["#ffffff", "#101015", "#ff0000"])).toBe("#101015");
  });
  it("returns null for an empty palette", () => {
    expect(darkestColor([])).toBeNull();
  });
});
