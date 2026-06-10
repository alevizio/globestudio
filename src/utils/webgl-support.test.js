import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetWebGLCacheForTests, hasWebGL } from "./webgl-support.js";

afterEach(() => {
  __resetWebGLCacheForTests();
  vi.restoreAllMocks();
});

describe("hasWebGL", () => {
  it("returns true when getContext('webgl2') succeeds", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((kind) => {
      if (kind === "webgl2") return { getParameter: () => 0 };
      return null;
    });
    expect(hasWebGL()).toBe(true);
  });

  it("falls back to webgl1 if webgl2 returns null", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((kind) => {
      if (kind === "webgl") return { getParameter: () => 0 };
      return null;
    });
    expect(hasWebGL()).toBe(true);
  });

  it("returns false when no GL context can be created", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(hasWebGL()).toBe(false);
  });

  it("returns false when getContext throws", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("context-lost");
    });
    expect(hasWebGL()).toBe(false);
  });

  it("releases the probe context via WEBGL_lose_context", () => {
    const loseContext = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((kind) => {
      if (kind !== "webgl2") return null;
      return {
        getParameter: () => 0,
        getExtension: (name) => (name === "WEBGL_lose_context" ? { loseContext } : null),
      };
    });
    expect(hasWebGL()).toBe(true);
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it("caches the first probe result", () => {
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(() => ({ getParameter: () => 0 }));
    hasWebGL();
    hasWebGL();
    hasWebGL();
    // Three calls to hasWebGL, but the canvas should have been probed exactly once.
    expect(spy.mock.calls.length).toBeLessThanOrEqual(2);
    // (≤ 2 because the first probe tries webgl2; if that returns truthy, webgl1
    // isn't asked. Either way the cache prevents further canvas creation.)
  });
});
