# Example: `framer-component`

> **Status**: 🟢 Ready — copy-paste reference, no marketplace listing yet.

A Framer code component that embeds a Globestudio globe with full
property-panel controls. Iframe-bridged variant — wraps the hosted
`/embed` route so designers get zero-config integration with full
feature parity.

## What this proves

Globestudio ships as a real Framer building block, not just a screenshot
embed. Designers drop the component on the canvas, configure the look
preset and colors in Framer's right panel, and the globe updates live.

## Install

Open your Framer project, then:

1. **File → Insert → Code Component → New Code Component**
2. Name it **`GlobestudioGlobe`**
3. Replace the editor's contents with
   [`GlobestudioGlobe.tsx`](./GlobestudioGlobe.tsx) from this directory
4. Save (Framer auto-compiles)
5. Drag the `GlobestudioGlobe` chip from your Code section onto any frame

The component panel on the right shows:

- **Look** — 17 preset options (Default, Halftone, Bayer, Iridescent, Aurora, etc.)
- **Region** — string field for `world`, `country:USA`, `continent:Europe`, etc.
- **Render mode** — dots vs solid
- **Density** — 10–90 slider
- **Dot color** + **World fill** — Framer color pickers
- **Motion** — 0–100 slider for animation speed
- **Auto-spin** — boolean toggle
- **Background** + **Transparent BG** — conditional pair

## How it works

The component is a thin `<iframe>` pointing at
`https://globestudio.app/embed?<query-string>`. The query string is built
from prop values, so every Framer panel change updates the embed URL,
which triggers a reload of the iframe with the new state.

Two Framer-specific niceties:

- **`useIsStaticRenderer()`** detects Framer's canvas mode (the editor)
  and appends `?static=1` to the embed URL. The hosted embed honors
  this by freezing all motion — designers don't burn frames behind the
  scenes while editing.
- **`loading="lazy"`** in canvas mode, `loading="eager"` in preview/live
  mode. Keeps the Framer canvas snappy when many GlobestudioGlobe
  instances are on a page.

## Performance notes

- Each component instance is its own iframe → its own WebGL context.
  Modern browsers cap concurrent WebGL contexts (~16 on Chrome), so
  don't drop more than ~8 instances on a single page.
- The component's `useIsStaticRenderer` static mode + `loading="lazy"`
  keep the Framer canvas itself fast.

## Customizing further

If you need props the iframe doesn't expose (like a custom shape, or a
per-stop gradient), fork the component and bake those into the embed
URL directly, or fork Globestudio itself and host your own embed at a
private URL.

For native (non-iframe) integration with full Three.js, see the
"Path A" sketch in
[`docs/research/2026-05-framer-code-component.md`](../../docs/research/2026-05-framer-code-component.md)
— that's the v2 effort, planned but not yet shipped.

## Submitting to Marketplace

Designed to be marketplace-ready. To submit:

1. Make a Framer project that contains just this component
2. Add a screenshot + 30-second demo video
3. Run **File → Publish → Submit to Marketplace**
4. ~14-day review cycle

The maintainers haven't done this yet — open a
[Discussion](https://github.com/alevizio/globestudio/discussions) if
you'd like to be the first.
