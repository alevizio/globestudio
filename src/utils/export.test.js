import { describe, expect, it } from "vitest";
import { dataUrlToBlob, exportScaleValue } from "./export.js";

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

describe("dataUrlToBlob", () => {
  it("decodes a base64 data URL into a Blob with the header's mime type", () => {
    const blob = dataUrlToBlob("data:image/png;base64,iVBORw0KGgo=");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("parses a non-PNG mime type from the header", () => {
    const blob = dataUrlToBlob("data:image/jpeg;base64,AAAA");
    expect(blob.type).toBe("image/jpeg");
  });

  it("returns null when the input has no data segment (no comma)", () => {
    expect(dataUrlToBlob("not-a-data-url")).toBeNull();
  });
});
