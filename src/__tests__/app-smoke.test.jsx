// Smoke test: mount <App /> through render() so any first-render crash
// surfaces in CI. The accessibility test only renders sub-components, so
// it cannot catch errors that happen during App's initial render — most
// importantly, temporal-dead-zone errors from hooks that reference
// `const` values declared later in the component body. A prior refactor
// shipped exactly that bug (useRouteLook(applyLook) called before
// applyLook was initialized), and the build + unit tests all passed
// because nothing actually mounted App. This guard fills that gap.
//
// We don't assert on the rendered tree — the canvas-bearing children
// are lazy + WebGL-dependent and can't render in jsdom. We only care
// that the component body executes without throwing, and that
// VITE_TEASER picks the studio or the teaser as the build does.

import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { matchRoute } from "../utils/route-match.js";

// jsdom doesn't ship matchMedia or ResizeObserver; both are called
// during App's first render (usePrefersReducedMotion, looks-bar scroll
// observer, etc.). Shim them so the smoke test exercises the real
// render path without crashing on missing browser globals.
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

// The real teaser mounts WebGL shaders jsdom can't run; a stand-in is
// enough to see which tree App picked.
vi.mock("../components/teaser-page.jsx", () => ({ TeaserPage: () => <h1>Waitlist teaser</h1> }));

describe("App smoke", () => {
  it("renders without throwing on first mount", async () => {
    // Dynamic import so the matchMedia shim above is in place before
    // App's module-level code (which can read media queries) runs.
    const { default: App } = await import("../App.jsx");
    let container;
    expect(() => ({ container } = render(<App />))).not.toThrow();
    // VITE_TEASER is unset here, which must serve the studio, not the
    // waitlist: the client uses the same `=== "1"` test as the build.
    expect(container.querySelector("main.app-shell")).not.toBeNull();
    expect(screen.queryByRole("heading", { name: "Waitlist teaser" })).toBeNull();
    // Full-app mount (canvas shell, observers, lazy route wiring) is heavy
    // in jsdom and flaky at the 5s default under CI load — this test only
    // guards "doesn't throw", not timing, so give it room.
  }, 20000);

  it("gives each look page its own H1 instead of the home one", async () => {
    window.history.pushState({}, "", "/looks/halftone");
    try {
      const { default: App } = await import("../App.jsx");
      render(<App />);
      const headings = screen.getAllByRole("heading", { level: 1 });
      expect(headings.map((h) => h.textContent)).toEqual(["Halftone dotted map and 3D globe look"]);
    } finally {
      window.history.pushState({}, "", "/");
    }
  }, 20000);

  it("links the site's pages from the panel on the home page", async () => {
    // The studio is what "/" renders once JS runs, so without these a
    // crawler that renders the page finds no path to the rest of the site.
    window.history.pushState({}, "", "/");
    const { default: App } = await import("../App.jsx");
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Site links" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Gallery", "/gallery"],
      ["Docs", "/docs"],
      ["Integrations", "/integrations"],
      ["Examples", "/examples"],
      ["vs cobe", "/compare/cobe"],
      ["vs GEOlayers", "/compare/geolayers"],
      ["Changelog", "/changelog"],
    ]);
    for (const link of links) {
      // Same tab, like every other internal link, and to a page that exists.
      expect(link.hasAttribute("target"), link.textContent).toBe(false);
      expect(matchRoute(link.getAttribute("href")).page, link.textContent).not.toMatch(/not-found|redirect/);
    }
  }, 20000);

  it("serves the teaser instead of the studio only when VITE_TEASER is 1", async () => {
    // TEASER_MODE is read at module load, so re-import App with the flag set.
    vi.stubEnv("VITE_TEASER", "1");
    vi.resetModules();
    try {
      const { default: App } = await import("../App.jsx");
      const { container } = render(<App />);
      await screen.findByRole("heading", { name: "Waitlist teaser" });
      expect(container.querySelector("main.app-shell")).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  }, 20000);
});
