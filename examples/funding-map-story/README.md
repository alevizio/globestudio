# Example: `funding-map-story`

> **Status**: 🟢 Ready (via iframe) — see `index.html`

A scroll-driven data story: section-by-section narrative where each
section pins a Globestudio iframe to a different country or region. The
classic annual-report / impact-report layout — "in 2025, we served
customers across 47 countries" → the regions light up as the reader
scrolls.

## What this proves

Globestudio scales from a single embed to a **narrative spine** for a
data-driven page. Same iframe primitive, scroll-coordinated.

## The pattern

Each story section has:

1. **Headline + paragraph** on the left (or above on mobile)
2. **Globestudio iframe** on the right (or below) pinned to a specific
   `/looks/:preset` URL
3. **Stats** floating over or below the map

The iframe URLs use the existing `/looks/:id` shareable preset URLs.
Each section swaps its iframe when scrolled into view via
`IntersectionObserver`, so designers see the right map at the right
moment.

## When to reach for this

- Annual reports / impact reports
- Series-A pitch decks ("here's our global footprint")
- VC portfolio company pages
- News features with geographic context
- Substack/Beehiiv posts with map-driven framing

## Run the demo

```bash
cd examples/funding-map-story
python3 -m http.server 8000
# open http://localhost:8000
```

Or open `index.html` directly.

## What `index.html` shows

Five story sections stacked vertically, each pinning a different
`/looks/:id` to the iframe:

1. **Global presence** — Aurora preset
2. **Americas focus** — Halftone preset
3. **Europe expansion** — Risograph preset
4. **APAC growth** — Newsprint preset
5. **Future markets** — Iridescent preset

Each section uses `IntersectionObserver` to swap the iframe src as the
user scrolls — only the active section's iframe is "live."

## Production notes

- **Pre-fetch the next look** via `<link rel="prefetch">` before the
  user scrolls into it. Cuts the iframe swap from ~200ms to ~30ms.
- **Embed at lower aspect ratios** for mobile (`aspect-ratio: 4/3`)
  vs desktop (`16/9`).
- **Consider WebM background** for performance-critical contexts —
  Globestudio exports WebM at any preset.

## Static-export workflow

For a polished PDF-ready annual report:

1. For each section, open the preset URL on `globestudio.app`
2. Configure the selection + look settings
3. Export PNG at 2× resolution
4. Drop into InDesign / Affinity Publisher
5. Lay typography over

## See also

- [`hero-globe`](../hero-globe/) — single-section hero version
- [`shader-presets-showcase`](../shader-presets-showcase/) — preset
  catalog for picking the right look per section
- [`embed-snippet`](../embed-snippet/) — minimum-viable embed pattern
