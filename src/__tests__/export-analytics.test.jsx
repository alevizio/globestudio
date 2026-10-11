// What App.jsx counts around the export dialog. export_opened says how the
// dialog opened, and export_completed counts each save and each copy once it
// worked, with its format and the look and nothing more: Vercel's Pro plan
// keeps two properties per event (analytics.jsx). The globe can't run in
// jsdom, so a stand-in canvas takes its place, a fake 2D context encodes the
// PNG and a stand-in recorder makes the WebM.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const analytics = vi.hoisted(() => ({ events: [] }));

vi.mock("../utils/webgl-support.js", () => ({ hasWebGL: () => true }));
vi.mock("../components/analytics.jsx", () => ({
  Analytics: () => null,
  track: (name, properties) => analytics.events.push({ name, properties }),
  trackClientError: () => {},
}));
vi.mock("../utils/export.js", async (importOriginal) => ({
  ...(await importOriginal()),
  pickVideoMimeType: () => "video/webm",
  recordCanvasToVideoBlob: async () => new Blob(["webm"], { type: "video/webm" }),
}));
vi.mock("../components/globe-background.jsx", async () => {
  const { useEffect, useRef } = await import("react");
  return {
    GlobeBackground: ({ canvasHandleRef }) => {
      const ref = useRef(null);
      useEffect(() => {
        const node = ref.current;
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

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  analytics.events = [];
  vi.restoreAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((kind) =>
    kind === "2d" ? { fillRect: () => {}, drawImage: () => {} } : null,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,iVBORw0KGgo=");
  URL.createObjectURL = () => "blob:export";
  URL.revokeObjectURL = () => {};
  // jsdom can't follow the download link.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  delete globalThis.ClipboardItem;
  delete navigator.clipboard;
  delete document.execCommand;
});

// A browser that can put text and images on the clipboard. The image
// arrives as a promise of the PNG, and the write waits for it.
const allowClipboard = ({ refuse = false } = {}) => {
  globalThis.ClipboardItem = class {
    constructor(items) {
      this.png = items["image/png"];
    }
  };
  const write = vi.fn(async ([item]) => {
    await item.png;
    if (refuse) throw new Error("denied");
  });
  const writeText = vi.fn(async () => {
    if (refuse) throw new Error("denied");
  });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write, writeText } });
};

const renderApp = async () => {
  const { default: App } = await import("../App.jsx");
  render(<App />);
  await waitFor(() => expect(document.querySelector(".globe-stand-in").holdFullFrame).toBeTypeOf("function"));
};

const openExport = () => fireEvent.keyDown(window, { key: "d" });

const sent = (name) => analytics.events.filter((event) => event.name === name).map((event) => event.properties);

describe("export_opened", () => {
  it("says whether the Export button, the D key or the command palette opened the dialog", async () => {
    await renderApp();
    const close = () => fireEvent.click(screen.getByRole("button", { name: "Close export dialog" }));

    fireEvent.click(screen.getByRole("button", { name: "Open export dialog" }));
    expect(screen.getByRole("dialog", { name: "Export" })).toBeTruthy();
    close();
    fireEvent.keyDown(window, { key: "d" });
    expect(screen.getByRole("dialog", { name: "Export" })).toBeTruthy();
    close();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    fireEvent.click(screen.getByRole("option", { name: /Open export dialog/ }));
    expect(screen.getByRole("dialog", { name: "Export" })).toBeTruthy();

    expect(sent("export_opened")).toEqual([{ from: "button" }, { from: "shortcut" }, { from: "palette" }]);
  }, 20000);

  it("counts nothing more when the dialog is asked for while it is open", async () => {
    await renderApp();
    openExport();
    openExport();
    expect(screen.getByRole("dialog", { name: "Export" })).toBeTruthy();
    expect(sent("export_opened")).toEqual([{ from: "shortcut" }]);
  }, 20000);
});

describe("export_completed", () => {
  it("sends a saved PNG's and a saved video's format and look, and nothing more", async () => {
    await renderApp();
    openExport();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Export PNG" }));
    });
    await screen.findByRole("button", { name: "PNG saved" });
    fireEvent.click(screen.getByRole("tab", { name: "Video" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Export WebM" }));
    });
    await waitFor(() =>
      expect(sent("export_completed")).toEqual([
        { format: "png", look: "custom" },
        { format: "webm", look: "custom" },
      ]),
    );
  }, 20000);

  it.each([
    ["SVG", "Copy SVG to clipboard", "svg-copy"],
    ["Figma", "Copy as vectors", "figma-copy"],
  ])("counts the %s tab's %s as %s, with the look", async (tab, button, format) => {
    window.history.pushState({}, "", "/looks/halftone");
    allowClipboard();
    await renderApp();
    openExport();
    fireEvent.click(screen.getByRole("tab", { name: tab }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: button }));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(sent("export_completed")).toEqual([{ format, look: "halftone" }]);
  }, 20000);

  it.each([
    ["Image", "Copy image"],
    ["Figma", "Copy as image"],
  ])("counts the %s tab's %s as png-copy once the clipboard has the PNG", async (tab, button) => {
    allowClipboard();
    await renderApp();
    openExport();
    fireEvent.click(screen.getByRole("tab", { name: tab }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: button }));
    });
    await screen.findByRole("button", { name: "Image copied to clipboard" });
    expect(navigator.clipboard.write).toHaveBeenCalledTimes(1);
    // Copied, not saved: it counts once, as a copy.
    expect(sent("export_completed")).toEqual([{ format: "png-copy", look: "custom" }]);
  }, 20000);

  it("counts no copy the clipboard refused", async () => {
    allowClipboard({ refuse: true });
    // The SVG copy's fallback for a refused Clipboard API fails too.
    document.execCommand = () => false;
    await renderApp();
    openExport();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy image" }));
    });
    await screen.findByRole("button", { name: "Copy failed. Try again" });
    fireEvent.click(screen.getByRole("tab", { name: "SVG" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy SVG to clipboard" }));
    });
    expect(screen.getByRole("button", { name: "Select SVG code" })).toBeTruthy();
    expect(sent("export_completed")).toEqual([]);
  }, 20000);
});
