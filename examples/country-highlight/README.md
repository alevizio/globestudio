# Example: `country-highlight`

> **Status**: 🟢 Ready (via Globestudio URL params) — see `index.html`

A single-page profile that zooms tight on one country and shows just
that country's dotted silhouette plus a small text block. The unit of a
larger "country profile" pattern — useful for SaaS regional pages, NGO
impact-by-country sections, immigration-services site, or a
single-country case study.

## What this proves

Globestudio's selection system isn't just for the World view — designers
can pick any country, region, or US state as the focus and Globestudio
will reframe + clip the dot field around it automatically. Combined
with the shareable URL format, that means a marketing site can deep-
link to "Globestudio showing just France" with zero JavaScript.

## The pattern

This example shows one country profile but the pattern scales to a
template. Substitute the country code in:

```html
<iframe src="https://globestudio.app/looks/aurora" title="..."></iframe>
```

For a designer who wants programmatic per-country pages (e.g., a SaaS
with 47 regional landing pages — "We serve the United Kingdom",
"We serve Brazil", etc.), the URL is the only thing that varies.
Templating engines like Next.js, Astro, or 11ty can generate the 47
pages from a single template.

## Run

```bash
cd examples/country-highlight
python3 -m http.server 8000
```

## What `index.html` shows

A single-page profile of France:

- Hero block with country name + stat
- Centered Globestudio iframe (Aurora preset, France selection)
- Three stat cards below (population, cities, area)
- Footer with attribution + link to the live tool

To adapt for your country, copy the file and change:

- The iframe `src` to a different preset
- The country name + stats
- The "open in globestudio" link

## Why this matters

The number two designer use case (after "global presence" maps) is
**single-country profile pages**. A marketing team running a SaaS in
12 countries wants 12 regional pages, each visually anchored by a map
of that country. This is the smallest viable building block for that
pattern.

## URL params reference

Globestudio's URL state covers:

- `/looks/:id` — picks the preset (look)
- _Selection (country/region/state)_ is currently driven by the
  in-app UI; URL-based selection is on the roadmap as part of the
  `/embed` route work (Phase 0 of integrations-rollout).

Until URL-driven selection ships, this example uses a pre-baked
preset URL (`/looks/aurora`) and lets the user pick the country
via the panel inside the iframe. The HTML demo is intentionally
sized so the panel sits adjacent and visible.

## See also

- [`embed-snippet`](../embed-snippet/) — base iframe pattern
- [`conference-badge`](../conference-badge/) — for print artwork
- [`funding-map-story`](../funding-map-story/) — multi-section version
