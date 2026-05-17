import { describe, expect, it } from "vitest";
import {
  areaOptionByValue,
  areaOptions,
  countries,
  regionOptions,
  subregionOptions,
} from "./geography.js";

describe("countries", () => {
  it("starts with the world option", () => {
    expect(areaOptions[0]).toMatchObject({ value: "world", label: "World", ids: [] });
  });

  it("excludes Antarctica", () => {
    expect(countries.find((c) => c._region === "Antarctic")).toBeUndefined();
  });

  it("is sorted alphabetically by display name", () => {
    for (let i = 1; i < countries.length; i += 1) {
      expect(countries[i]._displayName.localeCompare(countries[i - 1]._displayName)).toBeGreaterThanOrEqual(0);
    }
  });

  it("includes the United States with cca3 'USA'", () => {
    const usa = countries.find((c) => c._id === "USA");
    expect(usa).toBeDefined();
    expect(usa._displayName).toBe("United States");
  });
});

describe("region & subregion options", () => {
  it("formats region labels with '(Region)'", () => {
    regionOptions.forEach((option) => {
      expect(option.label.endsWith("(Region)")).toBe(true);
      expect(option.value.startsWith("region:")).toBe(true);
      expect(option.ids.length).toBeGreaterThan(0);
    });
  });

  it("formats subregion labels with '(Subregion)'", () => {
    subregionOptions.forEach((option) => {
      expect(option.label.endsWith("(Subregion)")).toBe(true);
      expect(option.value.startsWith("subregion:")).toBe(true);
    });
  });
});

describe("areaOptionByValue", () => {
  it("maps every area option's value back to the option", () => {
    areaOptions.forEach((option) => {
      expect(areaOptionByValue.get(option.value)).toBe(option);
    });
  });
});
