// A look is styling only: picking one must keep the region the user chose
// and the data they pasted. Mounts the real App (same shims as the smoke
// test) and reads the persisted state the panel writes on every change.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DEFAULT_GLOBE_SETTINGS } from "../config/globe-settings.js";

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

describe("applyLook", () => {
  it("keeps the chosen region and the pasted data, and changes the styling", async () => {
    window.history.pushState({}, "", "/");
    const points = [
      { lat: 35.7, lng: 139.7, value: 8 },
      { lat: 34.7, lng: 135.5, value: 5 },
    ];
    window.localStorage.setItem("globestudio:selection", JSON.stringify("country:JPN"));
    window.localStorage.setItem(
      "globestudio:globeSettings",
      JSON.stringify({ ...DEFAULT_GLOBE_SETTINGS, dataPoints: points, dataMarkerColor: "#ff0000", dataArcs: true }),
    );
    const { default: App } = await import("../App.jsx");
    render(<App />);

    const looks = screen.getByRole("list", { name: "Looks" });
    fireEvent.click(within(looks).getByRole("button", { name: "Halftone" }));

    // The look's styling landed (Halftone authors density 50)...
    expect(stored("density")).toBe(50);
    // ...but the region and the Data section are still the user's.
    expect(stored("selection")).toBe("country:JPN");
    expect(stored("globeSettings").dataPoints).toEqual(points);
    expect(stored("globeSettings").dataMarkerColor).toBe("#ff0000");
    expect(stored("globeSettings").dataArcs).toBe(true);
  }, 20000);
});
