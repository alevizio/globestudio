import { describe, expect, it } from "vitest";
import { formatSelectionStatus } from "./a11y-status.js";

describe("formatSelectionStatus", () => {
  it("speaks a country's name, not its ISO code", () => {
    expect(formatSelectionStatus("country:BRA")).toBe("Selection: Brazil");
    expect(formatSelectionStatus("country:USA")).toBe("Selection: United States");
  });

  it("uses the picker's label for continents and subregions", () => {
    expect(formatSelectionStatus("continent:Europe")).toBe("Selection: Europe (Continent)");
  });

  it("falls back to the readable part of an unknown value", () => {
    expect(formatSelectionStatus("subregion:Made-Up-Place")).toBe("Selection: Made Up Place");
  });
});
