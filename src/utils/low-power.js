// Low power mode: the decisions behind it, kept pure so they can be unit
// tested. globe-background.jsx feeds them and App.jsx acts on the result by
// dropping the six-layer CSS drop-shadow halo on the canvas, which is by far
// the costliest thing to composite when Chrome has no GPU to do it (0.1 to
// 0.2 fps with it, about 3.3 fps without it, in the CI image's SwiftShader).

// WebGL renderer names (WEBGL_debug_renderer_info) of software rasterizers:
// SwiftShader (Chrome's fallback), llvmpipe and softpipe (Mesa) and the
// Microsoft Basic Render Driver (WARP, Windows with no usable GPU driver).
// A real but slow GPU (an old Intel HD) is hardware, so only the frame rate
// watch below can catch that one.
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|basic render driver|software/i;

export const isSoftwareRendererName = (name) => SOFTWARE_RENDERER.test(name ?? "");

// Trips when the render loop's rAF rate stays under `minFps` for two full
// `windowMs` windows in a row. It counts rAF ticks, not drawn frames, so the
// ~30 fps idle cap and the reduced motion frame skip can't read as slow.
// Ticks in the first `graceMs` after a start are ignored (shader compiles,
// data loads). Two windows rather than one so a single long main thread
// stall on a fast machine (a big export encoding, say) can't trip it: a
// stall slows only the window it ends in. Call reset() whenever the loop
// pauses, so the gap until it restarts isn't read as one slow frame; the
// grace period then applies again.
export const createFrameRateWatch = ({ minFps = 12, windowMs = 3000, graceMs = 5000 } = {}) => {
  let started = false;
  let windowStart = 0;
  let frames = 0;
  let slowWindows = 0;
  return {
    reset: () => {
      started = false;
    },
    tick: (now) => {
      if (!started) {
        started = true;
        windowStart = now + graceMs;
        frames = 0;
        slowWindows = 0;
        return false;
      }
      if (now < windowStart) return false;
      frames += 1;
      const elapsed = now - windowStart;
      if (elapsed < windowMs) return false;
      slowWindows = (frames * 1000) / elapsed < minFps ? slowWindows + 1 : 0;
      windowStart = now;
      frames = 0;
      return slowWindows > 1;
    },
  };
};
