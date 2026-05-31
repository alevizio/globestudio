# Globestudio — Product Strategy

> How Globestudio becomes the best-in-class map/globe tool for designers and
> design engineers. Derived from competitive, audience, capability, and
> workflow research (2026). Companion to [ROADMAP.md](ROADMAP.md), which tracks
> shipped/next items; this doc is the *why* and the *sequencing*.

## Positioning thesis

Globestudio owns an empty quadrant: **stylized + no-code + asset-exporting +
free/MIT**. The neighbors each own a different corner — **cobe** is the 5KB
code-only Stripe globe, **globe.gl** is a data library, **GEOlayers** is
$250 + After Effects, **Flourish** is data-story SaaS, **Mapbox** is real
cartography. None combine decorative aesthetic + zero-friction GUI + clean
exports.

> **Globestudio is the no-code "shader lab for maps" — the fastest way to turn
> the Stripe/GitHub dot-globe aesthetic into an exportable, embeddable, on-brand
> asset without writing Three.js, opening After Effects, or signing up.**

The "GitHub/Stripe globe" is a proven, copied aesthetic (clone repos, Aceternity
World Map, dedicated generators). That demand is the wedge.

## Three jobs to optimize around

1. **Drop a global-scale visual into my site/product** — design engineer,
   "global coverage" hero. (react-globe.gl loses on SSR/theming reliability.)
2. **Make an animated globe clip for a launch/reel/social** — motion designer.
   (Today they pay for AE plugins or hand-roll a broken ffmpeg pipeline.)
3. **Branded dotted-map asset for a deck/hero/social** — designer. Make-or-break
   detail: clean, editable SVG export.

## The five bets (ranked by leverage)

1. **Figma plugin → editable vectors + variable sync.** Today it inserts a flat
   PNG (a dead raster — the top reason design tools get abandoned). We already
   export SVG, so half is built: `createNodeFromSvg` → auto-layout frame;
   `getLocalVariablesAsync` → "use my brand colors." No competitor does this for
   stylized maps, and Mapsicle (the canonical Figma map plugin) is dead. **Start
   here.**
2. **Export formats: MP4 + GIF + transparent/alpha; layered/named SVG;
   copy-as-React.** WebM-only fails Safari/iOS/Slack/social — the flagship
   animated output is unusable where designers post it. Layered SVG + copy-as-
   code close the design→code handoff.
3. **Thin data-binding: paste cities/CSV → proportional dots + choropleth +
   arcs.** Biggest capability gap (no data channel in `dot-generation.js`).
   Proportional dots reuse the dot engine = on-brand + cheap. "The GitHub globe,
   with your numbers." Keep it thin — no data-table/story editor.
4. **Unify one config API across embed/React/MCP + ship a web component + Next
   SSR example.** `<globe-studio>` covers Svelte/Vue/Solid/Astro/Framer in one
   artifact. Win where react-globe.gl is brittle.
5. **Community gallery (no accounts).** Each look is already a URL-encoded
   config → a curated/PR gallery = indexable inspiration pages + OG share images
   (satori/resvg already present) → SEO + virality + retention flywheel.

## Sequencing

**Pre-launch quick wins (days):** first-run lands on a gorgeous animated default
+ 3 sample selections; logo/screenshot → palette (client-side, no LLM); MP4+GIF
export; GitHub Sponsors live.

**Fast-follow (the moats):** Bet 1 → rest of Bet 2 → Bet 4 → Bet 3 → Bet 5.

**Later (after retention signal):** time-series animated data; in-app
natural-language styling (reuse the MCP schema); hosted Pro.

## Do NOT build (protect focus)

- Out-tiny cobe (byte war we lose)
- GEOlayers-style keyframe/timeline editor (money pit)
- globe.gl's full data-viz layer catalog (drifts off-niche)
- Mapbox-style real basemaps/tiles (infra sinkhole)
- Enterprise per-seat charting (wrong buyer)
- Flourish-style data-table/story editor (keep data-binding thin)
- CMYK/print color management (already parked)

**Risk:** the dot engine rides on `dotted-map` (~214★, lightly maintained).
Vendor or be fork-ready before it bites.

## Sustainability

The **Excalidraw model** fits without breaking the OSS promise: MIT core free
forever (all looks, SVG/PNG/WebM), optional **hosted Pro (~$6–9/mo)** for things
that genuinely cost us (server-rendered HD/4K MP4, brand kits, AI styling).
Reframe ROADMAP's "no accounts / no paid" to *"no required accounts; nothing in
the OSS app is paywalled."* Introduce Pro only after retention signal — never
launch behind a paywall.
