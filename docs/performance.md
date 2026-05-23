# Performance budget

The floor Globestudio commits to, and the gates that enforce it.

## Runtime targets

The "default look" baseline (Default preset, world selection, dotted
render, default density, autospin on):

| Surface | Target | Notes |
|---|---|---|
| Desktop (M1 / Ryzen 5 5600 class) | 60 fps sustained | Including subtle UI interactions |
| Mobile (iPhone 12 / Pixel 5 class) | 30 fps sustained | Pause on tab blur |
| Default preset → first interaction | < 1.5 s on a fast 3G mobile | After cache miss |

These are the floor, not the target. Anything that drops the default
look below this on the listed hardware is a regression.

## Lighthouse thresholds

`.lighthouserc.json` is the source of truth. CI fails when:

| Metric | Threshold |
|---|---|
| Performance score | ≥ 0.85 |
| Accessibility score | ≥ 0.95 |
| SEO score | ≥ 0.9 |
| Largest Contentful Paint | ≤ 2500 ms |
| Cumulative Layout Shift | ≤ 0.1 |
| Total Blocking Time | ≤ 300 ms (warn) |
| First Contentful Paint | ≤ 1800 ms (warn) |

Run locally:

```bash
npm run build
npx --yes @lhci/cli@0.14.x autorun
```

## Bundle-size budget

The current shape of the build (gzip): about **284 kB** initial payload,
~770 kB more deferred until the canvas mounts. `scripts/check-bundle-size.js`
enforces per-chunk ceilings — see that file for the exact numbers; the
diff history is the audit trail.

| Layer | Loaded when | Budget (gzip) |
|---|---|---|
| Initial JS + CSS | First paint | ≤ 302 kB total |
| `globe-background` chunk | Canvas mount | ≤ 39 kB |
| `three` chunk | Canvas mount | ≤ 160 kB |
| `dotted-map` chunk | App boot | ≤ 170 kB |
| `countries-50m` atlas | Solid render mode | ≤ 260 kB |
| `states-10m` atlas | US state selection | ≤ 45 kB |

Run locally:

```bash
npm run build && npm run check:bundle
```

When a budget is wrong (real growth needed, not a regression), update
the constant in `scripts/check-bundle-size.js` in the same commit that
adds the new code — the diff is the explanation.

## What's already lazy

These do not block first paint:

- `<GlobeBackground>` via `React.lazy` (App.jsx) — three.js, post-effect
  shaders, network arcs, space-mesh
- `loadWorldCountries()` — only called when `renderMode === "solid"`
- `loadUsStates()` — only called when the user picks `country:USA`
- `loadWorldRivers()` / `loadWorldCities()` — only when their toggle is on
- Per-shader effect files — Vite static-analysis splits these per import

## What's not lazy (yet)

- `dotted-map` engine (~150 kB gzip) — App.jsx calls
  `createCountryMapData` synchronously inside a `useMemo` for the initial
  dot field. Moving this behind a Suspense boundary would defer the
  chunk but introduces async state in multiple downstream consumers
  (svg-markup export, embed-view, control-panel previews). Tracked but
  not blocking the v1 floor.

## How to investigate a regression

1. `npm run check:bundle` — does any chunk exceed its budget?
2. If yes: `npx vite-bundle-visualizer` (or `rolldown --stats`) to find
   the bloat.
3. Open the production build in DevTools Performance tab. Record a 5s
   interaction (rotate the globe, switch preset). Look for long tasks
   over 50ms.
4. The shader compilation pass is the single most expensive event on
   first paint — if a new shader was added, check it lazy-compiles only
   on demand (see `src/three/post-effects.js` for the pattern).
