import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  hexColorsToLegacy,
  legacyColorsToLinear,
  linearToSrgb,
  pickedGradientToLinear,
  srgbToLinear,
  storedChannel,
  storedRgb,
  toLinearHex,
  toSrgbHex,
} from "./color-space.js";

const hex = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const bytes = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));

// What the old reading puts on the canvas for a hex: THREE.Color's
// sRGB-to-linear value, written out with no encode.
const renderedOldWay = (value) => {
  const color = new THREE.Color(value);
  return [color.r, color.g, color.b].map((v) => Math.round(v * 255));
};

describe("color-space", () => {
  it("uses three.js's own transfer curves", () => {
    for (let v = 0; v <= 255; v += 1) {
      const c = v / 255;
      expect(srgbToLinear(c)).toBe(new THREE.Color().setRGB(c, c, c, THREE.SRGBColorSpace).r);
      expect(linearToSrgb(c)).toBe(new THREE.Color().setRGB(c, c, c).getRGB({}, THREE.SRGBColorSpace).r);
    }
  });

  it("toLinearHex gives the bytes the old reading rendered, for every channel value", () => {
    for (let v = 0; v <= 255; v += 1) {
      for (const color of [hex(v, 0, 0), hex(0, v, 0), hex(0, 0, v), hex(v, v, v)]) {
        expect(bytes(toLinearHex(color)), color).toEqual(renderedOldWay(color));
      }
    }
    expect(toLinearHex("#808080")).toBe("#373737");
    expect(toLinearHex("#ff8000")).toBe("#ff3700");
    expect(toLinearHex("#4080c0")).toBe("#0d3786");
  });

  it("reads 3-digit hex and hex without '#', and leaves the rest alone", () => {
    expect(toLinearHex("#abc")).toBe(toLinearHex("#aabbcc"));
    expect(toLinearHex("808080")).toBe("#373737");
    // Colors that don't change keep their spelling: the renderer compares
    // dotColor with "#ffffff", and "#FFF" never matched it.
    for (const value of ["#FFF", "#FFFFFF", "#ffffff", "#000", "#ff0000", "#00FF00"]) {
      expect(toLinearHex(value)).toBe(value);
      expect(toSrgbHex(value)).toBe(value);
    }
    for (const value of ["#ff8000cc", "#f80c", "red", "", null, undefined, 42]) {
      expect(toLinearHex(value)).toBe(value);
      expect(toSrgbHex(value)).toBe(value);
    }
  });

  it("storedRgb gives an old color turned into a hex color the exact value the old reading gave it", () => {
    // Every channel of every color a look draws, and of the panel's
    // presets, so a look applied over hex colors draws the very same pixels
    // through any effect, not just the same bytes. The flow default #635bff
    // can't come back too: its #63 and #5b share a group with #5a5a64's #64
    // and #ff5c93's #5c, and no look draws the flow.
    const tuned = ["#3df4ff", "#f6f2ea", "#ff9ec5", "#c8ddc7", "#5a5a64", "#ff5c93", "#00d4ff", "#7edfff", "#8fdcff", "#ffffff", "#000000"];
    for (const color of tuned) {
      const old = new THREE.Color(color);
      expect(storedRgb(toLinearHex(color)), color).toEqual([old.r, old.g, old.b]);
    }
    // #3c, #3d and #3e all convert to #0c; #3d, the middle one, is Toon's.
    expect(toLinearHex("#3c3c3c")).toBe("#0c0c0c");
    expect(toLinearHex("#3e3e3e")).toBe("#0c0c0c");
    expect(storedChannel(0x0c)).toBe(srgbToLinear(0x3d / 255));
  });

  it("storedRgb puts every byte of a hex color on the canvas as that byte", () => {
    for (let v = 0; v <= 255; v += 1) {
      expect(Math.round(storedChannel(v) * 255), String(v)).toBe(v);
    }
    expect(storedRgb("#abc")).toEqual(storedRgb("#aabbcc"));
    for (const value of ["#ff8000cc", "red", "", null, undefined]) expect(storedRgb(value)).toBe(null);
  });

  it("toSrgbHex draws a hex color into the sRGB world texture as storedRgb gives it", () => {
    // The solid-mode world texture draws toSrgbHex(color) into an sRGB
    // canvas that the sampler decodes. Where an sRGB byte leads to the
    // byte, it is the one storedChannel stands for, so a look's world
    // colors come back as they were, #5a5a64 included.
    for (let v = 0; v <= 255; v += 1) {
      const color = hex(v, v, v);
      const [back] = renderedOldWay(toSrgbHex(color));
      expect(Math.abs(back - v), color).toBeLessThanOrEqual(1);
      if (back === v) expect(new THREE.Color(toSrgbHex(color)).r, color).toBe(storedChannel(v));
    }
    for (const color of ["#5a5a64", "#f6f2ea", "#4080c0", "#ff8000", "#808080"]) {
      expect(toSrgbHex(toLinearHex(color))).toBe(color);
    }
  });

  it("legacyColorsToLinear converts every WebGL color and nothing else", () => {
    const legacy = {
      background: "#808080",
      dotColor: "#808080",
      dotColorAlpha: 0.5,
      dotGradient: { from: "#ff8000", to: "#4080c0", angle: 30, fromAlpha: 0.4 },
      worldFill: "#4080c0",
      worldStroke: "#ff8000",
      worldFillGradient: null,
      worldStrokeGradient: { from: "#808080", to: "#ffffff" },
      globeSettings: {
        gridColor: "#808080",
        gridGradient: { from: "#ff8000", to: "#4080c0" },
        surfaceColor: "#18191d",
        surfaceGradient: { from: "#4080c0", to: "#808080" },
        glowColor: "#4080c0",
        arcColor: null,
        pulseColor: "#808080",
        dataMarkerColor: "#ff8000",
        glowStrength: 60,
      },
      flowSettings: { colorA: "#635bff", colorB: "#00d4ff", colorC: "#ff5c93", motion: 32 },
      customShape: { name: "x", type: "image/png", dataUrl: "data:image/png;base64,AAAA" },
    };
    const before = structuredClone(legacy);
    const converted = {
      ...legacy,
      dotColor: "#373737",
      dotGradient: { from: "#ff3700", to: "#0d3786", angle: 30, fromAlpha: 0.4 },
      worldFill: "#0d3786",
      worldStroke: "#ff3700",
      worldStrokeGradient: { from: "#373737", to: "#ffffff" },
      // The sphere and the glow keep the old reading in both, so they stay.
      globeSettings: {
        ...legacy.globeSettings,
        gridColor: "#373737",
        gridGradient: { from: "#ff3700", to: "#0d3786" },
        pulseColor: "#373737",
        dataMarkerColor: "#ff3700",
      },
      flowSettings: { colorA: "#201bff", colorB: "#00a8ff", colorC: "#ff1b4a", motion: 32 },
    };
    expect(legacyColorsToLinear(legacy)).toEqual(converted);
    expect(legacy).toEqual(before);
    // And back again: these colors all come back as they were.
    expect(hexColorsToLegacy(converted)).toEqual({ ...legacy, flowSettings: { ...legacy.flowSettings, colorA: "#645cff" } });
    expect(legacyColorsToLinear({ density: 40 })).toEqual({ density: 40 });
    expect(legacyColorsToLinear({ globeSettings: { dotLift: 4 } })).toEqual({ globeSettings: { dotLift: 4 } });
    expect(legacyColorsToLinear(null)).toBe(null);
    expect(hexColorsToLegacy(undefined)).toBe(undefined);
  });
});

describe("pickedGradientToLinear", () => {
  const shown = { from: "#808080", to: "#ff8000", angle: 90 };

  it("turns the stops a picker left alone into hex colors that render the same", () => {
    expect(pickedGradientToLinear({ ...shown, angle: 30 }, shown, "#ffffff")).toEqual({ from: "#373737", to: "#ff3700", angle: 30 });
    expect(pickedGradientToLinear({ ...shown, fromAlpha: 0.5 }, shown, "#ffffff")).toEqual({ from: "#373737", to: "#ff3700", angle: 90, fromAlpha: 0.5 });
  });

  it("keeps a stop picked anew as picked", () => {
    expect(pickedGradientToLinear({ ...shown, to: "#4080c0" }, shown, "#ffffff")).toEqual({ from: "#373737", to: "#4080c0", angle: 90 });
  });

  it("reads a new gradient's stops against the solid color it starts from", () => {
    expect(pickedGradientToLinear({ from: "#808080", to: "#80ffff", angle: 90 }, null, "#808080")).toEqual({ from: "#373737", to: "#80ffff", angle: 90 });
    expect(pickedGradientToLinear({ from: "#FF8000", to: "#0080ff" }, undefined, "#ff8000")).toEqual({ from: "#ff3700", to: "#0080ff" });
    // The picker shows a 3 digit color as 6 digits.
    expect(pickedGradientToLinear({ from: "#888888", to: "#0080ff" }, undefined, "#888")).toEqual({ from: "#3f3f3f", to: "#0080ff" });
  });

  it("leaves no gradient as it is", () => {
    expect(pickedGradientToLinear(null, shown, "#ffffff")).toBe(null);
  });
});
