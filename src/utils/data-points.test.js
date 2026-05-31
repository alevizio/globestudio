import { describe, it, expect } from "vitest";
import { parseDataPoints, valueToRadius } from "./data-points.js";

describe("parseDataPoints", () => {
  it("parses lat,lng[,value]; skips header, blanks, comments, out-of-range", () => {
    const pts = parseDataPoints("lat,lng,value\n40.7,-74,10\n51.5,-0.1\n\n# c\n999,0,5");
    expect(pts).toEqual([
      { lat: 40.7, lng: -74, value: 10 },
      { lat: 51.5, lng: -0.1, value: 1 },
    ]);
  });
  it("handles tab and multi-space separators", () => {
    expect(parseDataPoints("35.6\t139.7\t3")).toEqual([{ lat: 35.6, lng: 139.7, value: 3 }]);
  });
  it("returns [] for non-strings", () => {
    expect(parseDataPoints(null)).toEqual([]);
  });

  it("resolves country codes/names via a centroid index, dropping unknowns", () => {
    const idx = new Map([
      ["us", { lat: 38, lng: -97 }],
      ["france", { lat: 46, lng: 2 }],
    ]);
    const pts = parseDataPoints("US,1200\nfrance,800\nZZ,5", idx);
    expect(pts).toEqual([
      { lat: 38, lng: -97, value: 1200 },
      { lat: 46, lng: 2, value: 800 },
    ]);
  });

  it("auto-detects coordinate vs country lines in the same paste", () => {
    const idx = new Map([["us", { lat: 38, lng: -97 }]]);
    const pts = parseDataPoints("40.7,-74,10\nUS,1200", idx);
    expect(pts).toEqual([
      { lat: 40.7, lng: -74, value: 10 },
      { lat: 38, lng: -97, value: 1200 },
    ]);
  });
});

describe("valueToRadius", () => {
  it("scales between rMin and rMax by area (sqrt)", () => {
    expect(valueToRadius(0, 0, 100, 0.01, 0.05)).toBeCloseTo(0.01);
    expect(valueToRadius(100, 0, 100, 0.01, 0.05)).toBeCloseTo(0.05);
    expect(valueToRadius(25, 0, 100, 0.01, 0.05)).toBeCloseTo(0.03); // sqrt(0.25)=0.5
  });
  it("returns the mid radius when all values are equal", () => {
    expect(valueToRadius(5, 5, 5, 0.01, 0.05)).toBeCloseTo(0.03);
  });
});
