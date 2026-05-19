# Shader effects rollout plan

**Status:** Draft
**Date opened:** 19 May 2026
**Owner:** Alejandro
**Research basis:** [`docs/research/2026-05-shader-effect-candidates.md`](../research/2026-05-shader-effect-candidates.md)

## Goal

Add 3-5 high-leverage shader effects to the Worlddots library
covering the design-aesthetic gaps surfaced in the candidate
research: **true dithering**, **print aesthetics**, **iridescent
material**. Maintain the single-pass fragment-shader architecture so
the perf budget stays intact.

## Non-goals

- Not adding heavy multi-pass effects (fluid distortion, raymarching).
- Not building a generic "shader playground" UI for users to write
  GLSL inline — keep the design surface to presets + sliders.
- Not refactoring `post-effects.js`. New effects extend the existing
  `EFFECT_INDEX` cascade, no architecture changes.
- Not rebuilding the chip preview SVG library. Each new effect adds
  one new chip preview function in `look-preview.jsx`.

## Phases

Each phase ships a single new effect from start to commit. Phases are
roughly independent — phase 2 doesn't block phase 3.

---

### Phase 1 — Bayer dither (~6 hours)

Highest-leverage add. Distinct from the existing halftone, single
pass, low complexity. Establishes the pattern for the rest.

#### Tasks

- [ ] Add `bayer` entry to `EFFECT_INDEX` in
      `src/three/post-effects.js`. Pick the next unused index (18).
- [ ] Add `bayer` to `shaderEffectOptions` in
      `src/config/shader-effects.js` with label "Bayer dither".
- [ ] Add `bayer` to `effectsWithCellSize` (matrix tile size 4/8/16)
      and `effectsWithMotion` (no — dither is static).
- [ ] Add `effectPresets.bayer = { intensity: 80, cellSize: 4, ... }`
      defaults.
- [ ] Add the GLSL `bayerPass(vec2 uv)` function inside the fragment
      shader template literal. Use the 4×4 BAYER constant matrix.
- [ ] Add the cascade branch
      `else if (uEffect > 17.5 && uEffect < 18.5) { color = bayerPass(vUv); }`
- [ ] Add a `Bayer` look preset to `src/data/look-presets.js`
      between `Halftone` and `Pixel` (similar density / shape /
      effect tuning). `effect: "bayer", cellSize: 4, intensity: 78`.
- [ ] Add `renderBayerOverlay()` to `src/components/look-preview.jsx`
      so the chip preview shows the characteristic 4×4 grid.
- [ ] Bake a `public/looks/bayer.png` preview image once it looks
      right (use the workflow doc `public/looks/README.md`).
- [ ] Wire `previewImage: "/looks/bayer.png"` on the preset.
- [ ] Run `npm test` + `npm run build`. Manual: switch between Halftone
      and Bayer to confirm visual distinction.
- [ ] Commit, deploy.

#### Acceptance

- Bayer chip is visible in the looks bar.
- Selecting it renders a binary black/white 4×4 grid threshold pattern.
- `cellSize` slider (4, 8, 12, 16) changes tile size live.
- Bayer chip's preview image is visually distinct from Halftone's.
- Tests + build pass.

---

### Phase 2 — Iridescent / foil (~1 day)

Material category, adds modern designer appeal. Builds on the same
infrastructure pattern as Phase 1.

#### Tasks

- [ ] Same plumbing as Phase 1: add `holographic` to `EFFECT_INDEX`,
      `shaderEffectOptions`, motion/cellSize sets, defaults.
- [ ] GLSL pass: Fresnel-driven HSV cycle + procedural sparkle (see
      [research doc](../research/2026-05-shader-effect-candidates.md#iridescent--foil) for sketch).
- [ ] Reduced-motion gating: when `prefersReducedMotion` is true, set
      `uTime` to 0 for the hue cycle. Static iridescence still looks
      good.
- [ ] Add `Holographic` look preset between `Metal` and `Pencil`.
      Tune: `effect: "holographic", intensity: 70, motion: 30`.
- [ ] Chip preview overlay that captures the iridescent rainbow gradient.
- [ ] Bake `public/looks/holographic.png`.
- [ ] Measure GPU cost via dev HUD. If `(pointer: coarse)` devices
      drop below 50 FPS, gate the procedural sparkle off on mobile.
- [ ] Tests + build + commit + deploy.

#### Acceptance

- Holographic chip in looks bar, between Metal and Pencil.
- Selecting it renders a pearlescent surface with hue shifting from
  edges to interior.
- Hue animates over time (paused under prefers-reduced-motion).
- Mobile (coarse pointer) maintains 50+ FPS.

---

### Phase 3 — Risograph (~1 day)

Strongest print-aesthetic add. The most "marketing-friendly" effect
of the batch — risograph is a recognizable Instagram trend.

#### Tasks

- [ ] Same plumbing as Phases 1-2.
- [ ] GLSL pass: pink + cyan channel separation with offset, 2-tone
      quantization, paper grain overlay.
- [ ] Slider mapping: `split` = misregistration offset, `intensity` =
      grain amount, `cellSize` = paper grain frequency.
- [ ] Add `Risograph` look preset between `Halftone` and `Pixel` (or
      right after `Bayer` from Phase 1).
- [ ] Chip preview overlay showing the pink+cyan registration look.
- [ ] Bake `public/looks/risograph.png`.
- [ ] Test on macOS Safari — risograph relies on color blending
      that historically had Safari precision issues
      (see [`2026-05-mobile-safari-webgl.md`](../research/2026-05-mobile-safari-webgl.md#finding-4--effectcomposer-on-safari-needs-special-care)).
- [ ] Tests + build + commit + deploy.

#### Acceptance

- Risograph chip in looks bar.
- Renders pink+cyan dual-channel print look with visible misregistration.
- Grain visible at small `cellSize`.
- Looks correct on macOS Safari + iOS Safari.

---

### Phase 4 — Newsprint (extension, ~4 hours)

Extension of the existing halftone. Adds the rotated-CMYK grid look.
Lowest effort of the batch.

#### Tasks

- [ ] Add `newsprint` to `EFFECT_INDEX`.
- [ ] GLSL pass: 4 halftone grids rotated 0°, 15°, 45°, 75° in CMYK
      channels. Composite per-channel.
- [ ] No new sliders — reuse `cellSize` (grid spacing) + `intensity`
      (channel saturation).
- [ ] Add `Newsprint` look preset.
- [ ] Chip preview + baked image.
- [ ] Tests + build + commit + deploy.

#### Acceptance

- Newsprint chip in looks bar.
- Visible 4-channel CMYK rotated dot grid.
- Visually distinct from Halftone (single grid) and Bayer (square matrix).

---

### Phase 5 — Aurora post-effect (extract, ~4 hours)

Aurora math already exists in `src/three/globe.js`'s
`createAtmosphereMaterial`. Extracting it as a fullscreen post-effect
is mechanical.

#### Tasks

- [ ] Copy the aurora wave functions (`waveA`, `waveB`) from the
      atmosphere shader into `post-effects.js`.
- [ ] Add `aurora` to `EFFECT_INDEX` and the cascade.
- [ ] Map sliders: `intensity` (overall opacity), `motion` (wave
      animation speed), `cellSize` (wave frequency).
- [ ] Add `Aurora` look preset with night-sky color tones.
- [ ] Chip preview + baked image.
- [ ] Tests + build + commit + deploy.

#### Acceptance

- Aurora chip in looks bar.
- Renders flowing aurora bands over the dot field.
- Animation respects prefers-reduced-motion.

---

### Phase 6 (gated) — Atkinson dither via CPU bake

**Only if Phase 1 (Bayer) ships and gets positive feedback.** Atkinson
+ Floyd-Steinberg can't be single-pass, so they need infrastructure
the rest of the effects don't.

#### Tasks (gated)

- [ ] Add a CPU-side dithering module
      `src/utils/error-diffusion-dither.js` implementing
      Floyd-Steinberg and Atkinson.
- [ ] When the effect is selected, render the current frame to an
      offscreen canvas, run the dither, upload as a texture, sample
      it as the effect output.
- [ ] Re-bake on changes to: density, dot color, world fill, selection.
- [ ] Add `Atkinson` look preset.

#### Acceptance (eventual)

- Atkinson chip renders the iconic crunchy classic-Mac look.
- Re-bakes within ~100ms of input changes (debounced).
- Live morph (flat ↔ globe) still smooth — only the dither texture
  caches, the morph itself runs through the standard render path.

---

## Open questions

- Do new effects need to appear in the `examples/` directory? The
  README under `public/looks/` mentions the workflow for baking
  preview images. Worth checking if the examples directory should
  mirror new looks.
- Should each new effect get a dedicated `/looks/<id>` URL the same
  way existing presets do? Currently `look-presets.js` IDs map to
  shareable URLs via the looks-bar logic.
- Is there appetite for *combining* effects? E.g., "Halftone + Bayer"
  or "Risograph + Glitch." Today the architecture is exclusive — one
  effect at a time. Combinatorial would need a layered shader system
  (parked in `ROADMAP.md` as "Plugin system for third-party shader
  passes").
- Pacing: ship one effect per week, or batch-ship 3 together? Batch
  is easier to communicate ("Three new looks!") but slower to learn
  from user feedback. Probably batch the first three (Bayer + Iridescent
  + Risograph), then space subsequent waves.

## Status log

- **2026-05-19** — Plan drafted from candidate research. No code yet.
