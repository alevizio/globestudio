import { describe, expect, it } from "vitest";
import { restoreFigmaPicks, saveFigmaPicks } from "./figma-picks.js";

const FROM_URL = { look: "default", selection: "world", density: 40 };

describe("figma picks", () => {
  it("starts from the URL when nothing is stored", () => {
    expect(restoreFigmaPicks(FROM_URL)).toEqual(FROM_URL);
  });

  it("restores the picks saved before a color reload", () => {
    saveFigmaPicks({ look: "halftone", selection: "country:JPN", density: 72 });
    expect(restoreFigmaPicks(FROM_URL)).toEqual({ look: "halftone", selection: "country:JPN", density: 72 });
  });

  it("falls back per field when a stored value is unknown or out of range", () => {
    window.sessionStorage.setItem(
      "globestudio:figma-picks",
      JSON.stringify({ look: "retired-look", selection: "country:XXX", density: 500 }),
    );
    expect(restoreFigmaPicks(FROM_URL)).toEqual({ look: "default", selection: "world", density: 90 });
  });

  it("ignores stored data that isn't a picks object", () => {
    window.sessionStorage.setItem("globestudio:figma-picks", "not json");
    expect(restoreFigmaPicks(FROM_URL)).toEqual(FROM_URL);
    window.sessionStorage.setItem("globestudio:figma-picks", "42");
    expect(restoreFigmaPicks(FROM_URL)).toEqual(FROM_URL);
  });

  it("works without storage", () => {
    const blocked = {
      get sessionStorage() {
        throw new DOMException("blocked", "SecurityError");
      },
    };
    expect(() => saveFigmaPicks({ look: "halftone" }, blocked)).not.toThrow();
    expect(restoreFigmaPicks(FROM_URL, blocked)).toEqual(FROM_URL);
  });
});
