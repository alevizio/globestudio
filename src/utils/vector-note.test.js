import { describe, expect, it } from "vitest";
import { shaderEffectOptions } from "../config/shader-effects.js";
import { lookPresets } from "../data/look-presets.js";
import { EFFECT_DROPS, vectorDrops, vectorNote } from "./vector-note.js";

// What the SVG tab says for each look as it ships, read from what
// svg-markup.js draws against what the canvas shows on the flat map. A new
// look fails the first test until it has a line here.
const LOOK_NOTES = {
  default: null,
  halftone: "The halftone pattern only comes through in PNG.",
  risograph: "The pink and cyan inks only come through in PNG.",
  newsprint: "The CMYK halftone only comes through in PNG.",
  aurora: "The aurora bands and the space background only come through in PNG.",
  pixel: "The pixelation only comes through in PNG.",
  bayer: "The dithering only comes through in PNG.",
  atkinson: "The dithering only comes through in PNG.",
  wireframe: "The traced edges only come through in PNG.",
  crt: "The scanlines and glow only come through in PNG.",
  glitch: "The glitches only come through in PNG.",
  badtv: "The tape static only comes through in PNG.",
  bloom: "SVG draws this map as dots. The solid land, the bloom and the space background only come through in PNG.",
  metal: "The chrome shading only comes through in PNG.",
  iridescent: "The foil shimmer only comes through in PNG.",
  pencil: "The pencil strokes and paper only come through in PNG.",
  corrupt: "The datamosh only comes through in PNG.",
  toon: "The cel shading only comes through in PNG.",
  threshold: "The two-tone threshold only comes through in PNG.",
  vapor: "The color split only comes through in PNG.",
  topographic: "The wave distortion only comes through in PNG.",
};

const look = (id) => lookPresets.find((preset) => preset.id === id).settings;

describe("vectorNote", () => {
  it("classifies every look", () => {
    expect(Object.keys(LOOK_NOTES).sort()).toEqual(lookPresets.map(({ id }) => id).sort());
  });

  it.each(lookPresets.map(({ id }) => id))("says what SVG leaves out of %s", (id) => {
    expect(vectorNote(vectorDrops(look(id)))).toBe(LOOK_NOTES[id]);
  });

  it("has an entry for every effect the panel offers, and none for no effect", () => {
    expect(Object.keys(EFFECT_DROPS).sort()).toEqual(shaderEffectOptions.map(({ value }) => value).sort());
    expect(EFFECT_DROPS.none).toBeNull();
  });

  it("points the Figma tab to Copy as image, or to PNG where the browser can't copy images", () => {
    expect(vectorNote(vectorDrops(look("crt")), { figma: true, copyImage: true })).toBe(
      "The scanlines and glow only come through with Copy as image.",
    );
    expect(vectorNote(vectorDrops(look("halftone")), { figma: true, copyImage: true })).toBe(
      "The halftone pattern only comes through with Copy as image.",
    );
    expect(vectorNote(vectorDrops(look("bloom")), { figma: true })).toBe(
      "Vectors draw this map as dots. The solid land, the bloom and the space background only come through in PNG.",
    );
    expect(vectorNote(vectorDrops(look("default")), { figma: true, copyImage: true })).toBeNull();
  });

  it("reads the current design, so a look with its effect turned off says nothing", () => {
    const crt = look("crt");
    expect(vectorNote(vectorDrops({ ...crt, shaderSettings: { ...crt.shaderSettings, effect: "none" } }))).toBeNull();
    const halftone = look("halftone");
    expect(vectorNote(vectorDrops({ ...halftone, shaderSettings: { ...halftone.shaderSettings, effect: "bayer" } }))).toBe(
      "The dithering only comes through in PNG.",
    );
  });

  it("names the glow the panel's Glow puts around every dot, unless the effect already does", () => {
    const glow = { ...look("default"), globeSettings: { ...look("default").globeSettings, look: "borderless" } };
    expect(vectorNote(vectorDrops(glow))).toBe("The glow only comes through in PNG.");
    expect(vectorNote(vectorDrops({ ...glow, shaderSettings: { effect: "halftone" } }))).toBe(
      "The halftone pattern and the glow only come through in PNG.",
    );
    expect(vectorNote(vectorDrops({ ...glow, shaderSettings: { effect: "crt" } }))).toBe(
      "The scanlines and glow only come through in PNG.",
    );
  });

  it("names a Space or Flow background, which the SVG draws as a flat color", () => {
    const base = look("default");
    expect(vectorNote(vectorDrops({ ...base, backgroundStyle: "space" }))).toBe(
      "The space background only comes through in PNG.",
    );
    expect(vectorNote(vectorDrops({ ...base, backgroundStyle: "flow", transparent: true }))).toBe(
      "The flow background only comes through in PNG.",
    );
    expect(vectorNote(vectorDrops({ ...base, backgroundStyle: "transparent", transparent: true }))).toBeNull();
  });

  it("says a solid map comes out as dots", () => {
    expect(vectorNote(vectorDrops({ ...look("default"), renderMode: "solid" }))).toBe(
      "SVG draws this map as dots. The solid land only comes through in PNG.",
    );
  });

  it("says nothing for a design with no settings to lose", () => {
    expect(vectorDrops({})).toEqual([]);
    expect(vectorNote([])).toBeNull();
    expect(vectorNote(undefined)).toBeNull();
  });
});
