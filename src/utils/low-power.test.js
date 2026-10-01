import { describe, expect, it } from "vitest";
import { createFrameRateWatch, isSoftwareRendererName } from "./low-power.js";

describe("isSoftwareRendererName", () => {
  it.each([
    ["ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0)), SwiftShader driver)"],
    ["Google SwiftShader"],
    ["llvmpipe (LLVM 15.0.7, 256 bits)"],
    ["Mesa softpipe"],
    ["ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)"],
    ["Software Rasterizer"],
  ])("flags %s", (name) => {
    expect(isSoftwareRendererName(name)).toBe(true);
  });

  it.each([
    ["ANGLE Metal Renderer: Apple M5 Max"],
    ["ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0, D3D11)"],
    ["ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"],
    ["Apple GPU"],
    [""],
    [null],
    [undefined],
  ])("leaves %s alone", (name) => {
    expect(isSoftwareRendererName(name)).toBe(false);
  });
});

// Feeds the watch one rAF tick every `stepMs` from `from` until `to`, and
// returns the time of the first tick that tripped it, or null.
const run = (watch, { from = 0, to, stepMs }) => {
  for (let now = from; now <= to; now += stepMs) {
    if (watch.tick(now)) return now;
  }
  return null;
};

describe("createFrameRateWatch", () => {
  it("trips at 0.5 fps once the grace period is over", () => {
    const watch = createFrameRateWatch({ minFps: 12, windowMs: 3000, graceMs: 5000 });
    const trippedAt = run(watch, { to: 60_000, stepMs: 2000 });
    expect(trippedAt).not.toBeNull();
    expect(trippedAt).toBeGreaterThan(5000);
    expect(trippedAt).toBeLessThanOrEqual(20_000);
  });

  it("trips at 0.2 fps, a frame every 5 s", () => {
    const watch = createFrameRateWatch();
    expect(run(watch, { to: 60_000, stepMs: 5000 })).not.toBeNull();
  });

  it("stays quiet at 30 fps and at the 60 Hz rAF rate of an idle globe", () => {
    const at30 = createFrameRateWatch();
    expect(run(at30, { to: 120_000, stepMs: 33 })).toBeNull();
    const at60 = createFrameRateWatch();
    expect(run(at60, { to: 120_000, stepMs: 16 })).toBeNull();
  });

  it("stays quiet at 15 fps, just above the threshold", () => {
    const watch = createFrameRateWatch();
    expect(run(watch, { to: 120_000, stepMs: 66 })).toBeNull();
  });

  it("ignores slow frames inside the grace period", () => {
    const watch = createFrameRateWatch({ graceMs: 5000 });
    // A slow first load: one frame a second for the first 5 s...
    expect(run(watch, { to: 4999, stepMs: 1000 })).toBeNull();
    // ...then the globe runs at 30 fps.
    expect(run(watch, { from: 5000, to: 60_000, stepMs: 33 })).toBeNull();
  });

  it("does not trip on one long stall in an otherwise smooth run", () => {
    const watch = createFrameRateWatch();
    expect(run(watch, { to: 20_000, stepMs: 16 })).toBeNull();
    // The main thread blocks for 6 s (a big export encoding, say)...
    expect(watch.tick(26_000)).toBe(false);
    // ...and then the loop is back at 60 Hz.
    expect(run(watch, { from: 26_016, to: 60_000, stepMs: 16 })).toBeNull();
  });

  it("starts over, grace period included, after a reset", () => {
    const watch = createFrameRateWatch();
    expect(run(watch, { to: 20_000, stepMs: 16 })).toBeNull();
    // The loop paused (tab hidden, scrolled away, hi-res capture) and came
    // back: the gap must not read as a slow frame, and the first frames
    // after the restart get the same grace as the first load.
    watch.reset();
    expect(run(watch, { from: 80_000, to: 84_000, stepMs: 1000 })).toBeNull();
    expect(run(watch, { from: 85_000, to: 140_000, stepMs: 16 })).toBeNull();
  });

  it("still trips when the loop restarts slow after a reset", () => {
    const watch = createFrameRateWatch();
    watch.reset();
    expect(run(watch, { from: 100_000, to: 160_000, stepMs: 2000 })).not.toBeNull();
  });
});
