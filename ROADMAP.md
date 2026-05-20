# Roadmap

What we're building, what's queued, what's "maybe." Updated when direction
shifts — last revised May 2026.

This is intentionally directional, not a contract. If a feature is on this
list and matters to you, [open a Discussion](https://github.com/alevizio/globestudio/discussions/categories/ideas)
and we'll prioritize accordingly.

---

## Shipped

The version on `main` already does all of this:

- Dotted maps for **world, country, region, subregion, and US state**
- Switching between **flat 2D and interactive 3D globe** view
- **12 dot shapes** (Circle, Hexagon, Triangle, Pentagon, Square, Voxel,
  Particle Grid, Diamond, Star, Plus, Ring, ASCII) + custom SVG/PNG upload + paste
- **WebGL shader effects**: bloom, chromatic split, CRT, halftone, pixel,
  threshold, glitch, wave, edge
- **Per-position linear gradients** on dot color and solid land/stroke with
  per-stop opacity
- **Look presets** (Default, Print, Wireframe, CRT, Glitch, Bloom, Pixel,
  ASCII, Topo, Space) with shareable `/looks/:id` URLs
- **Animated network arcs** on the globe
- **Live animations** — rotate, twinkle, size jitter
- **Exports**: PNG (high-res via canvas re-render), SVG, WebM, config JSON
- **Full keyboard system** (`S` shuffle, `[`/`]` cycle presets, `D` export,
  `R` reset, `G` toggle view, `H` toggle panel, `?` help)
- **Solid mode**: filled land + stroked borders with visibility toggles,
  stroke width, gradient + opacity on both
- **Custom color picker** — draggable card with Solid/Gradient modes,
  HEX/RGB/HSB/HSL, and live alpha checkerboard previews

---

## Now — next 4–6 weeks

The "v1 polish" pass before a real launch push.

- **Performance baseline.** Define the floor (60fps desktop, 30fps mobile at
  the default look) and gate PRs against it.
- **Example gallery.** 4–6 example repos showing the tool in real product
  contexts (landing hero, deck, animated launch teaser, country map embed).
- **Preset API stability.** Lock the `look-presets.js` schema so community
  submissions are forward-compatible.
- **Docs site or `/docs` route.** Right now everything is in the README + tool.
- **Codebase tidying.** Some components are >150 lines and need splitting per
  the design system rules in CONTRIBUTING.

## Soon — next 2–3 months

The "credible OSS" pass.

- **Multi-stop gradients** — currently two stops; bump to N stops with
  draggable positions on the track.
- **Radial + conic gradients** alongside linear.
- **Per-country fill** — solid mode currently uses one color for all selected
  countries. Add per-country palette support for data-story workflows.
- **Animation timeline** — keyframe rotation, zoom, effect intensity for
  WebM export so users don't have to record the live state.
- **Embeddable mode.** A read-only iframe-friendly route that takes a config
  JSON or look ID and renders just the canvas. Unlocks "drop this on your
  landing page."
- **State-level solid rendering.** US states already work for dots; extend the
  same filter logic to the solid world texture.

## Later — 3–6 months

The "could be huge" pass.

- **More base map styles** — bathymetry, topography, terrain shading as toggleable
  layers on the solid mode.
- **Data binding.** Bind dot color/size/opacity to a CSV or simple data
  source for choropleth-style stories without writing code.
- **Time-based animation.** Animate the gradient angle, dot rotation, or
  shader intensity along a timeline.
- **More languages for country search.** Currently English only.

## Maybe / parked

Ideas that have come up but aren't actively planned. Open a Discussion if
you'd vote one of these up:

- A native desktop wrapper (Tauri/Electron)
- Plugin system for third-party shader passes
- Server-rendered exports at higher fidelity than the browser can manage
- Print-ready CMYK output
- WebGPU pipeline alongside the WebGL one

## Won't do

Conscious "no" decisions, listed so contributors don't sink time:

- **Generic GIS / map SDK functionality** (geocoding, routing, tile servers).
  There are better libraries for that. Globestudio is a designer motion tool,
  not a map platform.
- **Closed-source / paid features.** The whole product is MIT.
- **3rd-party data syncing / accounts.** Exports go to the user's machine; no
  server-side state.

---

If something here matters to you, the fastest way to move it up the list is
to [start a Discussion](https://github.com/alevizio/globestudio/discussions/new?category=ideas)
or open a PR with a small proof-of-concept.
