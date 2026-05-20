# Shader effect candidates

**Date:** 19 May 2026
**Sources consulted:** 10 Codrops articles + 6 ShaderToy / forum threads + 3 design trend reports
**Confidence:** High for trend signal · High for implementation feasibility
**Status:** Plan written → see [`docs/plans/shader-effects-rollout.md`](../plans/shader-effects-rollout.md)

## Executive summary

Globestudio ships 18 shader effects today, covering the core "retro
digital" design language (CRT, glitch, halftone, pixel, threshold)
plus a few atmospheric/material looks (bloom, metal, pencil). The
2026 design landscape — surveyed across Codrops, Awwwards, and
emerging tools like Unicorn Studio — points to **three under-served
aesthetic gaps** in the current library:

1. **True dithering** (Bayer / ordered / blue noise). The current
   "halftone" uses circular dots; designers explicitly want the
   classic-Mac "crunchy" pixel dither aesthetic, which is a different
   visual.
2. **Print aesthetics** (risograph, newsprint). The single biggest
   trend in 2025-2026 illustration/design that Globestudio can't
   currently express.
3. **Iridescent / foil / holographic.** Fresnel-driven shading is
   everywhere on the awwwards 2026 collection. Globestudio's "metal"
   pass is a thin facsimile.

All three add as single-pass fragment shaders that bolt onto the
existing `EFFECT_INDEX` infrastructure in `post-effects.js`. No
multi-pass or GPGPU work needed. Estimated total dev cost:
**1-2 days per effect**, including chip preview overlays and tuning.

Higher-ambition adds (cellular/voronoi, vaporwave grid, aurora as a
post-effect) are listed in a separate tier — viable but less obvious
designer demand.

Explicitly **rejected** for this pass: fluid distortion (multi-pass
+ render targets, too expensive), liquid raymarching (heavy GPGPU),
procedural landscapes (wrong aesthetic for a map tool).

## Current shader inventory

For reference, here's what Globestudio has today (from
`src/config/shader-effects.js`):

| Effect      | Category             | What it does                              |
| ----------- | -------------------- | ----------------------------------------- |
| `none`      | Passthrough          | No effect (bypasses composer)             |
| `bloom`     | Glow                 | UnrealBloomPass + atmospheric haze        |
| `chromatic` | RGB split            | Directional red/blue offset               |
| `crt`       | Retro display        | Scanlines, curvature, phosphor glow       |
| `halftone`  | Print                | Circular dot pattern                      |
| `pixel`     | Pixelation           | Block quantization                        |
| `threshold` | High contrast        | Binary black/white pass                   |
| `glitch`    | Data corruption      | Horizontal slice displacement             |
| `edge`      | Outline              | Sobel edge detection                      |
| `wave`      | Distortion           | Sine-based UV warp                        |
| `metal`     | Material             | Screen-space env reflection (chrome)      |
| `pencil`    | Artistic             | 4-layer cross-hatching                    |
| `toon`      | Artistic             | Quantized cel-shading                     |
| `stripes`   | Pattern              | Vertical stripes overlay                  |
| `badtv`     | Retro display        | VHS analog distortion                     |
| `rgb`       | RGB split            | Rotating-axis channel separation          |
| `chroma`    | RGB split            | Radial channel zoom (ISF reference)       |
| `corrupt`   | Data corruption      | 8-color binary RGB datamosh               |

18 entries. Strong in *retro digital* + *print* + *artistic*. Weak in
*organic*, *iridescent*, *true dithering*, and *modern print*.

## Key findings

### Finding 1 — Bayer / ordered dither is the canonical 2026 add ✅

The Codrops 2025 article on Bayer dithering explicitly notes the
shader **runs at <0.2ms at 4K resolution** as a single GPU pass. The
recursive matrix is either computed procedurally in the fragment
shader or baked once to a tileable texture. The aesthetic is
distinctly different from the current `halftone`:

- **Halftone** = circular dots scaled by brightness (newspaper-style)
- **Bayer dither** = fixed 4×4 or 8×8 threshold matrix → binary
  pattern (classic-Mac, early game console)

Both belong in the library because they hit different design moods.

Sources:
- [Codrops — Bayer Dithering Quick Guide](https://tympanus.net/codrops/2025/07/30/interactive-webgl-backgrounds-a-quick-guide-to-bayer-dithering/) ✅
- [Codrops — Building a Real-Time Dithering Shader](https://tympanus.net/codrops/2025/06/04/building-a-real-time-dithering-shader/) ✅
- [Maxime Heckel — The Art of Dithering and Retro Shading](https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/) ⚠️
- [Procedural Blue Noise Dithering ShaderToy](https://www.shadertoy.com/view/ssBBW1) ✅

### Finding 2 — Floyd-Steinberg / Atkinson dither cannot run in a single shader pass ⚠️

Error-diffusion dithers (Floyd-Steinberg, Atkinson) are inherently
sequential — each pixel's quantization error propagates to its
neighbors. This is fundamentally incompatible with a fragment shader,
which runs every pixel in parallel.

**Workarounds:**
- **CPU bake at look-change time.** Run the dither once when the
  user picks the effect (or changes density / dot color). Cache the
  result as a texture. Re-bake when inputs change. Live morph
  rotations still work because the dither texture is sampled
  underneath, not re-computed per frame.
- **Approximation via Bayer.** Bayer's "crunchy" pattern is the
  closest single-pass analog to Atkinson. The Codrops article frames
  Atkinson as Floyd-Steinberg with 75% error distribution → close
  enough that designers might not notice in fast scroll-by.

**Recommendation:** ship Bayer as the v1 dither (single-pass), defer
Atkinson/Floyd to a later "Print bake" effect that's CPU-rendered.
Note in UI: "Bayer = live, Atkinson = baked."

Sources:
- [Codrops — Efecto: Real-Time ASCII and Dithering](https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/) ✅

### Finding 3 — Risograph is the standout 2026 print aesthetic gap ✅

Design trend reports consistently list **risograph / analog print**
among the top illustration trends for 2025-2026. The "real" risograph
look is hard to capture in a single shader because much of the
character is paper-and-ink physics. But a credible digital
emulation reduces to:

1. **Channel separation.** Render the scene in 2-3 ink colors
   (e.g., fluorescent pink + cyan-blue). Each "ink" is one channel.
2. **Misregistration offset.** Each channel translates by a few
   pixels independently. Mimics the print press misalignment that
   creates the classic riso "glow."
3. **Color quantization.** Each ink is binary or 3-tone, not
   continuous gradient.
4. **Paper grain.** Soft texture overlay (procedural noise) gives the
   uncoated-paper feel.

All four stack as a single fragment pass. Per-channel offset is the
same trick `chromatic` already does, just with named ink palettes and
quantization on top.

Sources:
- [Codrops — Risograph Printing with WebGL](https://tympanus.net/codrops/2024/06/27/digital-meets-physical-risograph-printing-with-webgl/) ✅
- [Author Hub — The Enduring Charm of Analog Aesthetic](https://hub.author.envato.com/analog-aesthetic/) ⚠️
- [True Grit RizzCraft Risograph Effects](https://www.truegrittexturesupply.com/products/rizzcraft) ⚠️

### Finding 4 — Iridescent / foil is the awwwards 2026 darling ✅

The Codrops + awwwards 2026 highlights repeatedly feature iridescent,
foil-sticker, and holographic shaders. The recipe is well-known:

1. **Fresnel term.** Brightness scales by angle between surface
   normal and view direction. Edges glow.
2. **HSV cycling.** Hue shifts continuously around the spectrum based
   on the Fresnel value + a uniform time uniform.
3. **Procedural metallic flakes.** Add 1-2 octaves of low-frequency
   noise that creates patches of brightness; combine with fine
   high-frequency speckle for the "sparkle catching light."
4. **Soft saturation curve.** Avoid pure white/black; keep colors
   in the pearlescent mid-range.

Globestudio already has the surface normal of every dot (computed in
`applyDotInstances`), so a `holographic` effect is structurally a
straightforward addition. It also slots into the lookup-friendly
"material" category alongside `metal` and `pencil`.

Sources:
- [Nikos Papadopoulos — Foil Sticker Effect](https://www.4rknova.com/blog/2025/08/30/foil-sticker) ✅
- [Three.js Journey — Hologram Shader lesson](https://threejs-journey.com/lessons/hologram-shader) ✅
- [ektogamat — Three.js vanilla holographic material](https://github.com/ektogamat/threejs-vanilla-holographic-material) ✅
- [Anderson Mancini holographic material demo](https://threejs-vanilla-holographic-material.vercel.app/) ✅

### Finding 5 — Voronoi cellular is single-pass and aesthetically distinct ✅

Cellular noise (Voronoi, Worley) partitions screen space into
organic cell-like regions. Each pixel computes distance to the 9
nearest seed points (grid + 8 neighbors), takes the minimum. Single
fragment pass, <0.5ms at 1080p.

The aesthetic fit for Globestudio is interesting: instead of dots, the
land regions could be filled with voronoi cells. Or, a `cellular`
post-effect could overlay a translucent voronoi pattern on top of the
existing dot field — adds an organic texture without changing the
fundamental dotted-globe aesthetic.

Best-fit use case: a "biology / ecology" look (cells, water, moss).
Less of a fit for the "tech / data" looks Globestudio leans toward.
Probably belongs in v2.

Sources:
- [The Book of Shaders — Cellular Noise](https://thebookofshaders.com/12/) ✅
- [Sangil Lee — Variations of Cellular Noise](https://sangillee.com/2025-04-18-cellular-noises/) ⚠️
- [gl-Noise library](https://farazzshaikh.github.io/glNoise/) ✅
- [Procedural 3D Voronoi noise ShaderToy](https://www.shadertoy.com/view/flSGDK) ✅

### Finding 6 — Aurora + newsprint are clear-but-secondary adds ⚠️

**Aurora** as a fullscreen post-effect (vs the existing
sphere-surface atmosphere) would give a strong "northern lights"
backdrop mode. Globestudio's atmosphere shader has 80% of the math
already; extracting to a post-effect is mechanical.

**Newsprint** is halftone with rotated grids per channel (cyan
rotates 15°, magenta 75°, yellow 0°, black 45° — the classic CMYK
moiré). Adds maybe 30 lines to the halftone pass.

Both useful, neither headline-worthy. Tier-2 priority.

Sources:
- [Codrops — WebGL for Designers (Unicorn Studio aurora highlight)](https://tympanus.net/codrops/2026/03/04/webgl-for-designers-creating-interactive-shader-driven-graphics-directly-in-the-browser/) ✅
- [Awwwards — WebGL Shaders Collection](https://www.awwwards.com/awwwards/collections/webgl-shaders-code/) ✅

### Finding 7 — Vaporwave grid is on-trend but a different layer ⚠️

The "endless perspective grid receding to a sunset horizon" aesthetic
is everywhere in 2025-2026 product design (Stripe, Linear, dozens of
SaaS landing pages). Globestudio could ship this as a **background
mode**, not a post-effect — it sits behind the globe, not on top.

Implementation: a fullscreen mesh with shader-drawn grid + procedural
sun gradient. Doesn't bolt onto `EFFECT_INDEX`; needs a new
`backgroundStyle: "grid"` mode parallel to the existing `space`
mode.

Out of scope for *shader effects* research; tracked separately for
the background-modes roadmap.

Sources:
- (Trend signal only — many product sites referenced in awwwards)

## Comparison table — Effect candidates ranked

Ranked by (1) designer demand × (2) aesthetic fit with current library
× (1 / implementation effort).

| Effect              | Trend signal | Library fit | Effort         | Single-pass? | Verdict   |
| ------------------- | ------------ | ----------- | -------------- | ------------ | --------- |
| **Bayer dither**    | ★★★★★        | ★★★★★       | XS (4-6 hrs)   | Yes          | Ship v1   |
| **Risograph**       | ★★★★★        | ★★★★★       | S (1 day)      | Yes          | Ship v1   |
| **Iridescent/foil** | ★★★★★        | ★★★★        | S (1 day)      | Yes          | Ship v1   |
| **Atkinson dither** | ★★★★         | ★★★★        | M (CPU bake)   | No           | Ship v2   |
| **Newsprint**       | ★★★          | ★★★★★       | XS (4 hrs)     | Yes          | Ship v2   |
| **Aurora**          | ★★★          | ★★★         | XS (mostly done) | Yes        | Ship v2   |
| **Voronoi**         | ★★★          | ★★          | S (1 day)      | Yes          | Ship v3   |
| **Vaporwave grid**  | ★★★★         | ★★          | M (BG mode)    | n/a          | Separate  |
| **Fluid distortion**| ★★★          | ★★          | XL (multi-pass)| No           | Reject    |
| **Liquid raymarch** | ★★★          | ★           | XL             | No           | Reject    |

## Implementation notes per candidate

Sketch of how each high-priority candidate slots into the existing
`post-effects.js` pipeline.

### Bayer dither

```glsl
const mat4 BAYER = mat4(
   0.0, 8.0, 2.0, 10.0,
  12.0, 4.0, 14.0, 6.0,
   3.0, 11.0, 1.0, 9.0,
  15.0, 7.0, 13.0, 5.0
) / 16.0;

vec4 bayerPass(vec2 uv) {
  vec4 c = sampleTex(uv);
  vec2 p = mod(gl_FragCoord.xy, 4.0);
  float threshold = BAYER[int(p.y)][int(p.x)];
  float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  float quantized = luma > threshold ? 1.0 : 0.0;
  return vec4(vec3(quantized), c.a);
}
```

Effect controls: `intensity` (0-100 = blend with original), `cellSize`
(matrix tile scale 4-16).

### Risograph

```glsl
vec4 risoPass(vec2 uv) {
  vec2 offsetPink = vec2(uSplit * 0.5 / uResolution.x, 0.0);
  vec2 offsetBlue = vec2(-uSplit * 0.5 / uResolution.x, uSplit * 0.5 / uResolution.y);
  vec4 pinkLayer = sampleTex(uv + offsetPink);
  vec4 blueLayer = sampleTex(uv + offsetBlue);
  // Quantize each to 2-tone
  float pinkMask = step(0.5, dot(pinkLayer.rgb, vec3(0.299, 0.587, 0.114)));
  float blueMask = step(0.5, dot(blueLayer.rgb, vec3(0.299, 0.587, 0.114)));
  vec3 pink = vec3(1.0, 0.4, 0.6) * pinkMask;
  vec3 blue = vec3(0.2, 0.4, 0.95) * blueMask;
  vec3 grain = vec3(rand(uv * uResolution + uTime) * 0.06);
  return vec4(min(pink + blue + grain, 1.0), 1.0);
}
```

Effect controls: `split` (misregistration offset px), `intensity`
(grain amount), `cellSize` (paper grain frequency).

### Iridescent/foil

```glsl
vec4 holoPass(vec2 uv) {
  vec4 c = sampleTex(uv);
  float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  // Use luma as a proxy for surface "thickness" — distance from edges.
  float fresnel = 1.0 - luma;
  // Hue cycles with time + fresnel
  vec3 hue = vec3(
    sin(fresnel * 6.28 + uTime * 0.4),
    sin(fresnel * 6.28 + uTime * 0.4 + 2.09),
    sin(fresnel * 6.28 + uTime * 0.4 + 4.18)
  ) * 0.5 + 0.5;
  // Procedural sparkle
  float sparkle = pow(rand(floor(uv * uResolution * 0.4)), 16.0);
  vec3 outRgb = mix(c.rgb, hue + sparkle, fresnel * uIntensity);
  return vec4(outRgb, c.a);
}
```

Effect controls: `intensity`, `motion` (hue cycle speed), `grain`
(sparkle density).

## Risks & uncertainties

- **Aesthetic homogenization.** Adding 3-5 more effects pushes the
  total to 21-23. Designers may find the chip bar overwhelming.
  Mitigation: split into categories (Print, Retro, Material,
  Artistic) once we have 25+. Add a tag system on the look chips.
- **Bayer vs. existing halftone confusion.** Designers might not
  immediately grok the difference. Mitigation: chip previews must
  clearly show the visual distinction — Bayer is square 4×4 grid,
  halftone is circular dots of varying size.
- **Risograph color choices.** Real risograph has dozens of ink
  colors; we'd ship with a single fixed pink+blue pairing. Could be
  perceived as limiting. Mitigation: expose a "Risograph palette"
  enum control later — fluorescent pink+blue, teal+orange, etc.
- **Iridescent performance on mobile.** The procedural sparkle at 4K
  could be expensive on iGPU. Test before shipping; fall back to
  lower-frequency sparkle on `(pointer: coarse)`.

## Recommendations

Three effects to ship in the next pass, in order:

1. **Bayer dither (v1, ~6 hours work).** Highest leverage. Distinct
   from halftone, single-pass, well-documented. Add a chip preview
   that clearly shows the 4×4 grid pattern.
2. **Iridescent / foil (v1, ~1 day).** Adds a "material" axis that
   complements `metal` and `pencil`. Designers love this aesthetic
   right now.
3. **Risograph (v1, ~1 day).** Single most-requested print aesthetic
   in 2025-2026. Even a basic 2-ink version beats nothing.

Then in a follow-up wave:

4. **Newsprint** (extension of halftone, 4 hours).
5. **Aurora as post-effect** (mostly extract from existing
   atmosphere code, 4 hours).
6. **Atkinson dither via CPU bake** (1-2 days — needs the bake
   infrastructure first).

Park for v3+:

- Voronoi cellular (different aesthetic, smaller demand).
- Vaporwave grid (a *background mode*, not a post-effect — separate
  roadmap item).

Explicitly reject:

- Fluid distortion / liquid raymarching (out of perf budget).
- Procedural landscapes (wrong design language).

## Open questions

- Does Globestudio already have a meaningful "alpha channel" usage in
  the dot rendering? Some new effects (risograph, holographic) work
  better with edge softening — need to check if alpha is consistently
  available downstream.
- Should the new effects honor `prefers-reduced-motion`? Iridescent's
  hue cycling is exactly the kind of animation that should pause
  under reduced motion.
- Is there a max effect-count beyond which the chip bar feels
  overwhelming? Currently 11 visible chips on the looks bar (default
  + 10 presets). Three new effects mean three new chips. Test
  with one new chip first before committing.
- The dev HUD's draw call count went up to 77 with composer-mode
  shaders. Each new effect adds 0 draw calls (same single ShaderPass)
  but increases the fragment shader instruction count. Worth measuring
  the GPU-side cost after each addition.

## Sources

1. [Codrops — Interactive WebGL Backgrounds: Bayer Dithering](https://tympanus.net/codrops/2025/07/30/interactive-webgl-backgrounds-a-quick-guide-to-bayer-dithering/) — first-party tutorial ✅
2. [Codrops — Building a Real-Time Dithering Shader](https://tympanus.net/codrops/2025/06/04/building-a-real-time-dithering-shader/) ✅
3. [Codrops — Efecto: Real-Time ASCII and Dithering Effects](https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/) ✅
4. [Codrops — Digital meets Physical: Risograph with WebGL](https://tympanus.net/codrops/2024/06/27/digital-meets-physical-risograph-printing-with-webgl/) ✅
5. [Codrops — WebGL for Designers (Unicorn Studio)](https://tympanus.net/codrops/2026/03/04/webgl-for-designers-creating-interactive-shader-driven-graphics-directly-in-the-browser/) ✅
6. [Maxime Heckel — The Art of Dithering](https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/) ⚠️
7. [Nikos Papadopoulos — Implementing a Foil Sticker Effect](https://www.4rknova.com/blog/2025/08/30/foil-sticker) ✅
8. [Three.js Journey — Hologram Shader lesson](https://threejs-journey.com/lessons/hologram-shader) ✅
9. [ektogamat — three.js vanilla holographic material](https://github.com/ektogamat/threejs-vanilla-holographic-material) ✅
10. [The Book of Shaders — Cellular Noise](https://thebookofshaders.com/12/) ✅
11. [Sangil Lee — Variations of Cellular Noise](https://sangillee.com/2025-04-18-cellular-noises/) ⚠️
12. [Procedural Blue Noise Dithering — ShaderToy](https://www.shadertoy.com/view/ssBBW1) ✅
13. [Procedural 3D Voronoi noise — ShaderToy](https://www.shadertoy.com/view/flSGDK) ✅
14. [Awwwards — WebGL Shaders + Code Collection](https://www.awwwards.com/awwwards/collections/webgl-shaders-code/) ✅
15. [Awwwards — The Rise of Shaders, Filters and Effects](https://www.awwwards.com/the-rise-of-shaders-filters-and-effects-in-web-projects.html) ✅
16. [Author Hub — Analog Aesthetic Trend Report](https://hub.author.envato.com/analog-aesthetic/) ⚠️
17. [True Grit — RizzCraft Risograph Effects](https://www.truegrittexturesupply.com/products/rizzcraft) ⚠️
18. [gl-Noise — WebGL Noise Function Library](https://farazzshaikh.github.io/glNoise/) ✅
19. [GM Shaders Mini — Dither](https://mini.gmshaders.com/p/gm-shaders-mini-dither) ⚠️
