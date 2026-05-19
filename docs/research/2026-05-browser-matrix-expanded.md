# Browser matrix beyond mobile

**Date:** 19 May 2026
**Sources consulted:** 5 Three.js forum threads + caniuse + Wikipedia
**Confidence:** Medium-High · the long-tail of GPU drivers remains an unknown
**Status:** Recommendations folded into [`docs/plans/accessibility-rollout.md`](../plans/accessibility-rollout.md) Phase 1

## Executive summary

The [mobile + Safari research](2026-05-mobile-safari-webgl.md)
covered iOS Safari + Android Chrome. This pass covers the
*desktop + secondary* landscape: Firefox, Edge, Samsung Internet,
older Chromium-based browsers, and the GPU-driver-level quirks that
WebGL2 still surfaces.

Headline: **Worlddots works on every major browser today**, but
shader compilation behavior can diverge subtly between
Direct3D (Windows Chrome/Edge), Metal (macOS/iOS Safari),
OpenGL (Linux/Firefox), and Vulkan/ANGLE backends. The
practical risk is shader cross-compilation edge cases — a GLSL
construct that compiles cleanly on Chrome/Windows may fail on
Safari/Metal.

The existing defensive code in
`globe-background.jsx` (webglcontextlost listener, adaptive DPR,
pointer-coarse DPR cap) already handles most of the failure modes.
The recommended improvements: add `WebGL.isWebGL2Available()` check
+ SVG fallback (already flagged in
[`accessibility-rollout.md`](../plans/accessibility-rollout.md))
and a feature-detection probe for the post-effects shader on first
load.

## Key findings

### Finding 1 — All major 2026 browsers support WebGL2 ✅

| Browser              | WebGL2 since | 2026 share |
| -------------------- | ------------ | ---------- |
| Chrome (desktop)     | 56 (2017)    | ~65% global |
| Chrome (Android)     | 58 (2017)    | included in above |
| Edge (Chromium)      | 79 (2020)    | ~5%        |
| Firefox              | 51 (2017)    | ~3%        |
| Safari (macOS)       | 15.2 (Dec 2021) | included in below |
| Safari (iOS)         | 15 (Sept 2021) | ~17%       |
| Samsung Internet     | 7.2          | ~3%        |
| Opera                | 43           | <1%        |

Global WebGL2 coverage: ~95% (per caniuse).

Sources:
- [Can I Use — WebGL 2.0](https://caniuse.com/webgl2) ✅
- [WebGL 2 Browser Compatibility report](https://www.testmuai.com/learning-hub/webgl-2-browser-compatibility/) ⚠️
- [Wikipedia — WebGL](https://en.wikipedia.org/wiki/WebGL) ✅

### Finding 2 — ANGLE backend differences are the real quirk surface ⚠️

The same WebGL2 call routes through different backends per OS:

- **Windows** Chrome/Edge → Direct3D 11 (via ANGLE)
- **macOS/iOS** Safari → Metal (native)
- **Linux** Firefox/Chrome → OpenGL
- **Android** Chrome → OpenGL ES / Vulkan

Each backend has shader-compilation quirks. A shader that compiles
on Chrome/Windows can fail on Safari/Metal. Practical implications
for Worlddots:

- Stick to ES 3.00 GLSL features that all backends support.
- Avoid driver-specific extensions (Worlddots doesn't use any).
- The post-effects fragment shader cascade is the highest-risk
  surface — it's a single giant shader with 18 effect branches.
- Test the post-effects shader on at least 3 OS/browser combos
  before any new effect ships.

Sources:
- [Three.js forum — Firefox vs Chromium vs Edge perf](https://discourse.threejs.org/t/firefox-vs-chromium-vs-edge-performance/24177) ⚠️
- [WebGL: supported browsers and troubleshooting — Soft8Soft](https://www.soft8soft.com/webgl-supported-browsers-and-troubleshooting/) ⚠️

### Finding 3 — Intel HD Graphics 3000 + older iGPUs are the long tail ⚠️

Some GPUs that handle WebGL 1 cannot run WebGL 2, with Intel HD
Graphics 3000 being the most cited example. On these devices,
`canvas.getContext("webgl2")` returns null no matter how new the
browser is.

User population is small (Intel HD 3000 ships in 2011-era hardware)
but real. The defensive `WebGL.isWebGL2Available()` check from
the accessibility plan covers them.

Sources:
- [TestMu AI — WebGL 2 Compatibility report](https://www.testmuai.com/learning-hub/webgl-2-browser-compatibility/) ⚠️

### Finding 4 — Firefox can outperform Chrome on Three.js ⚠️

A Three.js forum benchmark thread documented cases where Firefox's
WebGL pipeline outperforms Chrome's — particularly when Three.js
forces WebGL despite WebGPU being available. Suggests Firefox is a
solid target, not an afterthought.

For Worlddots, no action needed — just don't optimize *for* Chrome
to Firefox's detriment.

Sources:
- [Three.js forum — WebGL forceWebGL Chrome slower than Firefox](https://discourse.threejs.org/t/three-webgpu-js-with-forcewebgl-webgl-in-chrome-slower-than-webgl-in-firefox/82593) ⚠️

### Finding 5 — Samsung Internet quietly serves a real audience ✅

Samsung Internet ships on every Samsung Android device. Supports
WebGL2 since 7.2. Most behavior mirrors Chrome for Android (same
Blink engine), but has its own UA string and occasional rendering
quirks.

For Worlddots, the embed strategy means Samsung Internet shows up
whenever a Webflow / Framer site is viewed on a Samsung phone.
Worth a smoke test on a real device.

## Recommendations

1. **Add `WebGL.isWebGL2Available()` check** as flagged in
   [accessibility plan](../plans/accessibility-rollout.md) Phase 1.
   This single check covers the Intel HD 3000 long tail and any
   legitimately-no-WebGL environment.
2. **Add `?source=` analytics on the embed route** (already in the
   integrations plan) so we know which browsers actually use
   embeds. Reactive vs proactive testing.
3. **Add a manual cross-browser smoke test to the release
   checklist** — load `worlddots.app` on:
   - Chrome (macOS + Windows)
   - Firefox (macOS or Linux)
   - Safari (macOS)
   - Edge (Windows)
   - Mobile Safari (real iPhone)
   - Chrome Android (real device)
   - Optional: Samsung Internet (real Samsung device)
   - Optional: Firefox Android
4. **No code changes specifically for Firefox / Edge.** Both already
   work. Don't over-engineer.
5. **Document the Intel HD 3000 ceiling** in the README — "Requires
   WebGL 2 support, available on most browsers since 2017."

## Sources

1. [Can I Use — WebGL 2.0](https://caniuse.com/webgl2) ✅
2. [WebGL 2 Browser Compatibility — TestMu AI](https://www.testmuai.com/learning-hub/webgl-2-browser-compatibility/) ⚠️
3. [Three.js forum — Firefox vs Chromium vs Edge](https://discourse.threejs.org/t/firefox-vs-chromium-vs-edge-performance/24177) ⚠️
4. [Three.js forum — Rendering bug Chrome Android](https://discourse.threejs.org/t/rendering-bug-in-chrome-android-ok-in-chrome-desktop-and-firefox-android/40262) ⚠️
5. [Three.js forum — WebGL forceWebGL Chrome vs Firefox perf](https://discourse.threejs.org/t/three-webgpu-js-with-forcewebgl-webgl-in-chrome-slower-than-webgl-in-firefox/82593) ⚠️
6. [WebGL supported browsers — Soft8Soft](https://www.soft8soft.com/webgl-supported-browsers-and-troubleshooting/) ⚠️
7. [Wikipedia — WebGL](https://en.wikipedia.org/wiki/WebGL) ✅
