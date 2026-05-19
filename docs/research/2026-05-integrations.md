# Designer-tool integration paths

**Date:** 19 May 2026
**Sources consulted:** 8 first-party docs + 6 secondary articles
**Confidence:** High for Framer/Webflow paths · Medium for Figma plugin
**Status:** Plan written → see [`docs/plans/integrations-rollout.md`](../plans/integrations-rollout.md)

## Executive summary

The "designer tool integration" wedge is real and addressable today,
with a clear three-tier model proven by **Lottie** (best-in-class
cross-tool animation) and **Spline** (3D scenes everywhere). Worlddots
can credibly slot between them: heavier than Lottie (it's not just a
player), lighter than Spline (one specific aesthetic, not a general
3D engine).

The platform mechanics are now mature enough that the *initial*
shipping unit is small: **a Framer code component is the right first
integration** — Framer pre-installs Three.js, the marketplace takes 0%
revenue, and there's proven demand from buyers of WebGL components
like PixelScan. Webflow Code Components are a strong second step
(React/DevLink, SSR-friendly). Figma is **not** an embed target — it's
a one-way export sink, best served by a "Export to Figma" plugin that
captures the canvas as PNG/SVG image fill.

## Key findings

### Finding 1 — Framer is the lowest-friction entry point ✅

Framer's Code Components are React 18 components written in Framer's
built-in editor. Three.js is pre-installed — no npm dance for end
users.

- **Distribution model:** shareable versioned URL → drag into a Framer
  project. There's also a Marketplace.
- **Approval:** ~14-day review (7-day initial + 7-day design/code
  review).
- **Revenue split:** Framer takes 0% of component sales. Creator keeps
  100%.
- **Design controls:** Property Controls give designers a real
  properties panel (color pickers, dropdowns, ranges) — exactly the
  surface Worlddots already exposes in its own UI.
- **Performance note:** Framer's docs recommend WebGL components use a
  custom hook instead of `RenderTarget` to keep the canvas/export
  pipeline static.

The chunked-morph + composer-bypass perf work shipped in commits
`607e9bb`, `54d91f3` is doubly valuable here — Framer canvases run
many components simultaneously during edit.

Sources:
- [Framer Code Components Introduction](https://www.framer.com/developers/components-introduction) ✅
- [Framer Marketplace submission process](https://www.framer.com/help/articles/how-to-submit-a-component-to-the-marketplace/) ✅
- [Framer Creator Program](https://www.framer.com/help/articles/how-the-creator-program-works/) ✅
- [PixelScan — WebGL Framer component](https://contra.com/p/FNsrQFe3-pixel-scan-web-gl-component-for-framer) ⚠️

### Finding 2 — Webflow has two paths; Code Components > Embed ✅

Webflow now offers **Code Components** (React + DevLink CLI), launched
2025-ish, alongside the older **Custom Code Embed** (iframe / `<script>`
tag, 50KB limit per embed).

|                      | Code Components               | Custom Code Embed              |
| -------------------- | ----------------------------- | ------------------------------ |
| Tech                 | React via DevLink             | HTML/JS in `<script>`          |
| Props                | Native designer panel         | None                           |
| SSR                  | Yes, server-rendered          | No, iframe                     |
| SEO                  | Indexable                     | iframe content not indexed     |
| Interactions         | Integrate with Webflow events | Cannot                         |
| Setup cost           | Significant (CLI + bundle)    | Tiny (paste URL)               |

Code Components is the better long-term investment — the rendered
globe ends up as real DOM Webflow can style and interact with. The
embed path is a valid escape hatch for v0 demand validation.

Sources:
- [Webflow Code Components docs](https://developers.webflow.com/code-components/introduction) ✅
- [Webflow Code Components vs Embeds](https://www.pravinkumar.co/blog/webflow-code-components-react-devlink-2026) ⚠️
- [Webflow Custom Code Embed help](https://help.webflow.com/hc/en-us/articles/33961332238611-Custom-code-embed) ✅

### Finding 3 — Figma is an export sink, not an embed surface ✅

Figma's plugin API confirms: Figma is 2D. No WebGL embed model for
the canvas. What works:

- `figma.createImage(bytes)` takes a Uint8Array, returns image hash.
- Plugin creates a frame, applies image as fill:
  `frame.fills = [{ imageHash, scaleMode: "FILL", type: "IMAGE" }]`.
- Plugin UI runs as an iframe — can host the full Worlddots
  interactive globe inside the plugin panel.

The right product is **"Worlddots for Figma"** — designer tweaks the
globe live inside Figma's plugin panel, then presses Insert → PNG (or
SVG) lands on the canvas as a frame fill. The same plugin can offer
"Update" to re-render in place when the design changes.

This is the *Lottie pattern, adapted*: design somewhere generative,
ship a static artifact into Figma.

Sources:
- [Figma exportAsync API](https://developers.figma.com/docs/plugins/api/properties/nodes-exportasync/) ✅
- [Working with Images — Figma Plugin API](https://developers.figma.com/docs/plugins/working-with-images/) ✅
- [LottieFiles for Figma](https://lottiefiles.com/plugins/figma) ✅

### Finding 4 — Spline's playbook is the closest reference, with one gap ⚠️

Spline ships:

- **Framer**: iframe embed via Embed element (basic, not a native code
  component).
- **Webflow**: native Spline Embed with event wiring (click/hover/scroll
  → manipulate Spline objects). This is the depth Worlddots should
  match.
- **Figma**: no plugin — workflow approach (design in Figma, build in
  Spline, export elsewhere).

**The gap:** Spline's Framer integration is *just an iframe*. A native
code-component approach on Framer would leap-frog Spline there. This
is the strongest argument for starting on Framer.

Sources:
- [Spline → Framer integration](https://docs.spline.design/integrations/integrating-with-framer) ✅
- [Spline → Webflow integration](https://docs.spline.design/doc/-/doc9gU5omPVR) ✅
- [Spline + Webflow recap](https://www.wedoflow.com/post/spline-webflow-integration) ⚠️

### Finding 5 — Lottie's distribution model is the north star ✅

LottieFiles has native players in Figma, Framer, Webflow, Canva, After
Effects + more. The artifact (`.lottie` / `.json`) is **tool-agnostic**
— same file plays everywhere.

The long-term play: a `.worlddot` file (or just a JSON config) that
any tool can render via a small player runtime. The current Worlddots
state object (look preset + density + shape + shader settings) is
already 95% of what such a file would contain. This is a 12-month
direction, not a v1.

Sources:
- [LottieFiles integrations overview](https://lottiefiles.com/integrations) ✅
- [LottieFiles Webflow integration](https://webflow.com/integrations/lottiefiles) ✅

## Comparison table — Integration effort vs. reach

| Integration                              | Effort     | Reach                          | Revenue model              | Differentiation vs Spline           |
| ---------------------------------------- | ---------- | ------------------------------ | -------------------------- | ----------------------------------- |
| **Framer code component**                | M (1–2 wk) | High — Marketplace exposure    | Marketplace sale or free   | **Beats Spline** (iframe-only)      |
| **Webflow code component**               | L (3–4 wk) | High — large audience          | DevLink workspace install  | Matches Spline depth                |
| **Webflow embed (iframe)**               | XS (hours) | Medium — validate demand first | URL share                  | Matches Spline minimum              |
| **Figma plugin (export sink)**           | M (1–2 wk) | High — 30M+ designers          | Free → freemium high-res   | Spline doesn't have this            |
| **`.worlddot` portable format + runtime** | XL (months)| Highest — every tool           | License / SaaS             | Lottie-style category creation      |

## Risks & uncertainties

- **Framer canvas perf with WebGL components.** Framer docs warn about
  this explicitly. Mitigation: ship the chunked-morph + composer-bypass
  already done, plus a "Canvas low-fi mode" prop that drops shader
  effects + density when in Framer's edit view.
- **Webflow code components are maturing.** DevLink CLI workflow is
  heavier than Framer's in-browser editor. The npm-package shape may
  still evolve.
- **Three.js bundle size.** Pre-installed in Framer but a real concern
  elsewhere. Current Three bundle is 560KB. Worth a tree-shaken
  Worlddots-optimized Three.js build (just InstancedMesh,
  ShaderMaterial, EffectComposer, RenderPass, ShaderPass,
  UnrealBloomPass).
- **Figma plugin sandbox.** Plugins run in an iframe with limited
  storage. The plugin's interactive globe panel needs to be
  lightweight. Probably ship a stripped Worlddots build (no export
  modal, no looks bar — just the canvas + a small preset switcher).

## Recommendations

In priority order:

1. **Ship a Framer code component first (v1 in 1–2 weeks).** Pre-installed
   Three.js, 0% marketplace cut, established WebGL component buyer base,
   leap-frogs Spline. Wrap `<GlobeBackground>` with `addPropertyControls`
   exposing density, look preset, dot color, world fill, motion. Submit
   free, gather demand, iterate.
2. **Webflow iframe embed as a v0 (this week).** Single deployed URL with
   query-string-driven preset
   (`/embed?look=halftone&density=70&color=ffffff`). Use `postMessage`
   for height resizing. Drop into the Worlddots site as an `<iframe>`
   snippet copy-paste. Validate demand before investing in the full Code
   Component path.
3. **Figma plugin as v1.5 (2–3 weeks after Framer).** Host the existing
   Worlddots app inside the plugin UI iframe; on Insert, render to PNG
   via `canvas.toDataURL()`, pass bytes to `figma.createImage()`, place
   as frame fill. Free in marketplace; reserves room for a paid tier
   later (custom resolution, SVG vector export, animation frame
   sequence).
4. **Webflow Code Component as v2 (4 weeks after Framer).** DevLink-based
   component matching the Framer prop surface. Bundle the optimized
   Three.js build. SSR for fast initial paint.
5. **Worlddots-optimized Three.js bundle (week-2 effort).** Tree-shake to
   modules in use (InstancedMesh, ShaderMaterial, BasicMaterial,
   EffectComposer, RenderPass, ShaderPass, UnrealBloomPass + utilities).
   Sub-200KB target. Useful for every non-Framer integration.
6. **Sketch the `.worlddot` portable format (background, ongoing).** State
   shape is already there in `look-presets.js` + `globe-settings.js`.
   Formalize as a versioned JSON schema. Publish a tiny
   `@worlddots/player` JS runtime that takes a `.worlddot` + DOM
   element and renders it. Long-term play, big upside.

## Sources

1. [Framer Code Components Introduction](https://www.framer.com/developers/components-introduction) — first-party docs ✅
2. [Framer Marketplace component submission](https://www.framer.com/help/articles/how-to-submit-a-component-to-the-marketplace/) — first-party ✅
3. [Framer Creator Program revenue split](https://www.framer.com/help/articles/how-the-creator-program-works/) — first-party ✅
4. [Framer Property Controls reference](https://www.framer.com/developers/property-controls) — first-party ✅
5. [Webflow Code Components docs](https://developers.webflow.com/code-components/introduction) — first-party ✅
6. [Webflow Code Components vs Embeds](https://www.pravinkumar.co/blog/webflow-code-components-react-devlink-2026) — community article ⚠️
7. [Webflow Custom Code Embed Help](https://help.webflow.com/hc/en-us/articles/33961332238611-Custom-code-embed) — first-party ✅
8. [Figma exportAsync API](https://developers.figma.com/docs/plugins/api/properties/nodes-exportasync/) — first-party ✅
9. [Figma Working with Images](https://developers.figma.com/docs/plugins/working-with-images/) — first-party ✅
10. [Spline → Framer integration](https://docs.spline.design/integrations/integrating-with-framer) — first-party reference impl ✅
11. [Spline → Webflow integration](https://docs.spline.design/doc/-/doc9gU5omPVR) — first-party reference impl ✅
12. [LottieFiles integrations overview](https://lottiefiles.com/integrations) — first-party ✅
13. [LottieFiles Figma plugin](https://lottiefiles.com/plugins/figma) — first-party reference impl ✅
14. [PixelScan WebGL Framer component](https://contra.com/p/FNsrQFe3-pixel-scan-web-gl-component-for-framer) — proof of WebGL Framer demand ⚠️
