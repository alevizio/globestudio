# Example: `funding-map-story`

> **Status**: 🟡 Stubbed — README only. Code to come.

A scrollytelling article that uses Worlddots maps as section anchors. As the
reader scrolls, the map zooms from world → region → country → state,
highlighting different data at each scope.

## What this proves

Worlddots can power **narrative data journalism** — not just decorative
visuals. The same selection / preset machinery that drives the live tool
also drives a guided story.

## Use cases we have in mind

- **Annual reports** — "Where our customers are this year"
- **Climate / policy stories** — country-by-country emissions, flowing into
  state-level detail for the US
- **Launch maps** — where your beta users came from, animated over time
- **Travel pieces** — a route across multiple countries with dot density
  intensity scaling by miles spent

## Planned structure

```
funding-map-story/
├─ README.md
├─ package.json
├─ index.html
├─ src/
│  ├─ main.jsx
│  ├─ Story.jsx                  (long-form article scroll)
│  ├─ MapStep.jsx                (sticky map that re-renders per scroll-step)
│  └─ steps/
│     ├─ step-1-world.js         (preset + selection for world view)
│     ├─ step-2-region-eu.js
│     ├─ step-3-country-de.js
│     ├─ step-4-state-bavaria.js (if region supports states)
│     └─ step-5-summary.js
├─ data/
│  └─ funding.csv                (per-country values feeding the gradient)
└─ public/
   └─ exports/                   (pre-rendered PNG fallbacks per step)
```

## Tech sketch

The standard pattern is:

1. Use [`intersection-observer`](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
   to detect which step is in the viewport.
2. Apply that step's preset + selection to the live tool.
3. Bind the gradient `from`/`to` to a normalized value from `funding.csv`.
4. Pre-render a static PNG fallback per step so the article still works
   without WebGL.

## Data binding

The roadmap includes **CSV → gradient** binding for choropleth-style stories.
Until that ships, this example will hardcode the per-step gradient. Once it
ships, the same example becomes a 5-line code change.

## Why this matters

People consume long-form data stories on the New York Times, Pudding,
Reuters Graphics — but **none of those publications open-source their
toolchain.** Worlddots could be the missing layer: "I have a story, I have
a CSV, I want a globe-driven scrollytell, I want to ship it on my own site."

This example is the proof of concept.

## Want to build this?

[→ Start a Discussion](https://github.com/alevizio/worlddots/discussions/categories/ideas)
to align on the data-binding API before code lands. Until that's settled,
the example is hardcoded steps + screenshots.
