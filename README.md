<div align="center">

# Worlddots

**Open-source dotted maps and animated 3D globes for designers, animators, and creative developers.**

Pick a country or the whole world, customize dots and shapes, apply shader effects, and export PNG, SVG, or animated WebM. Built on React + Three.js.

[**worlddots.app**](https://worlddots.app/) · [Live demos](https://worlddots.app/) · [Roadmap](ROADMAP.md) · [Discussions](https://github.com/alevizio/worlddots/discussions)

[![Deploy status](https://github.com/alevizio/worlddots/actions/workflows/deploy.yml/badge.svg)](https://github.com/alevizio/worlddots/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-f6f2ea.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-9adfff.svg)](CONTRIBUTING.md)

</div>

---

## Why Worlddots?

Most open-source map tooling is built for engineers — tile servers, geocoding,
GIS data pipelines. Worlddots is built for the **other half of the stack**:
the landing-page hero shot, the launch teaser, the explainer scrollytell, the
deck slide that needs a globe but not a database.

Think of it as **a Shader Lab for maps and globes** — a designer-first canvas
with presets, effects, motion, and clean exports. Composable, web-native, and
yours to remix.

## Features

- 🌍 **Maps for any scope** — world, country, region, subregion, US state
- 🔄 **Flat ↔ 3D globe** — same dot data, two views, smooth morph
- 🎨 **12 dot shapes + custom upload** — Circle · Hexagon · Triangle · Pentagon ·
  Square · Diamond · Star · Plus · Ring · Voxel · Particle Grid · ASCII glyphs ·
  your own SVG/PNG
- 🪄 **Shader effects** — bloom, chromatic split, CRT, halftone, pixel,
  threshold, edge, glitch, wave
- 🌈 **Gradients + alpha** on dot color, land fill, and country stroke
- ✨ **Live animations** — rotation, twinkle, size jitter, network arcs,
  motion-aware (respects `prefers-reduced-motion`)
- 🎛️ **10+ presets** — Default, Print, Wireframe, CRT, Glitch, Bloom, Pixel,
  ASCII, Topo, Space. Shareable URLs at `/looks/:id`.
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

→ **[worlddots.app](https://worlddots.app/)**

Pick a country, tweak the look, export.

### Run it locally

Requires Node 20+ and npm.

```bash
git clone https://github.com/alevizio/worlddots
cd worlddots
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

Worlddots ships an iframe-friendly `/embed` route — drop the globe into
Webflow, Framer, Notion, plain HTML, or any iframe-supporting tool:

```html
<iframe
  src="https://worlddots.app/embed?look=halftone&density=70&autoSpin=1"
  width="100%"
  height="500"
  style="border:0"
  loading="lazy"
  title="Worlddots dotted globe"
></iframe>
```

**Query parameters:** `look`, `density`, `dotSize`, `dotColor`, `worldFill`,
`renderMode` (dots/solid), `selection`, `motion`, `tiltX`, `tiltY`,
`autoSpin`, `view` (flat/globe), `static` (freeze motion for static
previews), `transparent`, `background`, `source` (analytics tag).

Resize-aware via `postMessage` — listen for
`{ type: "worlddots-resize", height }` from the embed and resize the
iframe to match. WebGL 2 required; falls back to a "your browser doesn't
support WebGL 2" message if not available.

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

Share what you make in [Show & Tell](https://github.com/alevizio/worlddots/discussions/categories/show-and-tell).

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

## Tech stack

Built with:

- **[React 19](https://react.dev)** + **[Vite](https://vite.dev)** for the app shell
- **[Three.js](https://threejs.org)** for the WebGL globe, instanced dot rendering, shader effects, network arcs
- **[dotted-map](https://github.com/NTag/dotted-map)** for the source dot field
- **[d3-geo](https://d3js.org/d3-geo)** + **[topojson-client](https://github.com/topojson/topojson-client)** for projections and US state geometry
- **[world-countries](https://github.com/mledoze/countries)** + **[world-atlas](https://github.com/topojson/world-atlas)** + **[us-atlas](https://github.com/topojson/us-atlas)** for source geography
- **[lucide-react](https://lucide.dev)** for icons
- **[Vitest](https://vitest.dev)** + **[Testing Library](https://testing-library.com)** for tests

No backend, no accounts, no telemetry. Everything renders in your browser.

## Contributing

We want contributions. Code, presets, example projects, screenshots, docs
rewrites — all of it counts.

The shortest path:

1. **Build something cool with the live tool** → drop it in
   [Show & Tell](https://github.com/alevizio/worlddots/discussions/categories/show-and-tell)
2. **Found a bug?** → [Bug report](https://github.com/alevizio/worlddots/issues/new?template=bug-report.yml)
3. **Made a preset you love?** → [Preset submission](https://github.com/alevizio/worlddots/issues/new?template=preset-submission.yml)
4. **Have an idea?** → [Ideas discussion](https://github.com/alevizio/worlddots/discussions/new?category=ideas)

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
