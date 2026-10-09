import { describe, expect, it } from "vitest";
import { CLICK_HIGHLIGHT } from "../config/constants.js";
import { DEFAULT_SHADER_SETTINGS } from "../config/shader-effects.js";
import { createCountryMapData } from "./dot-generation.js";
import { createDottedSvg } from "./svg-markup.js";

describe("createDottedSvg", () => {
  it("lights a dot clicked on the globe where the flat map has none at the flat map's nearest dot, as the canvas does", () => {
    const mapData = createCountryMapData([], 30);
    const globeDot = mapData.globePoints.find((dot) => dot.view === "globe");
    const flatDot = mapData.points[0];
    const svg = createDottedSvg({
      mapData,
      dotColor: "#ff0000",
      dotSize: 10,
      shape: "Circle",
      background: "#000000",
      selectedDots: new Set([globeDot.id, flatDot.id]),
      mode: "country",
      shaderSettings: DEFAULT_SHADER_SETTINGS,
    }).svg;
    expect(svg.split(`fill="${CLICK_HIGHLIGHT}"`)).toHaveLength(3);
    const twin = mapData.points.find((point) => point.id === globeDot.twin);
    expect(svg).toMatch(new RegExp(`<circle[^>]*cx="${twin.x}"[^>]*fill="${CLICK_HIGHLIGHT}"|fill="${CLICK_HIGHLIGHT}"[^>]*cx="${twin.x}"`));
  });

  it("leaves the globe's own dots unmade when no dot clicked on the globe needs them", () => {
    const { image, points } = createCountryMapData([], 30);
    const mapData = {
      image,
      points,
      get globePoints() {
        throw new Error("made the globe's dots");
      },
    };
    const svg = createDottedSvg({
      mapData,
      dotColor: "#ff0000",
      dotSize: 10,
      shape: "Circle",
      background: "#000000",
      selectedDots: new Set([points[0].id]),
      mode: "country",
      shaderSettings: DEFAULT_SHADER_SETTINGS,
    }).svg;
    expect(svg.split(`fill="${CLICK_HIGHLIGHT}"`)).toHaveLength(2);
  });
});
