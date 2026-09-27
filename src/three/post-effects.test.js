import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { scalePixelUniforms, updatePostEffects } from "./post-effects.js";

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
    const displayWidth = 600;
    const previewRatio = 2;
    const exportRatio = 4; // Ultra
    const previewCells = (displayWidth * previewRatio) / u.uCellSize.value;

    const restore = scalePixelUniforms(u, exportRatio / previewRatio);
    expect((displayWidth * exportRatio) / u.uCellSize.value).toBe(previewCells);
    expect(u.uCellSize.value).toBe(28);
    expect(u.uSplit.value).toBe(14);
    // Unitless uniforms are left alone.
    expect(u.uIntensity.value).toBeCloseTo(0.6);

    restore();
    expect(u.uCellSize.value).toBe(14);
    expect(u.uSplit.value).toBe(7);
  });

  it("shrinks cells for a Draft capture below the screen's pixel ratio", () => {
    const u = fakeHandle().customPass.uniforms;
    u.uCellSize.value = 14;
    scalePixelUniforms(u, 1 / 2);
    expect(u.uCellSize.value).toBe(7);
  });
});
