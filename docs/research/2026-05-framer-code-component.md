# Framer code component API — deep dive

**Date:** 19 May 2026
**Sources consulted:** 7 first-party docs + 4 community articles
**Confidence:** High for API surface · Medium for Three.js-specific behavior
**Status:** Plan written. See [`docs/plans/integrations-rollout.md`](../plans/integrations-rollout.md) Phase 2.
**Parent research:** [`2026-05-integrations.md`](2026-05-integrations.md)

## Executive summary

A Framer code component is a single React 18 component with a side-table
of metadata called `addPropertyControls` that maps props to a designer
UI. Three render modes (`canvas`, `preview`, `live`) must be detected
and handled: the canvas is a static-preview editor where heavy work
needs to be guarded. The `useIsStaticRenderer()` hook is the
sanctioned guard.

Three.js availability in Framer is **less clear-cut** than the
top-level marketing suggests. While Framer markets pre-installed
packages, the community has reported real import friction with some
npm libraries. Plan to either (a) bundle Three.js into the component
itself via jspm imports, or (b) ship a slim Worlddots-runtime that
talks to a hosted iframe — leaning toward (b) for v1 to dodge the
bundling questions.

## API surface

### Required imports

```js
import { addPropertyControls, ControlType, RenderTarget, useIsStaticRenderer } from "framer"
```

### Component shape

```jsx
export function WorldGlobe({ density, look, dotColor, worldFill, motion: motionSpeed }) {
  const isStatic = useIsStaticRenderer()
  // ... rendering logic, gating heavy WebGL on !isStatic
}

WorldGlobe.defaultProps = {
  density: 40,
  look: "default",
  dotColor: "#ffffff",
  worldFill: "#5a5a64",
  motion: 35,
}

addPropertyControls(WorldGlobe, {
  /* control map — see below */
})
```

### Property control map for Worlddots

Maps the existing Worlddots state surface to Framer's `ControlType`
enum. This is the v1 prop surface — a strict subset of what the full
Worlddots app exposes.

```js
addPropertyControls(WorldGlobe, {
  look: {
    type: ControlType.Enum,
    title: "Look",
    options: ["default", "halftone", "pixel", "wireframe", "crt", "glitch", "badtv", "bloom", "metal", "pencil", "corrupt"],
    optionTitles: ["Default", "Halftone", "Pixel", "Wireframe", "CRT", "Glitch", "Bad TV", "Bloom", "Metal", "Pencil", "Corrupt"],
    defaultValue: "default",
  },
  density: {
    type: ControlType.Number,
    title: "Density",
    min: 10,
    max: 90,
    step: 1,
    defaultValue: 40,
    displayStepper: false,
  },
  dotColor: {
    type: ControlType.Color,
    title: "Dot color",
    defaultValue: "#ffffff",
  },
  worldFill: {
    type: ControlType.Color,
    title: "World fill",
    defaultValue: "#5a5a64",
    description: "Continent fill in Solid mode",
  },
  renderMode: {
    type: ControlType.Enum,
    title: "Render mode",
    options: ["dots", "solid"],
    optionTitles: ["Dots", "Solid"],
    defaultValue: "dots",
  },
  showWorldStroke: {
    type: ControlType.Boolean,
    title: "World stroke",
    defaultValue: true,
    hidden(props) { return props.renderMode !== "solid" },
  },
  worldStroke: {
    type: ControlType.Color,
    title: "Stroke color",
    defaultValue: "#f6f2ea",
    hidden(props) { return props.renderMode !== "solid" || !props.showWorldStroke },
  },
  motionSpeed: {
    type: ControlType.Number,
    title: "Motion",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 35,
  },
  enableAutoSpin: {
    type: ControlType.Boolean,
    title: "Auto-spin",
    defaultValue: true,
  },
})
```

The `hidden()` callback is the right tool for the "Solid mode →
stroke options become visible" UX pattern that Worlddots already uses
in its own panel.

### Render mode detection

```js
import { RenderTarget } from "framer"

function getRenderMode() {
  const t = RenderTarget.current()
  if (t === RenderTarget.canvas) return "canvas"
  if (t === RenderTarget.preview && window?.location.host.includes("framercanvas.com")) return "preview"
  return "live"
}
```

Plus the simpler hook:

```js
const isStatic = useIsStaticRenderer() // true in canvas + preview, false in live
```

**Recommendation:** use `useIsStaticRenderer` for "should I animate?"
checks (the common case). Reach for the full `getRenderMode()`
helper only when behavior diverges between canvas and preview — rare.

## Three.js story — uncertain

Framer marketing claims pre-installed Three.js. Community evidence
suggests imports of some npm libraries hit real friction. The
top-level question — "can I `import * as THREE from 'three'` directly
in a Framer code component?" — is not cleanly answered in the
first-party docs.

Three plausible paths, in order of cleanness:

### Path A — Native code component, Three.js as bundled dep (preferred if it works)

```jsx
import * as THREE from "https://esm.sh/three@0.184"
// ...or:
import * as THREE from "three"
```

If Framer resolves `"three"` to its pre-installed copy, this works.
If not, the esm.sh CDN form works in any modern bundler. **Risk:**
multiple Worlddots components on one Framer page each pull a copy of
Three.js → bundle bloat. **Mitigation:** dynamic import with a
top-level `let` cache.

### Path B — Iframe-bridged component (lowest risk)

The code component renders an `<iframe>` pointing at a hosted
Worlddots URL (`/embed?look=halftone&density=40&...`). Resize is
handled via `postMessage`. The Framer component is ~30 lines of code
and zero Three.js dependency.

```jsx
export function WorldGlobe(props) {
  const params = new URLSearchParams(props).toString()
  const isStatic = useIsStaticRenderer()
  return (
    <iframe
      src={`https://worlddots.vercel.app/embed?${params}`}
      style={{ width: "100%", height: "100%", border: 0 }}
      loading={isStatic ? "lazy" : "eager"}
      title="Worlddots globe"
    />
  )
}
```

**Pros:** ships in a day, no Three.js packaging worries, full feature
parity (the iframe gets the real app).
**Cons:** SEO indexing weakness, can't style internals from Framer
side, harder to expose interactions back to Framer event handlers.

### Path C — Slim Worlddots runtime + lazy-loaded Three.js

The code component dynamically `import()`s a `@worlddots/runtime`
package (one we publish to npm), which itself dynamically loads
Three.js. Heavier engineering, but the Framer component stays small
and Three.js is only loaded once even if multiple components are on
the page.

**Recommendation for v1:** ship **Path B** (iframe-bridged). Validate
that designers actually drop the component into Framer projects.
Migrate to **Path A or C** in v2 once we know what props/interactions
are most-used.

## Three render modes — Worlddots-specific guidance

| Mode      | What runs                                        | Worlddots gating                                  |
| --------- | ------------------------------------------------ | ------------------------------------------------- |
| `canvas`  | Static preview only, no animation                | Render a single static frame, autoSpin off        |
| `preview` | Interactive, in framercanvas.com                 | Full interactivity, but log "preview" to console  |
| `live`    | Published site, real users                       | Everything on, analytics if applicable            |

In iframe-bridged mode (Path B above), this maps cleanly to query
string params: `?static=1` when `useIsStaticRenderer()` returns true,
nothing extra otherwise. The hosted `/embed` route then honors
`?static=1` by skipping autoSpin and rendering a fixed frame.

## Marketplace submission checklist

Drawn from [Framer's submission docs](https://www.framer.com/help/articles/how-to-submit-a-component-to-the-marketplace/):

- [ ] Component renders correctly in canvas, preview, and live modes
- [ ] All props have defaults and clear titles
- [ ] At least one preview screenshot or video
- [ ] Component name + description (Markdown supported)
- [ ] Versioned URL ready (Framer assigns this on publish)
- [ ] Free or paid pricing decided (free is the right v1 — gather
      data before charging)

Review takes ~14 days. Plan accordingly.

## Performance gotchas

1. **Canvas mode runs many components simultaneously** — if a user
   has 5 Worlddots components on a Framer page, the canvas tries to
   render them all at once. The `useIsStaticRenderer()` check is
   critical here.
2. **Library imports can fail silently** — community report on
   `react-use-gesture` suggests not all npm packages are seamlessly
   importable. Iframe-bridged mode dodges this entirely.
3. **WebGL context limits** — browsers cap concurrent WebGL contexts
   (~16 on Chrome). Each iframe gets its own. Multiple Worlddots
   instances on a page → must handle context exhaustion gracefully.
   The hosted `/embed` route should detect this and fall back to a
   static SVG preview if WebGL is denied.

## Open questions

- Does Framer's "pre-installed Three.js" cover the post-effects
  module path (`three/examples/jsm/postprocessing/...`)? Likely no —
  those are loaded as separate ESM modules even in npm consumption.
- What's the cold-start cost of the iframe approach? Worth measuring
  vs native: a iframe parse + Three.js load is ~800ms on a fresh
  Vercel cold deploy. May want to add `loading="lazy"` and a
  blurhash-style placeholder.
- How do we handle responsive width/height? Framer components live in
  Framer's layout system — width/height come from the parent
  container. The iframe needs `100%` sizing + `postMessage` resize
  protocol to avoid double-aspect issues.

## Recommendations

1. **v1 (1 day of work):** ship Path B (iframe-bridged) with the
   `/embed?look=&density=&...` query API. Single Framer code
   component file ~50 lines. Submit to marketplace as free.
2. **v1.5 (3 days after v1 lands):** add fallback static SVG preview
   inside the code component for the canvas mode — Framer's canvas
   shouldn't be running iframes at all if avoidable.
3. **v2 (1–2 weeks after demand validation):** migrate to Path A or
   C. By then we'll know which props are most-used and can tighten
   the bundle.

## Sources

1. [Framer Code Components Introduction](https://www.framer.com/developers/components-introduction) — first-party ✅
2. [Framer Property Controls reference](https://www.framer.com/developers/property-controls) — first-party ✅
3. [Framer Developers Reference](https://www.framer.com/developers/components-reference) — first-party ✅
4. [Three render modes your Framer components should handle — Queen Raae](https://queen.raae.codes/2025-12-09-framer-render-modes/) — community article ⚠️
5. [Framer Marketplace submission process](https://www.framer.com/help/articles/how-to-submit-a-component-to-the-marketplace/) — first-party ✅
6. [Framer Creator Program](https://www.framer.com/help/articles/how-the-creator-program-works/) — first-party ✅
7. [Framer support for 3D / R3F discussion](https://www.framer.community/c/developers/framer-support-for-3d-three-js-react-three-fiber) — community thread (content unverified) ❓
8. [(not)Working with three-js — Framer Community](https://www.framer.community/c/developers/not-working-with-three-js) — community thread reporting friction ⚠️
9. [Codrops — React Three Fiber + GLSL reveal](https://tympanus.net/codrops/2024/12/02/how-to-code-a-shader-based-reveal-effect-with-react-three-fiber-glsl/) — adjacent reference ✅
10. [Shader Component — Framer remix](https://segmentui.com/remix/shader-component) — proof of working WebGL in Framer ⚠️
11. [PixelScan — WebGL Framer component](https://contra.com/p/FNsrQFe3-pixel-scan-web-gl-component-for-framer) — proof of WebGL demand ⚠️
