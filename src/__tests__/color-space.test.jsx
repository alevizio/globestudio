// A design keeps the old reading of its colors, which renders them darker
// than their hex, until a color is picked: then it switches to hex colors,
// which render as their hex, and turns its other colors into hex colors
// that render the same. Looks, Reset and imports bring their own color
// space. Mounts the real App (same shims as the smoke test) and reads the
// persisted state the panel writes on every change.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { DEFAULT_FLOW_SETTINGS } from "../config/backgrounds.js";
import { DEFAULT_GLOBE_SETTINGS } from "../config/globe-settings.js";
import { toLinearHex } from "../utils/color-space.js";

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

const stored = (key) => JSON.parse(window.localStorage.getItem(`globestudio:${key}`));
const save = (key, value) => window.localStorage.setItem(`globestudio:${key}`, JSON.stringify(value));

const renderApp = async (path = "/") => {
  window.history.pushState({}, "", path);
  const { default: App } = await import("../App.jsx");
  return render(<App />);
};

const pickDotColor = (hex) => {
  fireEvent.click(screen.getByRole("button", { name: "Surface" }));
  fireEvent.click(screen.getByRole("button", { name: "Select dot color" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Hex value" }), { target: { value: hex } });
};

// A design with old colors: the look's map colors, a grey grid and a
// picked marker color, as a returning visitor has them saved.
const saveOldDesign = () => {
  save("worldFill", "#5a5a64");
  save("worldStroke", "#f6f2ea");
  save("globeSettings", { ...DEFAULT_GLOBE_SETTINGS, gridColor: "#808080", dataMarkerColor: "#ff8000", glowColor: "#4080c0" });
  save("flowSettings", { ...DEFAULT_FLOW_SETTINGS });
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("the design's color space", () => {
  it("picking a color switches to hex colors and keeps the other colors as they render", async () => {
    saveOldDesign();
    await renderApp();
    expect(stored("hexColors")).toBe(null);

    pickDotColor("#ff0066");

    expect(stored("hexColors")).toBe(true);
    expect(stored("dotColor")).toBe("#ff0066");
    // The rest, turned into the hex colors that render as they did.
    expect(stored("worldFill")).toBe("#1a1a20");
    expect(stored("worldStroke")).toBe("#ebe2d2");
    expect(stored("globeSettings")).toMatchObject({ gridColor: "#373737", dataMarkerColor: "#ff3700" });
    expect(stored("flowSettings")).toMatchObject({ colorA: "#201bff", colorB: "#00a8ff", colorC: "#ff1b4a" });
    // The glow and the sphere keep the old reading either way.
    expect(stored("globeSettings")).toMatchObject({ glowColor: "#4080c0", surfaceColor: DEFAULT_GLOBE_SETTINGS.surfaceColor });

    // Only once: a second pick leaves the rest alone.
    fireEvent.change(screen.getByRole("textbox", { name: "Hex value" }), { target: { value: "#00ff66" } });
    expect(stored("dotColor")).toBe("#00ff66");
    expect(stored("worldFill")).toBe("#1a1a20");
  }, 20000);

  it("a look brings back old colors, with the colors it leaves turned to match", async () => {
    saveOldDesign();
    await renderApp();
    pickDotColor("#ff0066");
    expect(stored("hexColors")).toBe(true);

    fireEvent.click(within(screen.getByRole("list", { name: "Looks" })).getByRole("button", { name: "Toon" }));

    expect(stored("hexColors")).toBe(false);
    // The look's own colors, exactly as authored...
    expect(stored("dotColor")).toBe("#3df4ff");
    expect(stored("worldFill")).toBe("#5a5a64");
    // ...and the marker color it keeps, back as the old color it was.
    expect(stored("globeSettings").dataMarkerColor).toBe("#ff8000");
  }, 20000);

  it("Reset brings back the old default colors", async () => {
    saveOldDesign();
    await renderApp();
    pickDotColor("#ff0066");
    // R, the Reset shortcut, pressed outside the picker's fields.
    fireEvent.keyDown(document.body, { key: "r" });
    expect(stored("hexColors") ?? false).toBe(false);
    expect(stored("dotColor") ?? "#ffffff").toBe("#ffffff");
    expect(stored("worldFill") ?? "#5a5a64").toBe("#5a5a64");
  }, 20000);

  it("a link opens in its own color space", async () => {
    // A v2 link, as every link made before: old colors, as they are.
    save("hexColors", true);
    save("worldFill", "#1a1a20");
    const old = encodeURIComponent(JSON.stringify({ v: 2, dotColor: "#ff8000" }));
    await renderApp(`/?c=${old}`);
    expect(stored("hexColors")).toBe(false);
    expect(stored("dotColor")).toBe("#ff8000");
    // What the link leaves out is turned into old colors that render the same.
    expect(stored("worldFill")).toBe("#5a5a64");
    cleanup();

    // A v3 link: hex colors, as they are.
    window.localStorage.clear();
    const hex = encodeURIComponent(JSON.stringify({ v: 3, dotColor: "#ff8000" }));
    await renderApp(`/?c=${hex}`);
    expect(stored("hexColors")).toBe(true);
    expect(stored("dotColor")).toBe("#ff8000");
  }, 20000);

  // The picker builds the gradient it sends from the one it shows. In a
  // design with old colors the stops it leaves alone are still old colors,
  // so they keep rendering as they did: only a stop picked anew renders as
  // its hex.
  const OLD_GRADIENT = { from: "#ff0044", to: "#00ff88", angle: 45 };
  const openDotPicker = () => {
    fireEvent.click(screen.getByRole("button", { name: "Surface" }));
    fireEvent.click(screen.getByRole("button", { name: "Select dot color" }));
  };

  it("a new angle on an old gradient moves none of its colors", async () => {
    save("dotGradient", OLD_GRADIENT);
    await renderApp();
    openDotPicker();
    fireEvent.change(screen.getByRole("slider", { name: "Gradient angle" }), { target: { value: "120" } });
    expect(stored("hexColors")).toBe(true);
    expect(stored("dotGradient")).toEqual({ from: toLinearHex("#ff0044"), to: toLinearHex("#00ff88"), angle: 120 });
  }, 20000);

  it("a stop picked on an old gradient renders as its hex, and the other as it did", async () => {
    save("dotGradient", OLD_GRADIENT);
    await renderApp();
    openDotPicker();
    fireEvent.click(screen.getByRole("tab", { name: /To/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Hex value" }), { target: { value: "#0000ff" } });
    expect(stored("dotGradient")).toEqual({ from: toLinearHex("#ff0044"), to: "#0000ff", angle: 45 });
  }, 20000);

  it("the grid gradient keeps the stops it leaves as they render", async () => {
    save("globeSettings", { ...DEFAULT_GLOBE_SETTINGS, grid: true, gridGradient: { from: "#808080", to: "#ff8000", angle: 90 } });
    await renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Grid" }));
    fireEvent.click(screen.getByRole("button", { name: "Select grid color" }));
    fireEvent.change(screen.getByRole("slider", { name: "Gradient angle" }), { target: { value: "30" } });
    expect(stored("hexColors")).toBe(true);
    expect(stored("globeSettings").gridGradient).toEqual({ from: "#373737", to: "#ff3700", angle: 30 });
  }, 20000);
});
