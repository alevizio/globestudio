import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { sceneColor, setSceneColor } from "./picked-color.js";
import { toLinearHex } from "../utils/color-space.js";

// The effect chain ends in a ShaderPass with no sRGB encode, so a pixel
// comes out as round(255 * working-space value). These checks run the color
// math on its own; tests/e2e/color-space.spec.js reads real canvas pixels.
const onCanvas = (color) => [color.r, color.g, color.b].map((v) => Math.round(v * 255));
const bytes = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe("sceneColor", () => {
  it("puts a hex color on the canvas as that hex", () => {
    for (const hex of ["#808080", "#4080c0", "#ff8000", "#ff0066", "#000000", "#ffffff", "#0ce7ff", "#020203"]) {
      expect(onCanvas(sceneColor(hex, true)), hex).toEqual(bytes(hex));
    }
    for (let v = 0; v <= 255; v += 1) {
      const hex = `#${v.toString(16).padStart(2, "0").repeat(3)}`;
      expect(onCanvas(sceneColor(hex, true)), hex).toEqual([v, v, v]);
    }
  });

  it("reads an old color the old way, exactly as new THREE.Color(hex)", () => {
    for (const hex of ["#808080", "#4080c0", "#ff8000", "#3df4ff", "#fff"]) {
      expect(sceneColor(hex).equals(new THREE.Color(hex)), hex).toBe(true);
      expect(sceneColor(hex, false).equals(new THREE.Color(hex)), hex).toBe(true);
    }
    expect(onCanvas(sceneColor("#808080"))).toEqual([55, 55, 55]);
    expect(onCanvas(sceneColor("#ff8000"))).toEqual([255, 55, 0]);
  });

  it("draws a look's color turned into a hex color with the value the old reading gave it", () => {
    for (const hex of ["#3df4ff", "#f6f2ea", "#ff9ec5", "#c8ddc7", "#5a5a64", "#7edfff"]) {
      expect(sceneColor(toLinearHex(hex), true).equals(new THREE.Color(hex)), hex).toBe(true);
    }
  });

  it("interpolates hex color gradients in the hex's own space, like the SVG export", () => {
    // svg-markup.js lerps the hex bytes; a quarter of the way from #ff8000
    // to #4080c0 is (207.25, 128, 48) there too.
    const quarter = sceneColor("#ff8000", true).lerp(sceneColor("#4080c0", true), 0.25);
    expect(onCanvas(quarter)).toEqual([207, 128, 48]);
  });

  it("writes into a uniform's color either way", () => {
    const uniform = new THREE.Color();
    expect(setSceneColor(uniform, "#ff0066", true)).toBe(uniform);
    expect(onCanvas(uniform)).toEqual([255, 0, 102]);
    setSceneColor(uniform, "#ff0066");
    expect(uniform.equals(new THREE.Color("#ff0066"))).toBe(true);
    // Not a 3 or 6 digit hex: read the old way, as THREE.Color reads it.
    setSceneColor(uniform, "red", true);
    expect(uniform.equals(new THREE.Color("red"))).toBe(true);
  });
});
