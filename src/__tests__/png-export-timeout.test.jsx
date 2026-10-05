// PNG export in App.jsx when the hi-res capture fails. Launch week reports
// had "captureAtScale toBlob timed out": the N× capture was too slow for the
// device, and the Canvas2D fallback then upscaled the live canvas to the
// same N× size, an encode just as heavy on the same device. A timeout now
// saves at Draft size (1×); any other capture failure keeps the full size.
// The globe can't run in jsdom, so a stand-in canvas fails its captures the
// way the real one does, and a fake 2D context records what gets encoded.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const capture = vi.hoisted(() => ({ error: null }));
const analytics = vi.hoisted(() => ({ errors: [], events: [] }));

vi.mock("../utils/webgl-support.js", () => ({ hasWebGL: () => true }));
vi.mock("../components/analytics.jsx", () => ({
  Analytics: () => null,
  track: (name, properties) => analytics.events.push({ name, properties }),
  trackClientError: (where, error) => analytics.errors.push({ where, msg: String(error?.message || error) }),
}));
vi.mock("../components/globe-background.jsx", async () => {
  const { useEffect, useRef } = await import("react");
  return {
    GlobeBackground: ({ canvasHandleRef }) => {
      const ref = useRef(null);
      useEffect(() => {
        const node = ref.current;
        node.captureAtScale = () => Promise.reject(capture.error);
        node.holdFullFrame = () => {};
        canvasHandleRef.current = node;
      }, [canvasHandleRef]);
      return <canvas className="globe-stand-in" width={800} height={600} ref={ref} />;
    },
  };
});

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Sizes of the canvases the fallback encodes, and the PNGs handed to a
// download.
let encoded = [];
let downloads = [];

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  encoded = [];
  downloads = [];
  analytics.errors = [];
  analytics.events = [];
  vi.restoreAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((kind) =>
    kind === "2d" ? { fillRect: () => {}, drawImage: () => {} } : null,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(function () {
    encoded.push({ width: this.width, height: this.height });
    return "data:image/png;base64,iVBORw0KGgo=";
  });
  URL.createObjectURL = (blob) => {
    downloads.push(blob);
    return "blob:png";
  };
  URL.revokeObjectURL = () => {};
  // jsdom can't follow the download link.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

// Standard, the dialog's default quality: twice the 800×600 canvas.
const exportPng = async () => {
  const { default: App } = await import("../App.jsx");
  render(<App />);
  await waitFor(() => expect(document.querySelector(".globe-stand-in").captureAtScale).toBeTypeOf("function"));
  fireEvent.keyDown(window, { key: "d" });
  const button = await screen.findByRole("button", { name: "Export PNG" });
  await act(async () => {
    fireEvent.click(button);
  });
  await waitFor(() => expect(downloads).toHaveLength(1));
};

describe("PNG export after a failed hi-res capture", () => {
  it("saves a Draft size PNG when the capture timed out, with the usual saved status", async () => {
    capture.error = new Error("captureAtScale toBlob timed out");
    await exportPng();
    expect(downloads[0].type).toBe("image/png");
    expect(encoded).toEqual([{ width: 800, height: 600 }]);
    expect(screen.getByRole("button", { name: "PNG saved" })).toBeTruthy();
    expect(screen.queryByText(/Export failed/)).toBeNull();
    expect(analytics.errors).toEqual([{ where: "export-png", msg: "captureAtScale toBlob timed out" }]);
    expect(analytics.events).toContainEqual({
      name: "export_completed",
      properties: expect.objectContaining({ format: "png", scale: 1 }),
    });
  }, 20000);

  it("does the same when App's own wait for the capture runs out first", async () => {
    capture.error = new Error("High-res capture timed out");
    await exportPng();
    expect(encoded).toEqual([{ width: 800, height: 600 }]);
  }, 20000);

  it("keeps the requested size when the capture failed some other way", async () => {
    capture.error = new Error("Composer not ready");
    await exportPng();
    expect(encoded).toEqual([{ width: 1600, height: 1200 }]);
    expect(analytics.events).toContainEqual({
      name: "export_completed",
      properties: expect.objectContaining({ format: "png", scale: 2 }),
    });
  }, 20000);
});
