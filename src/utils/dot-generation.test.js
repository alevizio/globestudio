import { describe, expect, it } from "vitest";
import {
  getDotRadius,
  getPointsBounds,
  getShapeBounds,
  makeFeatureCollection,
} from "./dot-generation.js";

describe("makeFeatureCollection", () => {
  it("wraps features in a GeoJSON FeatureCollection", () => {
    const features = [{ type: "Feature", geometry: {}, properties: {} }];
    expect(makeFeatureCollection(features)).toEqual({
      type: "FeatureCollection",
      features,
    });
  });
});

describe("getDotRadius", () => {
  it("uses the state scaling in state mode", () => {
    expect(getDotRadius(10, "state")).toBeCloseTo(4.2, 6);
  });

  it("uses the country scaling otherwise", () => {
    expect(getDotRadius(10, "country")).toBeCloseTo(0.1, 6);
  });

  it("enforces a minimum radius in state mode", () => {
    expect(getDotRadius(0.1, "state")).toBe(0.15);
  });
});

describe("getShapeBounds", () => {
  const point = { x: 10, y: 20 };

  it("expands extents for Triangle proportionally", () => {
    const bounds = getShapeBounds(point, 1, "Triangle");
    expect(bounds.maxX - bounds.minX).toBeCloseTo(2 * 1.72, 6);
  });

  it("uses √3 × radius on the X axis for Hexagon", () => {
    const bounds = getShapeBounds(point, 1, "Hexagon");
    expect(bounds.maxX - bounds.minX).toBeCloseTo(2 * Math.sqrt(3), 6);
    expect(bounds.maxY - bounds.minY).toBeCloseTo(4, 6);
  });

  it("uses the default 1× radius for Circle", () => {
    const bounds = getShapeBounds(point, 1, "Circle");
    expect(bounds.maxX - bounds.minX).toBe(2);
  });

  it("applies the per-shape multiplier for Voxel", () => {
    const bounds = getShapeBounds(point, 1, "Voxel");
    expect(bounds.maxX - bounds.minX).toBeCloseTo(2 * 1.62, 6);
  });
});

describe("getPointsBounds", () => {
  const image = { width: 100, height: 100 };

  it("returns the image bounds when no points are provided", () => {
    expect(getPointsBounds([], 1, "Circle", image)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
    });
  });

  it("computes the union of per-point bounds", () => {
    const points = [
      { x: 10, y: 10 },
      { x: 30, y: 40 },
    ];
    const bounds = getPointsBounds(points, 1, "Circle", image);
    expect(bounds.minX).toBe(9);
    expect(bounds.minY).toBe(9);
    expect(bounds.maxX).toBe(31);
    expect(bounds.maxY).toBe(41);
  });
});
