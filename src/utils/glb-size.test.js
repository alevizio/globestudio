import { describe, expect, it } from "vitest";
import { GLB_LARGE_MB, formatGlbSize, glbSizeNote } from "./glb-size.js";

describe("formatGlbSize", () => {
  it("rounds to two significant figures, in KB under 1 MB and MB above", () => {
    expect(formatGlbSize(786_176)).toBe("790 KB");
    expect(formatGlbSize(19_452)).toBe("19 KB");
    expect(formatGlbSize(5_240)).toBe("5.2 KB");
    expect(formatGlbSize(1_520_000)).toBe("1.5 MB");
    expect(formatGlbSize(38_967_816)).toBe("39 MB");
    expect(formatGlbSize(79_036_256)).toBe("79 MB");
    expect(formatGlbSize(123_400_000)).toBe("120 MB");
  });

  it("moves up a unit when the rounding reaches it", () => {
    expect(formatGlbSize(999_600)).toBe("1 MB");
    expect(formatGlbSize(9_960_000)).toBe("10 MB");
  });

  it("keeps a size under 1 MB in MB, to one decimal, when asked", () => {
    expect(formatGlbSize(496_588, { inMegabytes: true })).toBe("0.5 MB");
    expect(formatGlbSize(669_152, { inMegabytes: true })).toBe("0.7 MB");
    expect(formatGlbSize(19_452, { inMegabytes: true })).toBe("0.1 MB");
    expect(formatGlbSize(1_520_000, { inMegabytes: true })).toBe("1.5 MB");
  });
});

describe("glbSizeNote", () => {
  const aurora = { merged: 38_967_816, instanced: 496_588 };
  const world = { merged: 786_176, instanced: 367_044 };

  it("gives the size of the Dots picked", () => {
    expect(glbSizeNote(world, "merged")).toEqual({ size: "About 790 KB", instancedSize: null });
    expect(glbSizeNote(world, "instanced")).toEqual({ size: "About 370 KB", instancedSize: null });
  });

  it("suggests Instanced, at its size, when Merged makes a file over 20 MB", () => {
    expect(glbSizeNote(aurora, "merged")).toEqual({ size: "About 39 MB", instancedSize: "0.5 MB" });
    expect(glbSizeNote(aurora, "instanced")).toEqual({ size: "About 500 KB", instancedSize: null });
  });

  it("draws the line over 20 MB as the size line shows it, as macOS counts it", () => {
    expect(GLB_LARGE_MB).toBe(20);
    // Particle Grid at Density 50, flat and globe: both read "About 20 MB",
    // so neither suggests.
    for (const merged of [19_821_572, 20_130_316, 20_499_999]) {
      expect(glbSizeNote({ merged, instanced: 400_000 }, "merged")).toEqual({ size: "About 20 MB", instancedSize: null });
    }
    expect(glbSizeNote({ merged: 20_500_000, instanced: 400_000 }, "merged")).toEqual({
      size: "About 21 MB",
      instancedSize: "0.4 MB",
    });
  });
});
