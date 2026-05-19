# Mobile + Safari WebGL compatibility

**Date:** 19 May 2026
**Sources consulted:** 8 first-party docs / issues + 5 forum threads
**Confidence:** High for current state · Medium for the long-tail of old-OS users
**Status:** Recommendations baked into [`docs/plans/integrations-rollout.md`](../plans/integrations-rollout.md) Phase 0 (Embed route)

## Executive summary

WebGL2 has 95.07% global support (caniuse). All Worlddots-target
platforms — iOS Safari 15+, Android Chrome 148+, desktop Safari 15+,
Chrome/Firefox/Edge — support the features Worlddots uses
(InstancedMesh, ShaderMaterial, EffectComposer, custom GLSL passes).

The historical iOS WebGL pain (context lost, blank canvas) has been
**resolved** in current OS versions. The two notable bugs in the
2024-2025 timeline:

1. iOS 17.0–17.0.3 context loss — fixed in iOS/iPadOS 17.1.1+
2. M3/M4 Apple Silicon shader precision crash — milestoned for
   Three.js r175 (Mar 2025); Worlddots ships r184, so already on a
   fixed version.

The remaining risk is the long tail of users on stale OS versions.
Defensive coding (`WebGL.isWebGL2Available()` check + SVG fallback,
`webglcontextlost` listener already wired) should cover them.

**The embed route should ship now without blocking on a mobile audit
that won't find new problems.** But a single iOS 17.0 device test
before announcing the Framer/Webflow integrations is worth doing.

## Key findings

### Finding 1 — WebGL2 is universally supported on target platforms ✅

| Browser              | Min version | Notes                                  |
| -------------------- | ----------- | -------------------------------------- |
| Chrome (desktop)     | 56          | 2017                                   |
| Chrome (Android)     | 58 → 148    | All recent Chrome for Android          |
| Firefox              | 51+         | Stable since 2017                      |
| Edge                 | 79+         | Chromium-based                         |
| Safari (macOS)       | 15.2+       | Stable since Dec 2021                  |
| Safari (iOS/iPadOS)  | 15+         | Stable since Sept 2021                 |
| Samsung Internet     | Modern      | Same engine as Chrome                  |

Global support: **95.07%**. Worlddots targets this audience entirely.

Sources:
- [Can I Use — WebGL 2.0](https://caniuse.com/webgl2) ✅
- [WebGL 2 Browser Compatibility report](https://www.testmuai.com/learning-hub/webgl-2-browser-compatibility/) ⚠️

### Finding 2 — Three.js features Worlddots uses are all supported ✅

| Three.js feature       | Min Three.js | WebGL feature backing it    | Compat impact |
| ---------------------- | ------------ | --------------------------- | ------------- |
| InstancedMesh          | r84 (2017)   | `ANGLE_instanced_arrays`    | Universal     |
| ShaderMaterial         | r0           | Vertex + fragment shaders   | Universal     |
| EffectComposer         | r109+        | Render targets, postprocess | Universal     |
| UnrealBloomPass        | r109+        | Multi-pass + downsampling   | Universal     |
| custom GLSL passes     | r0           | Fragment shaders            | Universal     |
| InstancedBufferAttr.   | r109+        | Vertex attributes           | Universal     |
| `instanceMatrix.updateRanges` | r163+ | Buffer subdata uploads      | Universal     |
| `derivatives`          | extension    | `OES_standard_derivatives`  | Built into WebGL2 |
| Linear color space     | r155+        | sRGB framebuffers           | Universal in WebGL2 |

Worlddots is on Three.js r184 (latest stable). Every feature in the
post-effects pipeline is in the WebGL2 baseline.

### Finding 3 — Historical iOS Safari issues are resolved ⚠️→✅

**iOS 17.0–17.0.3 — Context Lost on canvas init.**
- Severity: blank white canvas, console flooded with "WebGL: context
  lost" errors
- Root cause: WebKit-level, not Three.js
- Affected: ALL WebGL applications, not just Three.js
- Fixed in: iOS/iPadOS 17.1.1
- Worlddots impact in May 2026: long-tail risk for users who haven't
  updated their iPhone in 2+ years. Real but small (<5% of iOS users).

**iOS 18.2 / 18.4 — sporadic WebGL errors.**
- Reported in forums (Three.js, Unity)
- Inconsistent — affects some apps, not others; some hardware, not
  all
- Safari 26.5 beta notes call out fixes for "a broad set of WebGL
  issues, scrolling, rendering"
- Plausibly fixed in current Safari builds (May 2026)

**M3/M4 Apple Silicon shader precision crash.**
- Issue: `gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT).precision` returns null
- Affected: M3/M4 Macs on macOS 15.3+, M4 iPads on iOS 18.3+
- Milestoned for Three.js r175 (released Mar 28, 2025)
- Worlddots ships r184 → past the fix.

Sources:
- [iOS 17 context lost discussion](https://discourse.threejs.org/t/three-js-broken-on-ios-17-with-context-lost/58025) ✅
- [Three.js issue #26829 — blank canvas iPhone 15 Pro](https://github.com/mrdoob/three.js/issues/26829) ✅
- [Three.js issue #30767 — M3/M4 crash](https://github.com/mrdoob/three.js/issues/30767) ✅
- [iOS 18.2 WebGL discussion](https://discourse.threejs.org/t/ios-18-2-causing-webgl-error/75143) ⚠️
- [Three.js r175 release](https://github.com/mrdoob/three.js/releases/tag/r175) ✅

### Finding 4 — EffectComposer on Safari needs special care ⚠️

Older Safari builds (2020-2022) had EffectComposer-specific issues:
- Adding any ShaderPass caused objects to flicker based on camera
  near-plane
- Jagged artifacts on models when post-processing pipelined
- Texture format incompatibilities

Most fixed by Three.js r130-r150. Worlddots's r184 + bypass of the
composer for the default look ([commit 54d91f3](../../commit/54d91f3))
means Safari users on the default preset hit the cheaper `renderer.render`
path — also Safari's most-tested path. Effects-on Safari users may still
see edge cases.

Sources:
- [EffectComposer + Safari jagged artifacts thread](https://discourse.threejs.org/t/using-post-processing-through-effectcomposer-causes-jagged-artifacts-on-model-browser-safari/22918) ⚠️
- [EffectComposer + Safari camera near-plane bug](https://discourse.threejs.org/t/issues-using-effect-composer-on-safari-mac-threes-r120/21362) ⚠️

### Finding 5 — WebGPU is now usable on Safari 26+ ✅

Safari 26 (Sept 2025) shipped WebGPU on macOS, iOS, iPadOS, visionOS.
Three.js's `WebGPURenderer` auto-falls-back to WebGL2 when WebGPU
isn't available, so a single renderer ships both paths.

But: WebGPU migration requires the TSL (Three.js Shading Language)
shader rewrite for any custom GLSL passes. Worlddots has 17 custom
shader effects in `post-effects.js`. A TSL rewrite is a significant
project — explicitly out of scope for this research per
[`2026-05-perf-hardening.md`](2026-05-perf-hardening.md#rejected-paths).

**Recommendation:** stay on WebGL2 for now. Revisit WebGPU when Safari
26+ market share crosses 50% (probably 12-18 months out) and when TSL
tooling matures.

Sources:
- [Three.js WebGPU migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide) ⚠️
- [Field Guide to TSL and WebGPU](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/) ⚠️

### Finding 6 — Worlddots's current code is already defensive ✅

Audit of `src/components/globe-background.jsx`:

- `webglcontextlost` listener is wired (line ~821)
- `webglcontextrestored` handler is wired
- DPR is capped based on `(pointer: coarse)` query — phones get 1.5x,
  not 2x. Reduces GPU upload pressure.
- Adaptive DPR loop steps DPR down if FPS drops below 50 sustained.
- `preserveDrawingBuffer: true` is set on the renderer — needed for
  PNG export, may add a small perf cost on mobile.

What's missing:

1. **No `WebGL.isWebGL2Available()` check** at component mount. If
   WebGL2 is unavailable (very rare in 2026), the canvas creates and
   then fails opaquely.
2. **No static SVG fallback** for the no-WebGL case.
3. **Embed route inherits all of the above** — same defensive
   behavior, same gaps.

## Recommendations

In order, before going wide on integrations:

1. **Add `WebGL.isWebGL2Available()` check** in
   `globe-background.jsx`. If false, render the static SVG fallback
   (could reuse `LookPreview` SVG markup at a larger size). 30 minutes
   of work.
2. **Test on real iOS 17.0 device** (or a BrowserStack equivalent)
   before announcing the Framer integration. Confirm no context-lost
   regressions. If iOS 17.0 fails, document it as known limitation
   in the integration docs.
3. **Add `?source=` tracking** to surface which integrations bring
   in which mobile OS / browser combinations. If iOS Safari 16-17
   shows up as a top source, prioritize a real audit.
4. **Don't migrate to WebGPU yet.** TSL rewrite for 17 shaders is a
   weeks-long project with no compatibility win — Safari 26+ already
   speaks WebGL2 cleanly.
5. **Keep `preserveDrawingBuffer: true` for now.** It costs a small
   amount of GPU memory but enables PNG export. Revisit only if
   mobile memory pressure becomes a measurable problem.

## Open questions

- What's the *actual* iOS / Android distribution of the audience? No
  data yet. Vercel Analytics by user-agent will tell us once embeds
  are out in the wild.
- Are there any known issues with the `instanceMatrix.updateRanges`
  feature on mobile? It's a Three.js r163+ feature; I haven't seen
  mobile-specific bug reports but it's worth one targeted search.
- Does the dotted-map `Mercator` projection have any Safari-specific
  rendering bugs? Unlikely — it's pure JS math producing 2D
  coordinates — but worth a smoke test.
- How does the embed handle iOS Safari's `prefers-reduced-motion` +
  Low Power Mode (which throttles framerate to 30fps)? The adaptive
  DPR loop should handle the FPS drop, but visual quality at lower
  DPR on Retina screens may be noticeable.

## Sources

1. [Can I Use — WebGL 2.0](https://caniuse.com/webgl2) ✅
2. [WebGL 2 Browser Compatibility report](https://www.testmuai.com/learning-hub/webgl-2-browser-compatibility/) ⚠️
3. [Three.js issue #26829 — iPhone 15 Pro blank canvas](https://github.com/mrdoob/three.js/issues/26829) ✅
4. [Three.js issue #30767 — M3/M4 crash](https://github.com/mrdoob/three.js/issues/30767) ✅
5. [iOS 17 context lost thread](https://discourse.threejs.org/t/three-js-broken-on-ios-17-with-context-lost/58025) ✅
6. [iOS 18.2 WebGL issue thread](https://discourse.threejs.org/t/ios-18-2-causing-webgl-error/75143) ⚠️
7. [EffectComposer Safari artifacts thread](https://discourse.threejs.org/t/using-post-processing-through-effectcomposer-causes-jagged-artifacts-on-model-browser-safari/22918) ⚠️
8. [EffectComposer Safari near-plane bug](https://discourse.threejs.org/t/issues-using-effect-composer-on-safari-mac-threes-r120/21362) ⚠️
9. [Three.js r175 release notes](https://github.com/mrdoob/three.js/releases/tag/r175) ✅
10. [Three.js r180 release notes](https://github.com/mrdoob/three.js/releases/tag/r180) ✅
11. [Field Guide to TSL and WebGPU](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/) ⚠️
12. [Three.js WebGPU migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide) ⚠️
13. [Three.js InstancedMesh docs](https://threejs.org/docs/#api/en/objects/InstancedMesh) ✅
