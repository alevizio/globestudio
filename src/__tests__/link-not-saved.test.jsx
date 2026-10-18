// A design opened from a link, a share link or a look's page, shows without
// being saved, so "/" keeps opening on the design saved in this browser. The
// first edit saves the whole design as it stands. Mounts the real App (same
// shims as the smoke test) and reads what it saves.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { lookPresets } from "../data/look-presets.js";

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
const halftone = lookPresets.find((preset) => preset.id === "halftone").settings;

describe("a design opened from a link", () => {
  it("shows a share link's design unsaved, and the first edit saves it as it stands", async () => {
    window.localStorage.setItem("globestudio:density", JSON.stringify(33));
    const config = { v: 2, selection: "country:JPN" };
    window.history.pushState({}, "", `/?c=${encodeURIComponent(JSON.stringify(config))}`);
    const { default: App } = await import("../App.jsx");
    render(<App />);

    expect(screen.getByRole("button", { name: /^Country or region/ }).textContent).toContain("Japan");
    expect(stored("selection")).toBeNull();
    expect(stored("density")).toBe(33);
    // The link stays in the address, so a reload opens it again.
    expect(window.location.search).toContain("c=");

    // The view isn't saved, so switching it is no edit.
    fireEvent.click(screen.getByRole("button", { name: "Flat view" }));
    expect(stored("selection")).toBeNull();

    const looks = screen.getByRole("list", { name: "Looks" });
    fireEvent.click(within(looks).getByRole("button", { name: "Halftone" }));
    expect(stored("selection")).toBe("country:JPN");
    expect(stored("density")).toBe(halftone.density);
    expect(window.location.search).not.toContain("c=");
  }, 20000);

  it("shows a look's page unsaved, and the first edit saves the look with it", async () => {
    window.localStorage.setItem("globestudio:density", JSON.stringify(33));
    window.history.pushState({}, "", "/looks/halftone");
    const { default: App } = await import("../App.jsx");
    render(<App />);

    expect(stored("density")).toBe(33);
    expect(stored("dotSize")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Data" }));
    fireEvent.click(screen.getByRole("button", { name: "Show data markers" }));
    expect(stored("density")).toBe(halftone.density);
    expect(stored("dotSize")).toBe(halftone.dotSize);
  }, 20000);
});
