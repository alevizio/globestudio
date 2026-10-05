import { describe, expect, it } from "vitest";
import { createStateMapData } from "./dot-generation.js";
import { latLngToImagePoint, pointToGlobeCoordinate } from "./projection.js";

const image = { width: 1000, height: 500 };

describe("pointToGlobeCoordinate", () => {
  it("passes through existing lat/lng", () => {
    const result = pointToGlobeCoordinate({ lat: 41.8, lng: -71.4 }, image);
    expect(result.lat).toBeCloseTo(41.8, 6);
    expect(result.lng).toBeCloseTo(-71.4, 6);
  });

  it("normalizes wrapping longitudes", () => {
    const result = pointToGlobeCoordinate({ lat: 0, lng: 200 }, image);
    expect(result.lng).toBeCloseTo(-160, 6);
  });

  it("uses Mercator inversion when the image has a region", () => {
    const regionImage = {
      width: 1000,
      height: 1000,
      region: {
        lat: { min: -45, max: 45 },
        lng: { min: -90, max: 90 },
      },
    };
    const center = pointToGlobeCoordinate({ x: 500, y: 500 }, regionImage);
    expect(center.lat).toBeCloseTo(0, 4);
    expect(center.lng).toBeCloseTo(0, 4);
  });

  it("falls back to equirectangular mapping when no lat/lng or region exists", () => {
    const result = pointToGlobeCoordinate({ x: 500, y: 250 }, image);
    expect(result.lat).toBeCloseTo(0, 6);
    expect(result.lng).toBeCloseTo(0, 6);
  });

  it("clamps polar latitudes", () => {
    const result = pointToGlobeCoordinate({ lat: 95, lng: 0 }, image);
    expect(result.lat).toBe(90);
  });
});

describe("latLngToImagePoint", () => {
  it("puts a point on a US state's flat map where the state's own dots are", () => {
    // A state shaped like Colorado's box, in 1 degree steps. Clockwise.
    const steps = (from, to) => Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => from + Math.sign(to - from) * i);
    const ring = [
      ...steps(-109, -102).map((lng) => [lng, 41]),
      ...steps(41, 37).map((lat) => [-102, lat]),
      ...steps(-102, -109).map((lng) => [lng, 37]),
      ...steps(37, 41).map((lat) => [-109, lat]),
    ];
    const state = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } }] };
    const { image, points } = createStateMapData(state, 100, "Circle");
    // Its first, middle and last dots, from the top of the state to its bottom.
    [points[0], points[Math.floor(points.length / 2)], points.at(-1)].forEach((dot) => {
      const { x, y } = latLngToImagePoint(dot.lat, dot.lng, image);
      expect(x).toBeCloseTo(dot.x, 2);
      expect(y).toBeCloseTo(dot.y, 2);
    });
  });
});
