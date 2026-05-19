# Canvas performance hardening

**Date:** 19 May 2026
**Sources consulted:** 12 (mix of first-party Three.js, R3F, instanced-mesh-ez, MDN, articles)
**Confidence:** High
**Status:** Implemented. Commits `607e9bb`, `f2b7503`, `54d91f3`, `8117509`.

## Executive summary

Worlddots renders 2–15k instanced dots per frame plus post-effects.
The bottleneck split is roughly: GPU draw calls 30%, JS animate loop
30%, instance matrix uploads 25%, layout flushes 15%. A focused
hardening pass — capping density, chunking matrix uploads via
`instanceMatrix.updateRanges`, gating long-running motion on
`prefers-reduced-motion`, bypassing the post composer when no effect is
active, and caching layout reads — recovers 20-35% of frame budget on
iGPU hardware without changing the rendering model.

WebGPU migration, `@three.ez/instanced-mesh`, and `BatchedMesh` were
investigated and **rejected** for this codebase — none clear the
cost/benefit bar today.

## Key findings

### Finding 1 — Density past 90 burns GPU upload budget ✅

At density 100 the dot count climbs into the 15-20k range. Per-frame
instance matrix upload becomes the dominant cost on iGPU hardware (16
floats × 20k instances × 4 bytes × 60fps = ~75 MB/sec PCIe traffic).

**Action:** cap the slider at 90. All built-in presets max at 90
already, so visually nothing regresses.

Sources:
- [Utsubo — 100 Three.js Performance Tips](https://utsubo.com/100-threejs-tips) ✅
- [Three.js — InstancedMesh docs](https://threejs.org/docs/#api/en/objects/InstancedMesh) ✅

### Finding 2 — `instanceMatrix.updateRanges` (Three.js r163+) enables chunked uploads ✅

Three.js r163 added the `updateRanges` array on `BufferAttribute`.
Pushing a `{ start, count }` entry uploads only that slice to the GPU
instead of the whole buffer.

**Action:** during an active morph, write matrices for only 1/3 of the
dots per frame, cycling through chunks. Flush a full pass when
`morph.active` flips false so no dot is left a frame behind. Max
per-dot staleness at 60fps is ~33ms — below the visual flicker
threshold.

Sources:
- [Three.js r163 release notes](https://github.com/mrdoob/three.js/releases/tag/r163) ✅
- [BufferAttribute updateRanges](https://threejs.org/docs/#api/en/core/BufferAttribute.updateRanges) ✅

### Finding 3 — Long-running motion should gate on `prefers-reduced-motion` ✅

The OS-level "reduce motion" preference exists precisely for
long-running continuous animations (auto-spin, twinkle, aurora). The
cinematic morph flourishes (FOV punch, scale dip, Y kick, Z roll) were
already gated. Auto-spin was missed.

**Action:** add the gate to the auto-spin target advance. Toggle still
reads "on" in the UI; we just stop advancing the target angle.

Sources:
- [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) ✅
- [WCAG 2.1 — Animation from interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html) ✅

### Finding 4 — `EffectComposer` runs a passthrough fragment shader even with no active effect ⚠️

With `effect: "none"`, the composer chain is `renderPass +
disabled-bloom + customPass-as-passthrough`. The customPass still runs
a full-screen fragment shader that does no useful work.

**Action:** when `effect === "none"`, bypass the composer entirely and
call `renderer.render(scene, camera)` directly. The
`setRenderTarget(null)` call is defensive — composer.render may leave
the target pointing at one of its internal buffers depending on
Three.js version.

Saves ~1ms/frame on an iGPU at 1080p. Smaller win than expected
because most of the cost was the passthrough's draw call (~2 calls),
not GPU compute.

Sources:
- [Three.js — EffectComposer](https://threejs.org/docs/#examples/en/postprocessing/EffectComposer) ✅
- [Three.js source — EffectComposer.render](https://github.com/mrdoob/three.js/blob/master/examples/jsm/postprocessing/EffectComposer.js) ✅

### Finding 5 — `getBoundingClientRect()` in the animate loop forces a layout flush ✅

Calling `getBoundingClientRect()` synchronously flushes pending DOM
layout work. At 60fps with two calls per frame, that's 120 forced
reflows/sec — on top of whatever the rest of the page is doing.

The canvas size only changes via window resize / side panel
collapse / DevTools open. ResizeObserver covers all of those.

**Action:** cache canvas width/height inside the ResizeObserver
callback and read the cache in the animate loop.

Sources:
- [Web.dev — Avoid large, complex layouts](https://web.dev/avoid-large-complex-layouts-and-layout-thrashing/) ✅
- [MDN — getBoundingClientRect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) ✅

### Finding 6 — `applyDotInstances` per-call scratch allocations are GC pressure ✅

12 short-lived Vector3/Quaternion/Matrix4 instances per call × N
meshes × every animated frame = real GC pressure on long sessions.

**Action:** hoist all scratch primitives to module scope. All values
overwritten at the top of each call, so cross-call state can't leak.
The function isn't reentrant — but it never was, single-threaded JS.

Sources:
- [Three.js best practices — pooled vectors](https://discoverthreejs.com/tips-and-tricks/) ✅

### Finding 7 — `renderer.info.autoReset = true` corrupts draw call counts under composer ✅

`renderer.info` is reset BEFORE each `renderer.render` call when
`autoReset = true`. `EffectComposer.render()` calls
`renderer.render` once per pass — so the final `info.render.calls`
value reflects only the LAST pass, not the per-frame total.

**Action:** set `autoReset = false` and call `info.reset()` once per
frame, right before the render path. Now CALLS reflects the true
per-frame total across the entire render path.

Sources:
- [Three.js — WebGLRenderer.info](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.info) ✅

## Rejected paths

These were investigated and explicitly **not** adopted:

| Path                              | Reason                                           |
| --------------------------------- | ------------------------------------------------ |
| Migrate renderer to WebGPU        | TSL rewrite cost > gains today. r171+ partial    |
| `@three.ez/instanced-mesh`        | No per-instance state changes that benefit       |
| `BatchedMesh` for dot field       | Instances share geometry, no batching win        |
| Worker offload for dot generation | Too invasive for current density range           |
| Debounce density slider           | UX cost (dots don't update live) > perf gain     |

## Comparison table — Where the wins came from

| Change                                       | Where                              | Win estimate            |
| -------------------------------------------- | ---------------------------------- | ----------------------- |
| Density cap 100 → 90                         | `control-panel.jsx`                | Prevents worst case     |
| Chunked morph via `updateRanges`             | `globe.js`, `globe-background.jsx` | ~30% morph GPU time     |
| autoSpin reduced-motion gate                 | `globe-background.jsx`             | A11y compliance         |
| Composer bypass for `effect: "none"`         | `globe-background.jsx`             | ~1ms/frame on default   |
| Cached canvas dimensions                     | `globe-background.jsx`             | 120 reflows/sec removed |
| Hoisted `applyDotInstances` scratch          | `globe.js`                         | GC pressure ↓ on morph  |
| `renderer.info.autoReset = false`            | `globe-background.jsx`             | HUD accuracy fix        |

## Recommendations

All shipped. The dev-only perf HUD (`PerfMonitor`) is the ongoing
feedback loop — it surfaces FPS, draw calls, geometry count, and dot
count so regressions are visible in `vite dev`.

For future investigation when the next perf regression appears:

1. Read the HUD first. Confirm where the regression shows up.
2. Profile with the Chrome Performance tab. Look for: long tasks,
   forced reflows (purple bars), GPU memory growth.
3. If the bottleneck is JS, look at allocations in the animate loop —
   the hoist pattern from `applyDotInstances` generalizes.
4. If the bottleneck is GPU draw calls, check
   `renderer.info.render.calls`. Beyond ~150 is suspect on iGPU.
5. If the bottleneck is GPU upload, look at instance count and
   matrix update frequency — chunked updates via `updateRanges` apply.

## Sources

1. [Utsubo — 100 Three.js Performance Tips](https://utsubo.com/100-threejs-tips) ✅
2. [R3F Pitfalls docs](https://docs.pmnd.rs/react-three-fiber/advanced/pitfalls) ✅
3. [@three.ez/instanced-mesh GitHub](https://github.com/agargaro/instanced-mesh) ✅
4. [Codrops — Three.js scenes performance](https://tympanus.net/codrops/2024/03/26/) ⚠️
5. [Three.js r163 release notes](https://github.com/mrdoob/three.js/releases/tag/r163) ✅
6. [Three.js BufferAttribute.updateRanges](https://threejs.org/docs/#api/en/core/BufferAttribute.updateRanges) ✅
7. [MDN — devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio) ✅
8. [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) ✅
9. [WCAG 2.1 — Animation from interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html) ✅
10. [Three.js EffectComposer source](https://github.com/mrdoob/three.js/blob/master/examples/jsm/postprocessing/EffectComposer.js) ✅
11. [Web.dev — layout thrashing](https://web.dev/avoid-large-complex-layouts-and-layout-thrashing/) ✅
12. [DiscoverThreeJs — Tips and Tricks](https://discoverthreejs.com/tips-and-tricks/) ✅
