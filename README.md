<div align="center">

# Globestudio

**Open-source dotted maps and animated 3D globes for designers, animators, and creative developers.**

Pick a country or the whole world, customize dots and shapes, apply shader effects, and export PNG, SVG, or animated WebM. Built on React + Three.js.

[**globestudio.app**](https://globestudio.app/) · [Live demos](https://globestudio.app/) · [Roadmap](ROADMAP.md) · [Discussions](https://github.com/alevizio/globestudio/discussions)

[![Deploy status](https://github.com/alevizio/globestudio/actions/workflows/deploy.yml/badge.svg)](https://github.com/alevizio/globestudio/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-f6f2ea.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-9adfff.svg)](CONTRIBUTING.md)

</div>

---

## Why Globestudio?

Most open-source map tooling is built for engineers — tile servers, geocoding,
GIS data pipelines. Globestudio is built for the **other half of the stack**:
the landing-page hero shot, the launch teaser, the explainer scrollytell, the
deck slide that needs a globe but not a database.

Think of it as **a Shader Lab for maps and globes** — a designer-first canvas
with presets, effects, motion, and clean exports. Composable, web-native, and
yours to remix.

## Features

- 🌍 **Maps for any scope** — world, country, continent, subregion, US state
- 🔄 **Flat ↔ 3D globe** — same dot data, two views, smooth morph
- 🎨 **12 dot shapes + custom upload** — Circle · Hexagon · Triangle · Pentagon ·
  Square · Diamond · Star · Plus · Ring · Voxel · Particle Grid · ASCII glyphs ·
  your own SVG/PNG
- 🪄 **17 shader looks** — Halftone, Risograph, Newsprint, Aurora, Pixel,
  Bayer, Atkinson, Wireframe, CRT, Glitch, Bad TV, Bloom, Metal, Iridescent,
  Pencil, Corrupt — plus the base Default. Stackable on any preset.
- 🌈 **Gradients + alpha** on dot color, land fill, and country stroke
- ✨ **Live animations** — rotation, twinkle, size jitter, network arcs,
  motion-aware (respects `prefers-reduced-motion`)
- 🎛️ **17 curated presets** — every shader look is a one-click preset with
  matching backgrounds, density, dot size, and globe chrome. Shareable
  URLs at `/looks/:id`.
- 💾 **Real exports** — PNG (high-res via WebGL re-render), SVG (with shader
  effects baked in), WebM video (looped or one-shot), JSON config
- ⌨️ **Full keyboard system** — `S` shuffle, `[`/`]` cycle presets, `D` export,
  `R` reset, `G` toggle view, `H` toggle panel, `?` help
- ♿ **Accessibility** — WCAG 2.2 AA conformant. Keyboard-first, screen-
  reader proxy DOM for canvas state, focus trap on modals, motion
  preferences honored. See [`ACCESSIBILITY.md`](ACCESSIBILITY.md)

## Quickstart

### Use it

The live tool runs entirely client-side:

→ **[globestudio.app](https://globestudio.app/)**

Pick a country, tweak the look, export.

### Run it locally

Requires Node 20+ and npm.

```bash
git clone https://github.com/alevizio/globestudio
cd globestudio
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

### Build it

```bash
npm run build      # → dist/
npm run preview    # serve dist/ locally
npm test -- --run  # 119 tests across 18 files
```

## Embed it anywhere

Globestudio ships two embed paths — pick whichever fits the tool:

### One-line script tag (Recommended)

```html
<div data-globestudio data-look="halftone" data-density="50"
     style="width: 100%; height: 480px;"></div>
<script async src="https://globestudio.app/embed.js"></script>
```

~3kb gzipped, zero dependencies, works in Webflow / Squarespace / blog
posts / anywhere HTML is allowed. Every embed param has a matching
`data-*` attribute. Watches the DOM for later-added elements via
MutationObserver, so SPAs and dynamic content work too.

### Plain iframe

```html
<iframe
  src="https://globestudio.app/embed?look=halftone&density=70&autoSpin=1"
  width="100%"
  height="500"
  style="border:0"
  loading="lazy"
  title="Globestudio dotted globe"
></iframe>
```

**Query parameters:** `look`, `density`, `dotSize`, `dotColor`, `worldFill`,
`renderMode` (dots/solid), `selection` (`world`, `country:USA`,
`continent:Europe`, `subregion:Western Europe`), `motion`, `tiltX`,
`tiltY`, `autoSpin`, `view` (flat/globe), `static` (freeze motion for
static previews), `transparent`, `background`, `source` (analytics tag).

Resize-aware via `postMessage` — listen for
`{ type: "globestudio-resize", height }` from the embed and resize the
iframe to match. WebGL required; falls back to a still preview + a
"how to enable WebGL" panel if the GL context can't be created.

**Per-tool integration guides:**
[Webflow](docs/integrations/webflow.md) ·
[Framer](docs/integrations/framer.md) ·
[Figma](docs/integrations/figma.md) ·
[Notion](docs/integrations/notion.md) ·
[Plain HTML](docs/integrations/embed.md) ·
[All integrations →](docs/integrations/)

**Reading material:**
[How to make a dotted world map in 2026](docs/blog/2026-05-how-to-make-a-dotted-world-map.md) ·
[All articles →](docs/blog/)

## What you can build with it

| Use case | What it gives you |
|---|---|
| **Landing page hero** | A live animated globe behind your headline. Export PNG for static, WebM for video. |
| **Launch teaser** | Animated dot map of where your users are. WebM ready for X/LinkedIn. |
| **Deck visuals** | Per-country SVGs that drop straight into Keynote, Figma, or print layouts. |
| **Data story** | Hand-picked region + dot palette for a feature, blog post, or report. |
| **Brand system** | A consistent dotted-globe mark across your site, app, and docs. |
| **Stream / podcast graphic** | Looping WebM background with the CRT or Glitch preset. |

### Runnable examples

The [`examples/`](./examples) directory holds 7 reference projects with
runnable HTML and adaptation guides. Highlights:

- [`embed-snippet`](./examples/embed-snippet) — the minimum-viable iframe
  pattern. Copy into Webflow, Framer, Notion, plain HTML, anywhere.
- [`hero-globe`](./examples/hero-globe) — full-bleed animated globe behind
  a landing-page hero.
- [`shader-presets-showcase`](./examples/shader-presets-showcase) — all 16
  presets in one auto-fit gallery, perfect for picking a look.

Share what you make in [Show & Tell](https://github.com/alevizio/globestudio/discussions/categories/show-and-tell).

## Documentation

| | |
|---|---|
| [CONTRIBUTING](CONTRIBUTING.md) | Local setup, project shape, design rules, how to submit presets/examples |
| [ROADMAP](ROADMAP.md) | What's shipped, what's next, what's parked |
| [CHANGELOG](CHANGELOG.md) | What changed and when |
| [GOVERNANCE](GOVERNANCE.md) | How decisions get made |
| [CODE_OF_CONDUCT](CODE_OF_CONDUCT.md) | Community standards |
| [SECURITY](SECURITY.md) | Reporting vulnerabilities |
| [SUPPORT](SUPPORT.md) | Where to ask questions |

## How it compares

There's no shortage of map and globe tools — Globestudio doesn't try
to replace any of them. It owns the **aesthetic-asset shelf**: stylized
output that ships to a landing page hero, deck slide, OG card, or
launch teaser. Different tools for different jobs:

| | Globestudio | [globe.gl](https://github.com/vasturiano/globe.gl) | [Mapbox Studio](https://www.mapbox.com/mapbox-studio) | [Felt](https://felt.com) | [Haikei](https://haikei.app) |
|---|---|---|---|---|---|
| **3D globe out of box** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Dotted maps** | ✅ 12 shapes | partial | ❌ | ❌ | ❌ |
| **Shader aesthetic looks** | ✅ **17** | ❌ | custom WebGL only | ❌ | ❌ |
| **Multiple projections** | 5 | sphere only | many | many | n/a |
| **No-code GUI** | ✅ | ❌ library | ✅ | ✅ | ✅ |
| **PNG / SVG / WebM export** | ✅ | manual | print / PDF | ✅ | PNG / SVG |
| **Embed iframe** | ✅ `/embed` | DIY | ✅ | ✅ | DIY |
| **Framer / Webflow components** | ✅ | ❌ | plugins | ❌ | ❌ |
| **No signup / no API key** | ✅ | n/a | ❌ | ❌ | ✅ |
| **Free + MIT** | ✅ | ✅ (library) | freemium | paid | free, closed |

**What Globestudio gives up**: GIS-accurate data overlays, large dataset
analysis, real-time collaboration. If those are what you need, reach
for Mapbox / Felt / Kepler — they're great at them.

**Built on the shoulders of**: [globe.gl](https://github.com/vasturiano/globe.gl)
and [COBE](https://github.com/shuding/cobe) defined what a modern OSS
3D globe library looks like. [dotted-map](https://github.com/NTag/dotted-map)
is the engine under the dot field. [Stamen Maps](https://maps.stamen.com)
was the spiritual ancestor of "maps as visual aesthetic."

## Tech stack

Built with:

- **[React 19](https://react.dev)** + **[Vite](https://vite.dev)** for the app shell
- **[Three.js](https://threejs.org)** for the WebGL globe, instanced dot rendering, shader effects, network arcs
- **[dotted-map](https://github.com/NTag/dotted-map)** for the source dot field
- **[d3-geo](https://d3js.org/d3-geo)** + **[d3-geo-projection](https://github.com/d3/d3-geo-projection)** + **[topojson-client](https://github.com/topojson/topojson-client)** for projections (Mercator, Equal Earth, Winkel Tripel, Robinson) and topology decoding
- **[world-countries](https://github.com/mledoze/countries)** + **[world-atlas](https://github.com/topojson/world-atlas)** + **[us-atlas](https://github.com/topojson/us-atlas)** for source geography
- **[satori](https://github.com/vercel/satori)** + **[@resvg/resvg-js](https://github.com/yisibl/resvg-js)** for the OG share card pipeline (JSX → SVG → PNG at build time)
- **[Pixelarticons](https://pixelarticons.com)** by Gerrit Halfmann for the in-app icon set — 24×24 pixel-grid icons with `currentColor` fill so they theme cleanly
- **[Vitest](https://vitest.dev)** + **[Testing Library](https://testing-library.com)** + **[axe-core](https://github.com/dequelabs/axe-core)** for tests and the WCAG 2.2 AA accessibility guard

No backend, no accounts, no telemetry. Everything renders in your browser.

## Contributing

We want contributions. Code, presets, example projects, screenshots, docs
rewrites — all of it counts.

The shortest path:

1. **Build something cool with the live tool** → drop it in
   [Show & Tell](https://github.com/alevizio/globestudio/discussions/categories/show-and-tell)
2. **Found a bug?** → [Bug report](https://github.com/alevizio/globestudio/issues/new?template=bug-report.yml)
3. **Made a preset you love?** → [Preset submission](https://github.com/alevizio/globestudio/issues/new?template=preset-submission.yml)
4. **Have an idea?** → [Ideas discussion](https://github.com/alevizio/globestudio/discussions/new?category=ideas)

Full guide in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). Use it, remix it, ship it. If you use it commercially or
prominently we'd love to hear about it (no obligation, just curious).

The included geography data comes from
[world-atlas](https://github.com/topojson/world-atlas),
[us-atlas](https://github.com/topojson/us-atlas), and
[world-countries](https://github.com/mledoze/countries) — all with permissive
licenses. If you build on top of derived map data outside this repo,
double-check the source attributions.

---

<div align="center">

Made by **[@alevizio](https://github.com/alevizio)** · [alevizio.com](https://alevizio.com) · [twitter.com/alevizio](https://twitter.com/alevizio)

</div>
