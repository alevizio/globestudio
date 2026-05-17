import { describe, expect, it } from "vitest";
import { pointToGlobeCoordinate } from "./projection.js";

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
