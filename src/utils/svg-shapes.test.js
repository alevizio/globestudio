import { describe, expect, it } from "vitest";
import {
  createDiamondPoints,
  createHexagonPoints,
  createParticleGridOffsets,
  createPlusPointArray,
  createRegularPolygonPointArray,
  createStarPointArray,
  createVoxelFaces,
  formatPointList,
} from "./svg-shapes.js";

describe("createRegularPolygonPointArray", () => {
  it("returns the requested number of vertices", () => {
    expect(createRegularPolygonPointArray(0, 0, 1, 6)).toHaveLength(6);
  });

  it("starts at the top vertex by default", () => {
    const [first] = createRegularPolygonPointArray(0, 0, 1, 4);
    expect(first[0]).toBeCloseTo(0, 6);
    expect(first[1]).toBeCloseTo(-1, 6);
  });

  it("places vertices on a circle of the given radius", () => {
    const points = createRegularPolygonPointArray(0, 0, 5, 5);
    points.forEach(([x, y]) => {
      expect(Math.hypot(x, y)).toBeCloseTo(5, 6);
    });
  });
});

describe("createStarPointArray", () => {
  it("returns 2x the requested points (outer + inner)", () => {
    expect(createStarPointArray(0, 0, 2, 1, 5)).toHaveLength(10);
  });

  it("alternates between outer and inner radius", () => {
    const points = createStarPointArray(0, 0, 2, 1);
    points.forEach(([x, y], index) => {
      const expected = index % 2 === 0 ? 2 : 1;
      expect(Math.hypot(x, y)).toBeCloseTo(expected, 6);
    });
  });
});

describe("createPlusPointArray", () => {
  it("returns 12 vertices for the plus outline", () => {
    expect(createPlusPointArray(0, 0, 1)).toHaveLength(12);
  });
});

describe("createParticleGridOffsets", () => {
  it("returns a 3x3 grid (9 offsets)", () => {
    const offsets = createParticleGridOffsets(2);
    expect(offsets).toHaveLength(9);
    expect(offsets).toContainEqual([0, 0]);
    expect(offsets).toContainEqual([-2, -2]);
    expect(offsets).toContainEqual([2, 2]);
  });
});

describe("formatPointList", () => {
  it("joins coordinates as 'x,y x,y'", () => {
    expect(formatPointList([[1, 2], [3, 4]])).toBe("1,2 3,4");
  });

  it("rounds to two decimals", () => {
    expect(formatPointList([[1.234, 5.678]])).toBe("1.23,5.68");
  });
});

describe("createHexagonPoints", () => {
  it("returns six space-separated coordinate pairs", () => {
    const result = createHexagonPoints(0, 0, 1);
    expect(result.split(" ")).toHaveLength(6);
  });
});

describe("createDiamondPoints", () => {
  it("returns four points along the cardinal directions", () => {
    const result = createDiamondPoints(0, 0, 5);
    expect(result).toBe("0,-5 5,0 0,5 -5,0");
  });
});

describe("createVoxelFaces", () => {
  it("returns left, right, and top faces with four vertices each", () => {
    const faces = createVoxelFaces(0, 0, 1);
    expect(faces.left).toHaveLength(4);
    expect(faces.right).toHaveLength(4);
    expect(faces.top).toHaveLength(4);
  });
});
