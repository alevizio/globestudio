# Example: `svg-country-pack`

> **Status**: 🟡 Stubbed — README only. Generation script + sample SVGs to come.

A pre-generated pack of dotted-style SVG country shapes that designers and
brand teams can drop straight into Figma, Sketch, Affinity, Illustrator,
Keynote, or print layouts.

## What this proves

Worlddots is useful **even if you never touch a browser**. The export is
clean SVG with semantic structure (one `<g>` per dot, classes for grouping),
optimized for downstream editing in vector tools.

## What's in the pack

For each of the 250+ supported countries:

- A **dotted SVG** at the default preset (Circle dots, density 40, dotSize
  10, transparent background)
- A **wireframe SVG** at the Wireframe preset (Hexagon dots, higher density)
- A **solid-fill SVG** at the Print preset
- A **PNG preview** for at-a-glance browsing

```
svg-country-pack/
├─ README.md
├─ generate.mjs                  (the script that builds the pack)
├─ countries/
│  ├─ usa/
│  │  ├─ default.svg
│  │  ├─ wireframe.svg
│  │  ├─ print.svg
│  │  └─ preview.png
│  ├─ brazil/
│  ├─ japan/
│  └─ … (250+)
└─ index.html                    (gallery with download links)
```

## How the generator works

The script uses Worlddots' internal modules directly — no live browser
required:

```js
// Sketch
import { createCountryMapData } from "../../src/utils/dot-generation.js";
import { createDottedSvg } from "../../src/utils/svg-markup.js";
import { lookPresets } from "../../src/data/look-presets.js";

for (const country of countries) {
  for (const preset of ["default", "wireframe", "print"]) {
    const mapData = createCountryMapData([country.cca3], preset.density);
    const svg = createDottedSvg({ ...preset.settings, mapData });
    fs.writeFileSync(`countries/${country.cca3}/${preset.id}.svg`, svg);
  }
}
```

Runs in ~30 seconds for 250 countries × 3 presets = 750 SVGs.

## Licensing

- The **generated SVGs** are MIT (same as Worlddots).
- The **source geography** is from [world-atlas](https://github.com/topojson/world-atlas)
  and [world-countries](https://github.com/mledoze/countries) — both
  permissive. Attribution should be included in any downstream use that
  redistributes the SVGs at scale.

## Why this matters

Brand teams asked for this directly: "I need 50 dotted country shapes for
our customer logos page, but I don't want to open the live tool 50 times."
A generation script + a static pack solves it.

## Want to build this?

This one's mostly script-writing — no API design needed first. Open a PR with
the `generate.mjs` script + a sample of 3-5 countries' output, and we'll
help you scale it to the full set.

[→ Start working on it](https://github.com/alevizio/worlddots/issues/new?template=feature-request.yml)
