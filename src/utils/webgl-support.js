// Probes once whether the current browser/GPU can create a WebGL context.
// Cached so the second call is free — used both for the pre-flight check
// (decides whether to load Three.js at all) and by the ErrorBoundary copy
// (so we can word the fallback differently when we know WebGL is the
// underlying issue vs some other crash).
//
// Why probe instead of rely on the ErrorBoundary alone:
//
// 1. Avoids downloading the 142KB-gzipped Three.js bundle for users whose
//    GPU/browser can't use it (sandboxed iframes, headless mode, GPUs in
//    blocklists, --disable-webgl, low-spec devices, etc).
//
// 2. No FOUC of a half-mounted canvas before the boundary catches —
//    static fallback paints immediately.
//
// We probe BOTH webgl2 and webgl1, since some environments only ship
// the v1 context. Three.js itself prefers v2 but falls back to v1.

let cached = null;

export const hasWebGL = () => {
  if (cached !== null) return cached;
  if (typeof window === "undefined" || typeof document === "undefined") {
    cached = false;
    return cached;
  }
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    cached = Boolean(gl && typeof gl.getParameter === "function");
    // Release the probe's context right away — browsers cap live WebGL
    // contexts per page. The canvas is detached and never reused, so
    // losing the context is safe (unlike the flow-backdrop.jsx case).
    gl?.getExtension?.("WEBGL_lose_context")?.loseContext();
  } catch (_error) {
    cached = false;
  }
  return cached;
};

// Test-only: lets unit tests reset the cache between probe scenarios.
export const __resetWebGLCacheForTests = () => {
  cached = null;
};
