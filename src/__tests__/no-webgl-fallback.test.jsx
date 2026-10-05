// A WebGL context three.js can't start on is no WebGL at all: the studio
// shows its still fallback and /embed its no WebGL message, as when the
// hasWebGL() probe finds nothing, and the studio reports it once. Launch
// week reports had a context without getShaderPrecisionFormat (stubbed by
// a privacy extension or a locked down browser) and a renderer that got no
// context after the probe got one; both ended in the "Couldn't load the
// globe view" card, whose Reload fails the same way again. The real
// GlobeBackground and three.js run here, on a stubbed context.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { __resetWebGLCacheForTests } from "../utils/webgl-support.js";

const analytics = vi.hoisted(() => ({ errors: [] }));
vi.mock("../components/analytics.jsx", () => ({
  Analytics: () => null,
  track: () => {},
  trackClientError: (where, error) => analytics.errors.push({ where, msg: String(error?.message || error) }),
}));

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

// Enough of a WebGL 2 context for the probe (getParameter) and for three.js
// to get as far as its capabilities check, minus getShaderPrecisionFormat.
const contextWithoutShaderPrecision = () => ({
  getParameter: () => 0,
  getExtension: () => null,
  getSupportedExtensions: () => [],
  getContextAttributes: () => ({ alpha: true, antialias: true }),
});

// The probe's getContext works; every later one, three.js's included, gets
// null, so three.js throws "Error creating WebGL context."
const contextForTheProbeOnly = () => {
  let probed = false;
  return (kind) => {
    if (kind !== "webgl2" || probed) return null;
    probed = true;
    return contextWithoutShaderPrecision();
  };
};

const STUDIO_FALLBACK = "WebGL is needed for the live globe";
const EMBED_FALLBACK = "This browser doesn't support WebGL 2. Globestudio needs WebGL 2 to render the globe.";
const ERROR_CARDS = /Couldn’t load the globe view|Something went wrong/;

const renderStudio = async () => {
  const { default: App } = await import("../App.jsx");
  render(<App />);
};

const renderEmbed = async () => {
  window.history.replaceState(null, "", "/embed?look=default");
  const { EmbedView } = await import("../components/embed-view.jsx");
  const { RootErrorBoundary } = await import("../components/root-error-boundary.jsx");
  render(
    <RootErrorBoundary where="embed">
      <EmbedView />
    </RootErrorBoundary>,
  );
};

beforeEach(() => {
  __resetWebGLCacheForTests();
  analytics.errors = [];
  window.history.replaceState(null, "", "/");
  // React logs the errors its boundaries catch; the assertions below are
  // what matters, so keep the run's output readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.classList.remove("is-no-webgl");
  window.history.replaceState(null, "", "/");
});

describe("the studio", () => {
  it("shows the no WebGL fallback for a context without getShaderPrecisionFormat, and reports it once", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((kind) =>
      kind === "webgl2" ? contextWithoutShaderPrecision() : null,
    );
    await renderStudio();
    expect(await screen.findByRole("heading", { name: STUDIO_FALLBACK }, { timeout: 10_000 })).toBeTruthy();
    expect(document.body.classList.contains("is-no-webgl")).toBe(true);
    expect(screen.queryByText(ERROR_CARDS)).toBeNull();
    expect(analytics.errors).toEqual([
      { where: "webgl", msg: expect.stringMatching(/^no WebGL: .*getShaderPrecisionFormat is not a function/) },
    ]);
  }, 20000);

  it("shows the no WebGL fallback when the renderer gets no context after the probe did, and reports it once", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(contextForTheProbeOnly());
    await renderStudio();
    expect(await screen.findByRole("heading", { name: STUDIO_FALLBACK }, { timeout: 10_000 })).toBeTruthy();
    expect(document.body.classList.contains("is-no-webgl")).toBe(true);
    expect(screen.queryByText(ERROR_CARDS)).toBeNull();
    expect(analytics.errors).toEqual([{ where: "webgl", msg: "no WebGL: Error creating WebGL context." }]);
  }, 20000);

  it("shows the no WebGL fallback straight away when getContext returns null, and reports nothing", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    await renderStudio();
    expect(screen.getByRole("heading", { name: STUDIO_FALLBACK })).toBeTruthy();
    expect(document.body.classList.contains("is-no-webgl")).toBe(true);
    expect(analytics.errors).toEqual([]);
  }, 20000);
});

describe("/embed", () => {
  it("shows its no WebGL message for a context without getShaderPrecisionFormat", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((kind) =>
      kind === "webgl2" ? contextWithoutShaderPrecision() : null,
    );
    await renderEmbed();
    expect(await screen.findByText(EMBED_FALLBACK, {}, { timeout: 10_000 })).toBeTruthy();
    expect(screen.queryByText(ERROR_CARDS)).toBeNull();
  }, 20000);

  it("shows its no WebGL message when the renderer gets no context after the probe did", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(contextForTheProbeOnly());
    await renderEmbed();
    expect(await screen.findByText(EMBED_FALLBACK, {}, { timeout: 10_000 })).toBeTruthy();
    expect(screen.queryByText(ERROR_CARDS)).toBeNull();
  }, 20000);

  it("shows its no WebGL message when getContext returns null", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    await renderEmbed();
    expect(await screen.findByText(EMBED_FALLBACK)).toBeTruthy();
  }, 20000);
});
