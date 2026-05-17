import { describe, expect, it } from "vitest";
import { exportScaleValue } from "./export.js";

describe("exportScaleValue", () => {
  it("parses the leading number out of '2x'", () => {
    expect(exportScaleValue("2x")).toBe(2);
    expect(exportScaleValue("4x")).toBe(4);
  });

  it("defaults to 1 for unrecognized values", () => {
    expect(exportScaleValue("")).toBe(1);
    expect(exportScaleValue("foo")).toBe(1);
  });
});
