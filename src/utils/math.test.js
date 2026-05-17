import { describe, expect, it } from "vitest";
import {
  clampNumber,
  degToRad,
  easeInOutSine,
  formatSvgNumber,
  hashString,
  inverseMercatorY,
  mercatorY,
  normalizeLongitude,
  radToDeg,
  smoothStep,
} from "./math.js";

describe("clampNumber", () => {
  it("returns the value when within range", () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
  });

  it("clamps below the minimum", () => {
    expect(clampNumber(-3, 0, 10)).toBe(0);
  });

  it("clamps above the maximum", () => {
    expect(clampNumber(99, 0, 10)).toBe(10);
  });

  it("coerces string inputs to numbers", () => {
    expect(clampNumber("7", 0, 10)).toBe(7);
  });
});

describe("normalizeLongitude", () => {
  it("leaves values in [-180, 180] alone", () => {
    expect(normalizeLongitude(45)).toBe(45);
    expect(normalizeLongitude(-179)).toBe(-179);
  });

  it("wraps eastbound overflow", () => {
    expect(normalizeLongitude(190)).toBe(-170);
  });

  it("wraps westbound overflow", () => {
    expect(normalizeLongitude(-190)).toBe(170);
  });

  it("normalizes exactly 180 to -180 boundary edge", () => {
    expect(normalizeLongitude(360)).toBe(0);
  });
});

describe("degToRad / radToDeg", () => {
  it("converts 180° to π", () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 10);
  });

  it("converts π to 180°", () => {
    expect(radToDeg(Math.PI)).toBeCloseTo(180, 10);
  });

  it("round-trips degrees through radians", () => {
    [0, 30, 45, 90, 137.5, -22, 359.9].forEach((deg) => {
      expect(radToDeg(degToRad(deg))).toBeCloseTo(deg, 10);
    });
  });
});

describe("mercatorY / inverseMercatorY", () => {
  it("returns 0 at the equator", () => {
    expect(mercatorY(0)).toBeCloseTo(0, 10);
  });

  it("clamps poles to the Web Mercator limit", () => {
    expect(mercatorY(89)).toBe(mercatorY(90));
    expect(mercatorY(-89)).toBe(mercatorY(-90));
  });

  it("round-trips through inverseMercatorY", () => {
    [-60, -30, -5, 0, 12, 47, 75].forEach((lat) => {
      expect(inverseMercatorY(mercatorY(lat))).toBeCloseTo(lat, 6);
    });
  });
});

describe("easeInOutSine", () => {
  it("starts at 0", () => {
    expect(easeInOutSine(0)).toBeCloseTo(0, 10);
  });

  it("ends at 1", () => {
    expect(easeInOutSine(1)).toBeCloseTo(1, 10);
  });

  it("hits 0.5 at the midpoint", () => {
    expect(easeInOutSine(0.5)).toBeCloseTo(0.5, 10);
  });

  it("clamps out-of-range inputs", () => {
    expect(easeInOutSine(-1)).toBeCloseTo(0, 10);
    expect(easeInOutSine(2)).toBeCloseTo(1, 10);
  });
});

describe("smoothStep", () => {
  it("returns 0 below the lower edge", () => {
    expect(smoothStep(0.2, 0.8, 0.1)).toBe(0);
  });

  it("returns 1 above the upper edge", () => {
    expect(smoothStep(0.2, 0.8, 0.9)).toBe(1);
  });

  it("produces a smooth curve between edges", () => {
    expect(smoothStep(0, 1, 0.5)).toBeCloseTo(0.5, 10);
  });
});

describe("hashString", () => {
  it("returns the same value for the same input", () => {
    expect(hashString("hello")).toBe(hashString("hello"));
  });

  it("returns different values for different inputs", () => {
    expect(hashString("a")).not.toBe(hashString("b"));
  });

  it("always returns a non-negative integer", () => {
    ["", "x", "100:200:5", "🍕", "abcdef"].forEach((input) => {
      const result = hashString(input);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  it("distributes outputs across moduli (rough sanity check)", () => {
    const buckets = [0, 0, 0];
    for (let i = 0; i < 90; i += 1) {
      buckets[hashString(`point-${i}`) % 3] += 1;
    }
    buckets.forEach((count) => {
      expect(count).toBeGreaterThan(5);
    });
  });
});

describe("formatSvgNumber", () => {
  it("trims trailing zeros", () => {
    expect(formatSvgNumber(1.5)).toBe("1.5");
    expect(formatSvgNumber(2)).toBe("2");
  });

  it("rounds to the requested decimals", () => {
    expect(formatSvgNumber(1.23456, 2)).toBe("1.23");
  });

  it("falls back to 0 for non-finite inputs", () => {
    expect(formatSvgNumber(Infinity)).toBe("0");
    expect(formatSvgNumber(NaN)).toBe("0");
  });
});
