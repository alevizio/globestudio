# Map data rollout plan

**Status:** Draft
**Date opened:** 19 May 2026
**Owner:** Alejandro
**Research basis:** [`docs/research/2026-05-map-data-alternatives.md`](../research/2026-05-map-data-alternatives.md)

## Goal

Expand Globestudio's map data palette in three orthogonal directions:
**resolution** (better coastlines), **projection** (modern equal-area
alternatives), and **topology categories** (rivers, cities). Each
new data point opens distinct designer aesthetics. Maintain bundle
discipline — opt-in for anything over 300KB.

## Non-goals

- **Not shipping 1:10m countries** (bundle impact not worth marginal detail).
- **Not shipping elevation contours by default** — wrong density.
- **Not removing Mercator.** It's the universal "everyone knows this"
  projection; default Equal Earth but keep Mercator selectable.
- **Not building a GIS-style data layer editor.** Globestudio stays
  curated.

## Phases

Ordered by impact × effort. Phase 1 is essentially free; Phase 4 is
the headline feature.

---

### Phase 1 — Upgrade to 1:50m countries (~1 hour)

Replace the current 1:110m country borders with 1:50m. Same data
source, ~5x more detail (small islands, fjords, narrow peninsulas
become visible).

#### Tasks

- [ ] Download `countries-50m.json` from `topojson/world-atlas` (or
      generate via `mapshaper` from Natural Earth 1:50m).
- [ ] Replace `src/data/world-countries-topology.js` content with
      the 50m TopoJSON.
- [ ] Verify the existing `loadWorldCountries()` loader handles the
      new structure (should be identical, just denser geometry).
- [ ] Test density at min (1) → max (90) — at density 1 with 50m
      data, the dotted map should still read cleanly. At density
      90 the extra coastline detail should be visible.
- [ ] Measure bundle size before/after. Expect ~+150KB gzipped.
- [ ] Commit + deploy.

#### Acceptance

- Italy's boot has visible toe shape.
- Norwegian coastline shows fjord indentations.
- Indonesia archipelago shows distinct islands.
- Bundle size increase < 200KB gzipped.

---

### Phase 2 — Equal Earth + Winkel Tripel + Robinson projections (~3 hours)

Adds three alternative projections via `d3-geo-projection`. The
package brings 50+ projections; we expose four (current Mercator +
three new). Other projections available as a stretch.

#### Tasks

- [ ] `npm install d3-geo-projection` (~50KB gzipped).
- [ ] In `src/three/world-texture.js`, accept a `projection` parameter:
      ```js
      import { geoEqualEarth, geoWinkel3, geoRobinson } from "d3-geo-projection"
      import { geoMercator } from "d3-geo"
      
      const PROJECTIONS = {
        mercator: geoMercator,
        equalEarth: geoEqualEarth,
        winkelTripel: geoWinkel3,
        robinson: geoRobinson,
      }
      ```
- [ ] Wire a `projection` setting into the global state (alongside
      `look`, `density`, etc.) — defaults to `equalEarth`.
- [ ] Add a projection dropdown in the control panel under a new
      "Advanced" section (or extend the existing "Globe" section).
- [ ] Update `createWorldTexture()` to use the selected projection.
- [ ] Verify all 4 projections render correctly for both flat plane
      AND sphere texture path (sphere uses equirectangular for the
      UV unwrap — projection only affects the flat texture).
- [ ] Add the projection to `look-presets.js` schema so presets
      can pin a projection.

#### Acceptance

- User can switch between 4 projections live; canvas re-bakes
  texture in ~200ms.
- Default load shows Equal Earth (most-balanced, modern).
- Mercator-pinned presets still render correctly.
- Bundle size increase < 70KB gzipped (d3-geo-projection is ~50KB).

---

### Phase 3 — Goode Homolosine + Eckert IV (~30 minutes)

Two more projection options once Phase 2 lands. Both are one
import + one enum entry.

#### Tasks

- [ ] `import { geoInterruptedHomolosine, geoEckert4 } from "d3-geo-projection"`
- [ ] Add to the `PROJECTIONS` map.
- [ ] Add entries to the projection dropdown.
- [ ] Bake preview thumbnails for the chip UI showing the distinctive
      shape of each projection (especially Goode Homolosine's
      interrupted oceans).

#### Acceptance

- 6 projections available in the dropdown.
- Each projection's silhouette is recognizable from a thumbnail.

---

### Phase 4 — Rivers + lakes overlay (~1 day)

Adds a new "Topology" selector — designers pick whether they want
country borders (current), river systems, or both layered. Distinct
visual identity per choice.

#### Tasks

- [ ] Download `ne_50m_rivers_lake_centerlines.json` from Natural
      Earth 1:50m physical vectors. Simplify via mapshaper to ~150KB.
- [ ] Add as `src/data/world-rivers-topology.js`.
- [ ] Lazy-load the rivers data (only fetched when user enables
      rivers) — avoids the unnecessary bundle bloat at first paint.
- [ ] Extend the selection UI to add "Rivers" as a topology mode
      alongside "Countries", "Regions", "Subregions", "US States".
- [ ] Update `dotted-map` integration to render dots along river
      polylines instead of inside country polygons when in "Rivers"
      mode.
- [ ] Add "Show borders + rivers" combo mode so designers can layer
      both. Dots inside countries + lighter dots along rivers.
- [ ] Create 1-2 look presets that lean into the river aesthetic
      (e.g., "River Networks" preset with halftone-aqua tint).

#### Acceptance

- User can select "Rivers" topology and see dotted Amazon basin,
  Nile, Mississippi, Yangtze.
- Combined "Borders + Rivers" mode renders both layers visibly.
- Rivers data is lazy-loaded (initial bundle doesn't grow).

---

### Phase 5 — Populated places (city density) (~1 day)

Cities-as-dots, with size scaled by population. The "city lights at
night" aesthetic.

#### Tasks

- [ ] Download `ne_50m_populated_places_simple.json` (~150KB), with
      `POP_MAX` field per city.
- [ ] Add as `src/data/world-cities-topology.js`. Lazy-loaded.
- [ ] Add "Cities" topology mode. Dot size scales with population
      (log curve so small cities are still visible).
- [ ] Filter slider — "Min population" (0 = all cities, 1M = major
      cities only).
- [ ] Cities mode combo with borders mode (dots layered).
- [ ] Look presets that use cities ("Megalopolis" preset emphasizing
      the largest 100 cities; "Inhabited" preset showing all cities
      faintly).

#### Acceptance

- "Cities" topology renders ~6,400 city dots at varied sizes.
- Min-population filter lets designers focus on big cities or all.
- The aesthetic is distinct from country-borders mode.

---

### Phase 6 (open feature) — Custom TopoJSON upload

Mirror the existing "Custom shape" pattern. Users paste a TopoJSON
file or URL → Globestudio uses it as the dot source. Unlocks
elevation contours, transit lines, custom regions.

#### Tasks (open)

- [ ] Extend the existing custom shape upload UI with a "Topology"
      tab that takes TopoJSON / GeoJSON.
- [ ] Validate the upload (reject non-spec files).
- [ ] Allow per-feature property filters (e.g., "only show features
      where `type === 'rail'`").
- [ ] Cache uploaded topologies in localStorage.
- [ ] Document the format expectations in the README.

#### Acceptance

- User can paste a TopoJSON URL or file and see it as dots.
- Spec-violating files surface a clear error.
- Workflow doc walks through "make your own dotted map from any
  geo data."

---

## Open questions

- **Default projection.** Equal Earth (objectively best modern
  compromise) vs Mercator (universal familiarity). My instinct:
  default Equal Earth, advertise "modern projection" as a feature.
- **Sphere projection.** Globes are 3D so the texture wrap projection
  matters less, but UV math still uses one. Should we switch the
  sphere's UV unwrap projection too, or keep equirectangular forever?
- **Rivers + cities in selection UI.** Are they "topology modes" (one
  at a time) or "layers" (combinable)? Layers gives more flexibility
  but explodes the UI surface. Start with modes; add layered combos
  later if requested.
- **Performance with 6,400 city dots.** At density 90 with city dots,
  total instance count could climb to 20k. May need to revisit the
  density cap or add per-topology density scaling.
- **Political maintenance** — adopting higher-resolution country data
  means more frequent updates as borders change. Natural Earth ships
  major updates every 1-2 years.

## Status log

- **2026-05-19** — Plan drafted from research. No code yet.
