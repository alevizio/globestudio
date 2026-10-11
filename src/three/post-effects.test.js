import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  BADTV_SWAY_RATE,
  FRAGMENT_SHADER,
  GLITCH_REROLLS_PER_SECOND,
  scalePixelUniforms,
  updatePostEffects,
} from "./post-effects.js";

// The uniforms updatePostEffects writes, without a WebGL composer behind them.
const fakeHandle = () => ({
  bloomPass: {},
  customPass: {
    uniforms: {
      uResolution: { value: new THREE.Vector2(1200, 800) },
      uTime: { value: 0 },
      uEffect: { value: 0 },
      uIntensity: { value: 0 },
      uSplit: { value: 0 },
      uGrain: { value: 0 },
      uScanlines: { value: 0 },
      uCellSize: { value: 0 },
      uThreshold: { value: 0 },
      uWarp: { value: 0 },
      uMotion: { value: 0 },
      uInk: { value: new THREE.Vector3() },
    },
  },
});

describe("scalePixelUniforms", () => {
  it("keeps the preview's cells per image when a PNG renders at a higher pixel ratio", () => {
    const handle = fakeHandle();
    updatePostEffects(handle, { effect: "halftone", cellSize: 14, split: 7, intensity: 60 }, 0);
    const u = handle.customPass.uniforms;
    // uResolution is the CSS size in the preview, whatever the screen's
    // pixel ratio, and the CSS size times the export ratio in a capture.
    const displayWidth = 600;
    const exportRatio = 4; // Ultra
    const previewCells = displayWidth / u.uCellSize.value;

    const restore = scalePixelUniforms(u, exportRatio);
    expect((displayWidth * exportRatio) / u.uCellSize.value).toBe(previewCells);
    expect(u.uCellSize.value).toBe(56);
    expect(u.uSplit.value).toBe(28);
    // Unitless uniforms are left alone.
    expect(u.uIntensity.value).toBeCloseTo(0.6);

    restore();
    expect(u.uCellSize.value).toBe(14);
    expect(u.uSplit.value).toBe(7);
  });

  it("leaves Aurora's cell size alone: it sets band frequency in uv units", () => {
    const handle = fakeHandle();
    updatePostEffects(handle, { effect: "aurora", cellSize: 14, split: 7 }, 0);
    const u = handle.customPass.uniforms;
    const restore = scalePixelUniforms(u, 4);
    expect(u.uCellSize.value).toBe(14);
    expect(u.uSplit.value).toBe(28);
    restore();
    expect(u.uSplit.value).toBe(7);
  });

  it("leaves cells alone for a Draft (1x) capture on any screen", () => {
    const u = fakeHandle().customPass.uniforms;
    u.uCellSize.value = 14;
    scalePixelUniforms(u, 1);
    expect(u.uCellSize.value).toBe(14);
  });
});

// WCAG 2.3.1: nothing may flash more than three times in any one second.
describe("flash safety", () => {
  const glitchBody = FRAGMENT_SHADER.slice(FRAGMENT_SHADER.indexOf("vec4 glitchPass"), FRAGMENT_SHADER.indexOf("vec4 edgePass"));

  it("re-rolls Glitch's bands at most three times a second, at any motion", () => {
    const { min, max } = GLITCH_REROLLS_PER_SECOND;
    expect(max).toBeLessThanOrEqual(3);
    expect(min).toBeGreaterThan(0);
    expect(glitchBody).toContain(`float seed = floor(uTime * mix(${min.toFixed(1)}, ${max.toFixed(1)}, uMotion));`);
    // The seed is the only clock: the bands, the colour split, the grain
    // and the inversion blip all change only when it does.
    expect(glitchBody.match(/uTime/g)).toHaveLength(1);
  });

  it("sways Bad TV's rows slower than the rate that reached three flashes a second", () => {
    expect(BADTV_SWAY_RATE).toBeLessThan(3);
    expect(FRAGMENT_SHADER).toContain(`${BADTV_SWAY_RATE.toFixed(1)} * t + jump`);
  });
});
