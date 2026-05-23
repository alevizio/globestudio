# Example: `svg-country-pack`

> **Status**: 🟢 Ready (workflow documented) — one SVG per country, on demand

A pre-generated pack of dotted-style SVG country shapes that designers
and developers can drop into Illustrator / Figma / Affinity workflows.
Vector format means they scale infinitely, can be recolored without
rasterization, and play nicely with print pipelines.

## What this proves

Globestudio produces real, editable vector output — not just bitmap
exports. The same tool that drives the live globe also generates
production-grade SVG for brand systems, print artwork, and motion
graphics in After Effects.

## Recipe — generate one SVG per country

1. Open [globestudio.app](https://globestudio.app/).
2. Set **Selection** → pick a country (e.g., "France").
3. Set **Surface → Style** → Solid. Land off, Stroke on.
4. Tune **Density** to 60-80 for a clean print-ready dot field.
5. Pick a preset (`/looks/default` is the cleanest for SVG; the shader
   effects only render in raster).
6. **Export → SVG**.

That's the manual path for one country. To batch all 250, see below.

## Batch generation (script-friendly)

Globestudio's URL params + the SVG export keyboard shortcut combine into
a scriptable batch:

```bash
# Pseudocode — for a real implementation you'd use Playwright or
# Puppeteer to drive a headless browser
for code in USA CAN MEX BRA FRA DEU ITA ESP CHN JPN KOR ...; do
  open "https://globestudio.app/looks/default?country=$code"
  # wait for canvas to settle
  # trigger keyboard "S" to export SVG
done
```

A real batch script lives on the roadmap — see
[docs/plans/integrations-rollout.md](../../docs/plans/integrations-rollout.md)
Phase 6 (Custom TopoJSON upload) which adds the orthogonal capability
of taking arbitrary regions as input.

## When to reach for this

- Designer needs a stylized country shape for a hero card / icon set
- Print designer needs vector for high-res scaling without quality loss
- Brand system designer needs a consistent visual treatment across many
  countries (e.g., regional pages for a global SaaS company)
- After Effects motion designer wants to import a clean SVG to animate

## Output format

SVG output from Globestudio:

- Pure SVG primitives (`<circle>` for each dot, `<path>` for solid
  fills, `<polygon>` for stroked borders)
- viewBox sized to the dotted-map projection bounds
- No external dependencies (fonts, raster textures)
- Layer structure preserved (background, dots, fills, strokes are
  separate `<g>` groups)
- ~10-100KB per country depending on density

## Sample colorspace recipe

For a Figma-ready brand-system pack, a designer might do:

```
density: 70
dotColor: #1a1a1a    (near-black for light backgrounds)
dotSize: 9
shape: Circle
worldFill: transparent
worldStroke: transparent
```

Export at default settings → drop into Figma → fill the dots from your
brand palette via Find & Replace on color.

## See also

- [`conference-badge`](../conference-badge/) — when you want PNG instead
  of SVG (print artwork)
- [`embed-snippet`](../embed-snippet/) — when you want live web embed
  instead of static artwork

## License

The Globestudio tool is MIT (preserve `LICENSE` + `NOTICE` when
redistributing source or built bundles — `NOTICE` credits Pixelarticons
and the open atlases). The SVGs you export are yours; no attribution
on the exports themselves. Country geometry is derived from
[world-atlas](https://github.com/topojson/world-atlas) (ISC) and
Natural Earth (public domain).
