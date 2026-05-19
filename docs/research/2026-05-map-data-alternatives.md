# Map data alternatives

**Date:** 19 May 2026
**Sources consulted:** Natural Earth + Wikipedia + 6 secondary mapping references + codebase audit
**Confidence:** High for data sources · Medium for designer-aesthetic fit
**Status:** Plan written → see [`docs/plans/map-data-rollout.md`](../plans/map-data-rollout.md)

## Executive summary

Worlddots ships with one map dataset (`world-atlas/countries-110m`,
the lowest-detail Natural Earth tier) plus US states from `us-atlas`.
Projections are limited to **Mercator** (for the flat plane) and
**Equirectangular** (for the sphere texture).

Three layered opportunities surfaced:

1. **Higher-resolution country data.** Upgrading from `countries-110m`
   to `countries-50m` adds detailed coastlines (small islands,
   nuanced peninsulas) at modest bundle cost. `countries-10m` is the
   maximum detail but bundle-heavy.
2. **New topology categories.** Rivers, lakes, populated places
   (cities), elevation contours — each opens a distinct designer
   aesthetic. Imagine a "dotted river systems of the Amazon" output
   instead of just country boundaries.
3. **Alternative projections.** Robinson, Winkel Tripel, Equal Earth,
   and Goode Homolosine are all single-line additions via d3-geo,
   each with a distinct visual character. Currently locked to
   Mercator/Equirectangular.

None are large engineering bets. Each adds in a day or two of work,
mostly data wiring + UI controls. The biggest design question is
**which** to ship — Worlddots is curated, not a general-purpose GIS
tool. The recommended path is two new datasets (rivers, populated
places) + three new projections (Equal Earth, Winkel Tripel,
Goode Homolosine) over the next 4 weeks.

## Current state

From the codebase audit:

| Data source              | Resolution | Coverage                |
| ------------------------ | ---------- | ----------------------- |
| `world-atlas/countries-110m` | 1:110m  | Country borders only    |
| `us-atlas/states-10m`    | 1:10m      | US state borders        |

Projections:
- Mercator (flat plane texture via `d3-geo` `geoMercator`)
- Equirectangular (sphere texture wrap via `geoEquirectangular`)

No rivers, no lakes, no cities, no elevation, no alternative
projections.

## Key findings

### Finding 1 — Natural Earth has three resolution tiers ✅

Natural Earth ships data at 1:10m, 1:50m, and 1:110m scales. All
public domain. Worlddots uses the lowest (110m).

| Tier   | Detail level                            | Bundle size impact      |
| ------ | --------------------------------------- | ----------------------- |
| 1:110m | Current. Major countries + simple borders | ~50KB gzipped         |
| 1:50m  | Detailed coastlines, mid-size islands   | ~200KB gzipped         |
| 1:10m  | Maximum detail. Small islands, archipelagos, narrow peninsulas | ~1.5MB gzipped |

The jump from 110m → 50m is the sweet spot. Coastlines visibly
improve (Italy's boot, Norway's fjords, Indonesia's islands) without
bundle bloat. 10m is overkill for a designer tool that fills 12k
dots — the dot grid would smooth out fine details anyway.

Sources:
- [Natural Earth — Admin 0 Countries 1:10m](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/) ✅
- [Natural Earth — Downloads](https://www.naturalearthdata.com/downloads/) ✅
- [topojson/world-atlas — Pre-built TopoJSON](https://github.com/topojson/world-atlas) ✅
- [martynafford/natural-earth-geojson — All Natural Earth as GeoJSON](https://github.com/martynafford/natural-earth-geojson) ✅

### Finding 2 — Rivers + populated places open distinct aesthetics ✅

Natural Earth ships several "physical vector" datasets that
Worlddots doesn't currently use:

| Dataset                    | What it adds                              | Aesthetic           |
| -------------------------- | ----------------------------------------- | ------------------- |
| **Rivers and lake centerlines** | River networks as polylines        | Organic flow, dendritic patterns |
| **Lakes**                  | Inland water polygons                     | Negative space accent |
| **Populated places**       | Cities as named points                    | Density-graduated city dots |
| **Coastlines**             | Standalone coastline (not part of country polygon) | Cleaner edge rendering |
| **Glaciers + ice shelves** | Polar ice features                        | Climate / arctic look |
| **Marine areas**           | Ocean basin polygons                      | Oceanographic theme |

Of these, **rivers** and **populated places** are the highest-leverage
adds for Worlddots's design language. Rivers create distinctive
dendritic patterns (the Amazon basin, Mississippi watershed, Nile
valley) that designers love. Populated places give a "city lights"
look — globally varying dot density that maps to where humans live.

Sources:
- [Natural Earth — 1:10m Physical Vectors](https://www.naturalearthdata.com/downloads/10m-physical-vectors/) ✅
- [Natural Earth — 1:10m Cultural Vectors](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/) ✅
- [Natural Earth — Features overview](https://www.naturalearthdata.com/features/) ✅

### Finding 3 — Projections are free additions via d3-geo ✅

`d3-geo` is already a dependency. Adding a new projection is
literally one `import` line + one switch case:

```js
import { geoRobinson, geoWinkel3, geoEqualEarth, geoInterruptedHomolosine } from "d3-geo-projection"
```

(Note: `d3-geo-projection` is the extended package, separate from
the core `d3-geo`. ~50KB gzipped, includes 50+ projections.)

The five highest-leverage additions for Worlddots:

| Projection         | Aesthetic                                  | Why it matters |
| ------------------ | ------------------------------------------ | -------------- |
| **Equal Earth**    | Modern (2018), equal-area, looks "right"   | Defaultable. Replaces Mercator's well-known size distortion. |
| **Winkel Tripel**  | National Geographic standard since 1998    | Most "official" feeling. |
| **Robinson**       | Compromise, was-the-standard pre-1998      | Familiar to anyone who learned geography pre-2000. |
| **Goode Homolosine** | Interrupted equal-area, distinctive shape | Bold design statement. Splits oceans. |
| **Eckert IV**      | Pseudo-cylindrical, equal-area             | Subtle, clean lines. |

Each is one switch case in `world-texture.js` and one entry in the
projection enum exposed to the user.

Sources:
- [d3-geo-projection — extended projections](https://github.com/d3/d3-geo-projection) ✅
- [Wikipedia — Winkel Tripel Projection](https://en.wikipedia.org/wiki/Winkel_tripel_projection) ✅
- [Map Library — 9 Map Projection Styles](https://www.maplibrary.org/1499/exploring-different-map-projection-styles/) ⚠️
- [Brilliant Maps — XKCD Map Projections](https://brilliantmaps.com/xkcd/) ⚠️

### Finding 4 — Elevation contours are too detailed for the design language ❌

OpenTopography + ETOPO1 datasets give contour line vectors at
arbitrary intervals. Could produce stunning topographic globes.

**However:** the data volume is massive (full-world contour vectors
at 100m intervals = ~50MB compressed) and the visual is fundamentally
*dense* — Worlddots's appeal is the breathable dotted aesthetic, not
information density.

Could be done as an *opt-in feature* for power users (paste a custom
TopoJSON file via the existing Custom Shape upload pattern). Not a
default-shipping data layer.

Sources:
- [OpenTopography contour line generation](https://opentopography.org/news/new-contour-line-generation-tool-now-available) ✅
- [SVG Contour Maps — James Croft](https://www.jamesrcroft.com/2018/02/svg-contour-maps/) ⚠️

### Finding 5 — TopoJSON simplification is built into the toolchain ✅

The current `world-atlas/countries-110m` is already TopoJSON with
quantization + simplification baked in. To add a 50m version,
the workflow is:

1. Download Natural Earth 1:50m Admin 0 Countries shapefile
2. Run through `mapshaper` or `toposimplify` to simplify
3. Output as TopoJSON
4. Bundle into `src/data/`

`mapshaper` is the go-to tool (free, web + CLI). Output bundle size
can be tuned by simplification %. Aim for ~200KB gzipped for 50m
countries.

For runtime simplification (let the user pick "show me at 50m vs
10m"), the data has to be bundled at the highest tier we'd ever
serve — pick a sensible default at build time instead.

Sources:
- [topojson/world-atlas pre-built tiers](https://github.com/topojson/world-atlas) ✅
- [mapshaper — interactive TopoJSON tool](https://mapshaper.org/) ✅

## Comparison table — Map data add candidates

Ranked by (1) designer demand × (2) implementation effort × (1 /
bundle size impact).

| Addition                       | Effort      | Bundle impact | Aesthetic value | Verdict   |
| ------------------------------ | ----------- | ------------- | --------------- | --------- |
| **Upgrade to 50m countries**   | XS (1 hour) | +150KB        | ★★★★★ (visible) | Ship v1   |
| **Equal Earth projection**     | XS (1 hour) | +50KB d3-geo-projection | ★★★★★    | Ship v1   |
| **Winkel Tripel projection**   | XS (~30 min, with above) | +0 | ★★★★         | Ship v1   |
| **Rivers + lakes overlay**     | S (1 day)   | +300KB        | ★★★★★ (distinctive) | Ship v2 |
| **Populated places (cities)**  | S (1 day)   | +200KB        | ★★★★            | Ship v2   |
| **Robinson projection**        | XS (~10 min, with the others) | +0 | ★★★         | Ship v2   |
| **Goode Homolosine**           | XS (10 min) | +0            | ★★★ (bold)      | Ship v2   |
| **10m countries (max detail)** | XS (1 hour) | +1.5MB        | ★★              | Reject (bundle) |
| **Elevation contours**         | M (3 days)  | +50MB         | ★★              | Reject (too dense) |
| **Glaciers/marine areas**      | S (1 day)   | +200KB        | ★★              | Pass (niche) |

## Risks & uncertainties

- **Bundle size discipline.** Worlddots's current bundle is already
  large (~700KB on the wire for Three.js + world-atlas combined).
  Adding 50m countries + rivers + cities = +650KB raw. Need to be
  ruthless about which datasets ship default vs. lazy-load.
- **Projection switching mid-session.** Currently the projection is
  baked into both the sphere texture and the flat plane texture. A
  user picking "Equal Earth" would need both to re-bake. The
  existing `createWorldTexture()` already accepts a projection
  parameter, so this is wiring not architecture.
- **Designer mental model.** Adding 5 projections may confuse
  designers who just want a "good" map. Default to Equal Earth
  (objectively the best modern compromise) and hide alternatives
  behind an "Advanced" toggle.
- **Rivers + cities at low resolution.** Natural Earth's 1:110m
  rivers are visibly chunky. Need to use 1:50m for rivers, which
  adds another ~150KB.
- **Mercator's specific value.** Web Mercator is the universal "you
  know this map" projection. Removing it would break expectations.
  Keep it as the default flat-mode projection; offer alternatives
  as opt-in.

## Recommendations

In priority order:

1. **Upgrade `countries-110m` → `countries-50m`** (~1 hour). One-line
   data swap, dramatically better coastlines. Highest leverage move.
2. **Add d3-geo-projection + ship Equal Earth as a projection
   option** (~2 hours). Modern default, equal-area, designer-loved.
3. **Add Winkel Tripel + Robinson + Goode Homolosine** as additional
   projection enum values (~30 min total after step 2).
4. **Ship rivers + lakes as a togglable overlay** (~1 day). New data
   layer in the existing "Selection" UI — when user picks "Rivers,"
   the dot pattern follows river polylines instead of country
   polygons.
5. **Ship populated places as a togglable "city density" mode**
   (~1 day). Dot size scales by population. Gives the "city lights"
   look that already exists in adjacent visualization tools.
6. **Document a Custom TopoJSON upload feature** as an open feature
   for v3 (mirrors the existing custom shape upload pattern). Power
   users can bring elevation contours, transit lines, anything.

Explicitly **reject**:

- 1:10m countries — bundle impact not worth the marginal detail.
- Elevation contours as default — too dense, wrong design language.
- Marine areas, glaciers — niche, low designer demand.

## Open questions

- Should the projection selection be at the *render mode* level
  (a property of Flat vs Globe) or independent? Sphere doesn't
  technically need a projection (it's a 3D sphere), but the texture
  UVs need one. Treat projection as a flat-mode-only control to
  reduce confusion.
- Lazy-loading vs upfront bundling for rivers/cities. If they're
  defaults, bundle. If they're opt-in, lazy-load on user enable.
  Lean toward lazy.
- Are there community-built custom topologies worth shipping? E.g.,
  political boundaries that match modern (post-2020) reality vs
  Natural Earth's 2018-era baseline? Probably not worth the
  political maintenance burden.
- Per-projection bounding box / region clipping. Currently the dot
  field is clipped to lat [-56, 71] (`DEFAULT_WORLD_REGION` from
  `dotted-map`). Some projections (Robinson, Equal Earth) extend
  beyond this. May need per-projection clip rules.

## Sources

1. [Natural Earth — Main downloads page](https://www.naturalearthdata.com/) — first-party ✅
2. [Natural Earth — Admin 0 Countries](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/) — first-party ✅
3. [Natural Earth — 1:10m Physical Vectors](https://www.naturalearthdata.com/downloads/10m-physical-vectors/) — first-party ✅
4. [Natural Earth — Features overview](https://www.naturalearthdata.com/features/) — first-party ✅
5. [topojson/world-atlas pre-built TopoJSON](https://github.com/topojson/world-atlas) — first-party ✅
6. [martynafford/natural-earth-geojson](https://github.com/martynafford/natural-earth-geojson) — community ✅
7. [d3/d3-geo-projection](https://github.com/d3/d3-geo-projection) — first-party ✅
8. [mapshaper interactive simplifier](https://mapshaper.org/) — first-party ✅
9. [Wikipedia — Winkel Tripel Projection](https://en.wikipedia.org/wiki/Winkel_tripel_projection) ✅
10. [Map Library — 9 Map Projection Styles](https://www.maplibrary.org/1499/exploring-different-map-projection-styles/) ⚠️
11. [Map Library — 11 Alternative Projection Explorations](https://www.maplibrary.org/1549/alternative-map-projection-explorations/) ⚠️
12. [Brilliant Maps — XKCD Map Projections](https://brilliantmaps.com/xkcd/) ⚠️
13. [Robinson vs. Winkel Tripel comparison](https://map-projections.net/compare.php?p1=robinson&p2=winkel-tripel) ⚠️
14. [Future Mapping Company — Top 10 World Projections](https://futuremaps.com/blogs/news/top-10-world-map-projections) ⚠️
15. [OpenTopography — contour line generation](https://opentopography.org/news/new-contour-line-generation-tool-now-available) ✅
16. [Geography Realm — Types of Map Projections](https://www.geographyrealm.com/types-map-projections/) ⚠️
