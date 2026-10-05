import { describe, it, expect } from "vitest";
import {
  DATA_POINTS_EXAMPLE,
  parseDataPoints,
  serializeDataPoints,
  valueToRadius,
  visibleDataPoints,
} from "./data-points.js";

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

describe("DATA_POINTS_EXAMPLE", () => {
  it("parses to eight city markers with a value each, no country lookup needed", () => {
    const points = parseDataPoints(DATA_POINTS_EXAMPLE);
    expect(DATA_POINTS_EXAMPLE.split("\n")).toHaveLength(8);
    expect(points).toHaveLength(8);
    for (const { lat, lng, value } of points) {
      expect(Math.abs(lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(lng)).toBeLessThanOrEqual(180);
      expect(value).toBeGreaterThan(1);
    }
    // Values differ, so the markers come out in different sizes.
    expect(new Set(points.map((p) => p.value)).size).toBeGreaterThan(4);
  });

  it("reads back the same after a share link, so the box shows it unchanged", () => {
    expect(serializeDataPoints(parseDataPoints(DATA_POINTS_EXAMPLE))).toBe(DATA_POINTS_EXAMPLE);
  });
});

describe("serializeDataPoints", () => {
  it("writes one lat,lng,value line per point that parses back to the same points", () => {
    const points = [
      { lat: 40.7, lng: -74, value: 10 },
      { lat: -23.5, lng: -46.6, value: 0.25 },
    ];
    const text = serializeDataPoints(points);
    expect(text).toBe("40.7,-74,10\n-23.5,-46.6,0.25");
    expect(parseDataPoints(text)).toEqual(points);
  });

  it("returns an empty string for missing or empty points", () => {
    expect(serializeDataPoints([])).toBe("");
    expect(serializeDataPoints(undefined)).toBe("");
    expect(serializeDataPoints(null)).toBe("");
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

describe("visibleDataPoints", () => {
  const dataPoints = [{ lat: 40.7, lng: -74, value: 10 }];

  it("draws the stored points while the Data eye is on or unset", () => {
    expect(visibleDataPoints({ data: true, dataPoints })).toBe(dataPoints);
    // Configs saved before the eye existed have no `data` key.
    expect(visibleDataPoints({ dataPoints })).toBe(dataPoints);
  });

  it("draws nothing while the eye is off, leaving dataPoints as is", () => {
    const settings = { data: false, dataPoints };
    expect(visibleDataPoints(settings)).toEqual([]);
    expect(settings.dataPoints).toEqual([{ lat: 40.7, lng: -74, value: 10 }]);
  });

  it("returns [] for missing settings or points", () => {
    expect(visibleDataPoints(undefined)).toEqual([]);
    expect(visibleDataPoints({ data: true })).toEqual([]);
  });
});
