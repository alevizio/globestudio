# Example: `conference-badge`

> **Status**: 🟢 Ready — config-driven, PNG-exportable

A single-country dotted map sized for conference badge artwork. Built
around the Wireframe preset so the result reads at small sizes (40-60mm
on print) and stays crisp under aggressive resampling for tablet
nametags or kiosk loop screens.

## What this proves

Globestudio isn't only for screens — designers reach for it for **print**
too. Conference designers want a single country / region, a clean
preset, a high-res PNG export, and a SVG fallback for vector layouts in
InDesign / Affinity Publisher.

## Recipe

1. Open [globestudio.app](https://globestudio.vercel.app/looks/wireframe).
2. **Selection** → pick your country (e.g., "United States" for an
   American conference, "Germany" for Berlin Tech Week).
3. **Surface → Style** → Solid. Land off, Stroke on.
4. **Projection** → Mercator (default) or Equal Earth (for an
   "intentional" feel beyond standard map).
5. **Rivers** → optional. Looks great on countries with notable river
   systems (Brazil for the Amazon, Egypt for the Nile, Russia/China for
   the Volga + Yangtze).
6. **Export → PNG** at 2× or 3× resolution. Target 300dpi at your
   intended print size:
   - A6 (105×148mm, ~1240×1748px @ 300dpi) — standard badge size
   - Square 80mm (~944×944px @ 300dpi) — lanyard tag
   - Tabloid 11×17in (~3300×5100px @ 300dpi) — kiosk poster
7. Bring into InDesign / Affinity / Figma; layer with your brand
   typography on top.

## Configuration JSON

The `config.json` in this folder is the exact preset that produces the
hero image. Drop it into Globestudio via **Export → Import config** to
reproduce the exact result.

## Typography pairing notes

Wireframe sits well with serif typography (Tiempos, Spectral) and
heavyweight sans (Söhne Breit, Inter Display Bold). It tends to
overpower mid-weight humanist sans like Sectra Display — give the type
space when pairing.

## Print specs

- **CMYK conversion**: Globestudio exports sRGB. Convert in your DTP tool;
  most modern presses handle the conversion well, but check muddy
  midtones if you're using the Risograph or Newsprint shaders.
- **Bleed**: there's no built-in bleed in the PNG export. Add 3-5mm in
  your DTP tool after import.
- **Min print size**: dot patterns degrade below ~30mm wide. Stick to
  badge-size or larger.

## Why this matters

Every quarter, conference designers need region-specific maps for
badges, signage, talk slides. Globestudio is the right tool — but most
designers reach for it once, can't find the export settings that work
for print, and bounce. This example documents the exact workflow so
they ship.

## See also

- [`embed-snippet`](../embed-snippet/) — for digital signage / kiosk loops
- [`svg-country-pack`](../svg-country-pack/) — for vector workflows in Illustrator
