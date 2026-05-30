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
// that the component body executes without throwing.

import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

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

describe("App smoke", () => {
  it("renders without throwing on first mount", async () => {
    // Dynamic import so the matchMedia shim above is in place before
    // App's module-level code (which can read media queries) runs.
    const { default: App } = await import("../App.jsx");
    expect(() => render(<App />)).not.toThrow();
    // Full-app mount (canvas shell, observers, lazy route wiring) is heavy
    // in jsdom and flaky at the 5s default under CI load — this test only
    // guards "doesn't throw", not timing, so give it room.
  }, 20000);
});
