# Example: `shader-presets-showcase`

> **Status**: 🟡 Stubbed — README only. Code to come.

A side-by-side gallery showing all 10+ built-in presets running live. The
intent is half marketing piece, half interactive documentation.

## What this proves

Worlddots is a **creative surface**, not just a map renderer. The shader
effect system isn't an afterthought — it's the reason the tool exists.

## Planned design

```
┌────────────────────────────────────────────────────────────┐
│  Worlddots — Look Gallery                                  │
├──────────┬──────────┬──────────┬──────────┬───────────────┤
│  Default │  Print   │ Wireframe│   CRT    │   Glitch      │
│  [globe] │  [globe] │  [globe] │  [globe] │  [globe]      │
│  small   │  small   │  small   │  small   │  small        │
├──────────┼──────────┼──────────┼──────────┼───────────────┤
│  Bloom   │  Pixel   │  ASCII   │   Topo   │   Space       │
│  [globe] │  [globe] │  [globe] │  [globe] │  [globe]      │
│  small   │  small   │  small   │  small   │  small        │
└──────────┴──────────┴──────────┴──────────┴───────────────┘
```

Hovering a cell brings up the preset name + a short description + an "Open
in tool" button that links to `/looks/:id`.

## Performance considerations

Running 10 globes at once is **not free**. The plan:

- Globes are paused (no render loop) when their cell is offscreen via
  IntersectionObserver
- Default DPR is 1 (no Retina) in the gallery — full resolution kicks in
  only when a cell is hovered
- Each globe shares the same `mapData` to avoid duplicate dot generation
- Render loops are throttled to 30fps in the gallery (instead of 60)

If a user's device can't handle even that, we swap to pre-rendered PNGs.

## Planned structure

```
shader-presets-showcase/
├─ README.md
├─ package.json
├─ index.html
├─ src/
│  ├─ main.jsx
│  ├─ Gallery.jsx
│  ├─ PresetCell.jsx
│  └─ shared-mapdata.js
└─ public/
   └─ static-fallbacks/
      ├─ default.png
      ├─ wireframe.png
      └─ …
```

## Why this matters

Right now the only way to compare presets is to click each one in the live
tool — which means resetting your other settings. The showcase makes the
difference between presets visible at a glance, which is useful for:

- **Documentation** — "show me what 'Glitch' looks like before I pick it"
- **Inspiration** — "I want something similar to 'Print' but darker"
- **Bug surface** — a single page that exercises every shader is a great
  smoke test

## Want to build this?

This is the most front-end-friendly example. If you've never contributed to
Worlddots and want a starter project, this is a good one. The hardest part
is the perf budget for running 10 globes — the rest is React + CSS Grid.

[→ Open an issue](https://github.com/alevizio/worlddots/issues/new?template=feature-request.yml)
or just open a draft PR and we'll iterate.
