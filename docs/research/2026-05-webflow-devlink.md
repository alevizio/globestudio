# Webflow code components / DevLink — deep dive

**Date:** 19 May 2026
**Sources consulted:** 6 first-party docs + 2 community articles
**Confidence:** High for API · Medium for distribution path
**Status:** Plan written. See [`docs/plans/integrations-rollout.md`](../plans/integrations-rollout.md) Phase 4.
**Parent research:** [`2026-05-integrations.md`](2026-05-integrations.md)

## Executive summary

Webflow Code Components launched on CMS + Business plans in 2026.
They're React components shared into a Webflow Workspace via the
`@webflow/webflow-cli` `devlink import` flow. They render as real DOM
inside Webflow (server-side rendered by default), expose props in the
designer panel, and integrate with Webflow's Interactions engine.

**Distribution is workspace-scoped, not Marketplace-public.** The
public Marketplace requires libraries to ship 50+ layouts. For
Globestudio, that means the realistic distribution model is "publish the
DevLink package on npm so any developer can install it into their own
workspace" — closer to Lottie's player model than Framer's
marketplace flywheel.

Prop types are notably less rich than Framer's: no native color
picker in the v1 prop type list, no nested objects, no array/repeat
controls. Globestudio props will need a few adapter conventions (color
as hex `Text`, enum as `Variant`).

## API surface

### Dev environment

```bash
npm install @webflow/webflow-cli @webflow/data-types @webflow/react
```

Component definition lives in **two files**:

- `WorldGlobe.tsx` — the actual React component
- `WorldGlobe.webflow.tsx` — the `declareComponent` metadata wrapper

### Component shape

```tsx
// WorldGlobe.tsx
export const WorldGlobe = ({ density, look, dotColor, motion }: Props) => {
  // ...React component renders here. SSR-friendly (no window access at
  // top-level — gate WebGL behind useEffect).
  return <div>...</div>
}
```

```tsx
// WorldGlobe.webflow.tsx
import { declareComponent } from "@webflow/react"
import { WorldGlobe } from "./WorldGlobe"

declareComponent(WorldGlobe, {
  name: "WorldGlobe",
  description: "Interactive dotted globe",
  group: "Globestudio",
  props: {
    look: {
      type: "Variant",
      name: "Look",
      defaultValue: "default",
      options: [
        { value: "default", name: "Default" },
        { value: "halftone", name: "Halftone" },
        // ...
      ],
    },
    density: {
      type: "Number",
      name: "Density",
      defaultValue: 40,
    },
    dotColor: {
      type: "Text",
      name: "Dot color (hex)",
      defaultValue: "#ffffff",
      // No native color prop type — use Text with hex convention.
    },
    motion: {
      type: "Number",
      name: "Motion",
      defaultValue: 35,
    },
  },
})
```

### Publishing

```bash
webflow devlink import
```

This bundles + uploads the library to the developer's Workspace.
Other sites *in that Workspace* can then open the Libraries panel
(press L) and install. Workspace-scoped distribution.

## Available prop types

| Prop type      | Designer control                | Globestudio use                          |
| -------------- | ------------------------------- | -------------------------------------- |
| `Text`         | Single line text                | Color hex strings, ASCII symbol        |
| `Rich Text`    | Multi-line with formatting      | (Not used)                             |
| `Text Node`    | Canvas-editable text            | (Not used)                             |
| `Link`         | URL with validation             | (Not used directly)                    |
| `Image`        | Image upload/selection          | Custom shape upload (path B)           |
| `Number`       | Numeric with validation         | Density, dotSize, motion, tilt        |
| `Boolean`      | Toggle                          | Auto-spin, show stroke, dotsVisible    |
| `Variant`      | Dropdown of predefined options  | Look preset, render mode, shape        |
| `Visibility`   | Show/hide                       | (Used at component level, not prop)    |
| `Slot`         | Content areas for child comps   | (Not used)                             |
| `ID`           | HTML element ID                 | Custom anchor target                   |

**Conspicuously missing in the v1 list:**
- Color picker (Text + hex string is the workaround)
- Array / repeating fields (gradients, presets — workaround = JSON in Text)
- Nested objects (workaround = flatten)
- File upload beyond Image type

These gaps push Globestudio toward a **slimmer prop surface** on Webflow
than on Framer. Reasonable tradeoff: Webflow gets a tighter v1
component with the most-used controls; advanced controls (gradients,
shaders, ASCII patterns) come via a single `presetId` Variant that
encodes the full setup.

## SSR behavior

Webflow Code Components SSR by default — Webflow's server generates
initial HTML before sending to browser. **For Three.js this is
critical to get right:**

- The component must render *something* without `window` — at minimum
  a placeholder `<div>` with the right aspect ratio so layout
  doesn't shift.
- All WebGL setup must be gated behind `useEffect(() => { ... }, [])`
  so it only runs client-side.
- Avoid top-level `import * as THREE from "three"` in the SSR path
  if possible — Three.js parses cleanly server-side, but a dynamic
  `import("three")` inside the `useEffect` is safer.

The existing Globestudio `<GlobeBackground>` already does this correctly
— the entire Three.js setup is inside a `useEffect`. The component is
SSR-ready as-is.

## Distribution reality

The Webflow Marketplace is **not the right channel for a single
Globestudio component**. The 50-layout-minimum bar is built for design
system libraries, not single dev components.

The realistic paths:

### Path A — npm package, designer installs into their own Workspace

Publish `@globestudio/webflow-component` on npm. Developer/designer
runs `webflow devlink import` to pull it into their Workspace. Same
distribution Lottie's official Webflow integration uses.

**Pros:** standard npm tooling, version-pinnable, public reach.
**Cons:** requires a designer with Webflow CMS or Business plan AND
some CLI comfort. Not pure no-code.

### Path B — Webflow App (Designer App)

Build a Webflow Designer Extension that, when activated, installs
the Globestudio code component library into the user's Workspace.
Hides the CLI step behind a click.

**Pros:** zero CLI friction for the designer.
**Cons:** significantly more engineering. Webflow App development
is its own track.

### Path C — Skip code components, use Custom Code Embed instead

The escape hatch. For most Globestudio users on Webflow, this is what
they'll actually do. Already documented in
[`2026-05-integrations.md`](2026-05-integrations.md) — paste an
`<iframe src="https://globestudio.vercel.app/embed?...">` into a Code
Embed block.

**Recommendation:** ship **Path C** as the documented Webflow story
first (it costs us hours, not weeks). Build **Path A** as v2 only if
analytics show enough Webflow users + developer-grade users to
justify. **Path B** is way off — only worth it if Webflow becomes
a top-3 referrer.

## SEO and Interactions

Two genuine wins of Code Components over iframe embed:

1. **SEO**: Code Components render as real DOM. Search engines see the
   page structure. The iframe approach has zero SEO benefit for the
   parent site (Globestudio itself benefits, parent site doesn't).
2. **Webflow Interactions**: Code Components can be targets of
   Webflow's native interaction system (scroll triggers, click
   triggers, hover effects). The iframe is opaque to Interactions.

These two wins are *real* but probably matter less than v1 timeline
for the early-adopter wave.

## Open questions

- Is there a TypeScript definitions file? The docs reference
  `@webflow/data-types` but I haven't confirmed the type ergonomics
  match what we'd want.
- How does `declareComponent` handle React 19? Globestudio is on
  React 19; some Webflow tooling may still target React 18.
- What's the bundle size limit per Workspace library? Three.js is
  560KB; if Webflow has a 1MB cap we need the tree-shaken slim
  build.
- Are there per-instance limits in a single Webflow page? Webflow
  pages with 5+ Three.js components might hit WebGL context limits.
- Are Workspace libraries automatically installed for end-clients of
  the agency that built the site, or does each site need its own
  install?

## Recommendations

In order:

1. **No Webflow work for v0/v1** — invest in Framer first. Document
   the iframe-embed Path C in the Globestudio README so Webflow users
   can use the tool today.
2. **Validate before building** — add a `?source=webflow` analytics
   tag on the embed route. If >10% of embed installs come from
   Webflow, the npm Path A becomes worthwhile.
3. **Ship Path A in 1-2 weeks of focused work** when validation
   triggers. Two files (`WorldGlobe.tsx` + `WorldGlobe.webflow.tsx`),
   one CLI command, one npm publish. Document the prop mapping
   carefully (color hex convention, presetId encoding).
4. **Hold off on Path B** until Webflow becomes a meaningful traffic
   source. Designer Apps are a bigger lift than the v2 component.

## Sources

1. [Webflow Code Components Introduction](https://developers.webflow.com/code-components/introduction) — first-party ✅
2. [Quick start: Importing code components](https://developers.webflow.com/code-components/importing/quick-start) — first-party ✅
3. [Prop Types reference](https://developers.webflow.com/code-components/reference/prop-types) — first-party ✅
4. [Code Components feature page](https://webflow.com/feature/code-components) — first-party ✅
5. [Libraries — Webflow Help Center](https://help.webflow.com/hc/en-us/articles/33961343551763-Libraries) — first-party ✅
6. [Library Creator Guide](https://webflow.com/marketplace/services/library-creator-guide) — first-party ✅
7. [Webflow Code Components vs Custom Code](https://www.pravinkumar.co/blog/webflow-code-components-react-devlink-2026) — community article ⚠️
8. [Webflow Custom Code Embed Help](https://help.webflow.com/hc/en-us/articles/33961332238611-Custom-code-embed) — first-party ✅
