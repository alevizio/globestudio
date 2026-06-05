---
title: "How to make a dotted world map in 2026"
slug: "how-to-make-a-dotted-world-map"
description: "A practical guide to making a dotted world map for landing pages, decks, and editorial layouts — no code required. Free tools, design tips, and export workflows."
publishedAt: "2026-05-20"
targetKeyword: "how to make a dotted world map"
---

# How to make a dotted world map in 2026

The dotted world map is the design pattern you've seen on a hundred SaaS
landing pages: a grid of small circles or pixels arranged across the
continents, often spinning slowly as a 3D globe in the background of a
hero section. It's visually quiet enough to support a headline, but
specific enough to immediately communicate "we work globally."

This guide walks through the practical workflow for making one — what
you actually need, what looks good, and where the common gotchas live.
By the end you'll have a publishable dotted map you can drop into a
landing page, deck, or print layout. Time required: about 10 minutes
end-to-end.

## What "dotted world map" actually means

Strictly speaking, a dotted world map is any cartographic representation
where landmass is rendered as a grid of dots rather than filled
polygons. The variations split into roughly four buckets:

- **Static dotted map** — a single SVG or PNG, often used on websites,
  business cards, or printed reports. Doesn't move.
- **Animated dotted globe** — a 3D sphere of dots that rotates,
  typically rendered with WebGL. Used as a landing-page hero or video
  graphic.
- **Country-highlighted dot map** — one or several countries called out
  with a different color, to mark presence, customers, or routes.
- **Data-driven dot map** — dot size or color encodes a value
  (population, revenue, climate). More of a data-viz tool than a design
  decoration.

For most designer use cases — landing pages, decks, editorial spreads,
conference signage — you're aiming for the first two. This guide
focuses there.

## What you need

Three things:

1. **A tool that generates the dots.** Hand-placing 6,000+ dots in
   Illustrator is a nightmare. You want something that turns geographic
   data into a dot field automatically.
2. **A clear design intent.** Density, dot shape, color, and any
   styling (print look, glow, distortion) should be deliberate, not
   defaults.
3. **An export target.** PNG for static, SVG for vector-perfect print,
   WebM for animated video, or an embed code for live-in-page web use.

That's it. No design system, no Figma plugin, no math.

## The fastest free option in 2026

[Globestudio](https://globestudio.app) is an open-source web tool that
handles all three steps. It's free, MIT-licensed, requires no account,
and runs entirely in the browser. Disclosure: I built it. It exists
because most of the existing dotted-map generators in 2026 were either
behind paywalls, locked to specific brand systems, or didn't export
anything beyond a static PNG.

Open it, pick a country or region, pick a look preset, tune density
and color, and export. That's the entire workflow.

## A typical workflow

Let's say you want a dotted globe for a SaaS landing page. The brand
is dark mode, the headline is "Operations in 47 countries," and you
want the globe to feel alive without being distracting.

### 1. Pick a look that matches your brand voice

Globestudio ships 17 named looks. For a SaaS landing in 2026, the safe
bets are:

- **Default** — clean white dots on dark. Good for serious enterprise
  brands where the design should disappear.
- **Bloom** — soft glow around bright dots. Good for premium /
  consumer / fintech brands where the design should feel inviting.
- **Aurora** — flowing northern-lights bands over the dot field. Good
  for tech brands positioning around motion, energy, momentum.
- **Halftone** — print-aesthetic circular dots. Good for editorial-feel
  brands, design publications, magazine-style products.

Avoid the high-effect presets (Glitch, Bad TV, Corrupt) on a serious
landing — those work better for music, gaming, or art-school brands.

For our example, let's go with [Bloom](https://globestudio.app/looks/bloom).

### 2. Tune density and dot size

Density is the single most consequential setting. Globestudio caps it at
90 (there's a reason — more on that below). For a landing-page hero
behind text, density 35-50 reads quietly. For a centerpiece graphic
where the globe IS the design, push to 65-80.

Dot size should pair with density:

- High density (70+) → small dot size (8-12)
- Low density (30-50) → medium dot size (10-16)

If your dots are too big at high density, the globe looks blobby. If
they're too small at low density, it looks empty. The eye notices.

### 3. Pick a country or region (or stay global)

The Country dropdown supports any country in the world (search works
in English, French, Spanish, German, Chinese, Arabic, Portuguese —
type "Espagne" or "Deutschland" and the right result surfaces).

You can also pick a continent ("Europe"), subregion ("Northern
Europe"), or US state. For the "Operations in 47 countries" hero,
keep it on World so the whole globe shows. For a single-market launch
page, pin to that country.

### 4. Tweak the color

Globestudio's color picker handles solid colors, gradients (linear with
adjustable midpoint), and per-stop opacity. For a landing-page hero,
match your brand's primary or accent color. For a black-and-white
print piece, default white-on-dark usually wins.

### 5. Export

The export dialog opens with `D` or the download icon. Four options:

- **PNG** — re-renders the canvas at up to 4× resolution. For static
  hero images, web headers, social posts.
- **SVG** — vector output for print or further editing in Illustrator /
  Affinity / Figma. Note: shader effects don't translate to SVG (they're
  WebGL-specific). Use this for the unstyled dot field.
- **WebM** — captures the live animation as a video. Drop into After
  Effects, X / LinkedIn, or a video editor.
- **JSON config** — saves the full preset so you (or anyone else) can
  reproduce the exact look later. Shareable via URL too — every preset
  has a permalink at `/looks/{id}`.

## Common mistakes

After watching designers use this for a couple months, the patterns
that produce bad results are predictable:

**Density too high.** "More dots = more impressive" is wrong. At
density 90 with a small dot size, the globe loses all texture and
reads as a fuzzy sphere. The visual reads better at 50-70 for most
purposes. The 90 cap exists for performance reasons — beyond that,
mobile GPUs choke.

**Too many shader effects stacked.** Globestudio only applies one shader
effect at a time on purpose. If you find yourself wanting "halftone +
bloom + chromatic split," your design probably has a deeper problem.
Pick the one that does the most work and commit.

**Wrong projection for solid mode.** When you flip from dots to solid
mode in flat view, you pick a projection (Mercator, Equal Earth,
Winkel Tripel, Robinson, Natural Earth). Mercator looks "wrong" to
anyone trained post-2010 — Greenland dwarfs South America. For modern
designs, Equal Earth is the right default. Mercator only when you
specifically want the Google Maps look.

**Auto-spin too fast.** The default motion (35) is calibrated for
calm. If you push it past 70, the globe reads as nervous rather than
alive. Slower is almost always better for landing-page heros.

## Animating the globe

If you're going for the spinning-globe landing hero, two things
matter:

1. **`prefers-reduced-motion`.** A meaningful fraction of users have
   "reduce motion" enabled at the OS level (accessibility setting).
   Globestudio automatically pauses auto-spin, time-driven shaders, and
   cinematic morph flourishes for those users. If you build your own
   from scratch, do the same — animation that won't pause is a real
   accessibility failure.
2. **Loop length.** If you're exporting WebM for video, aim for a
   loop length that's a clean divisor of your video framerate. At
   60fps, a 6-second loop is 360 frames — exports cleanly. A 5.5-
   second loop won't.

## Embedding in your site

If you want the live animated globe (not a static PNG) on your
landing page, Globestudio ships an `/embed` route that renders just the
canvas with no chrome:

```html
<iframe
  src="https://globestudio.app/embed?look=bloom&density=70&autoSpin=1"
  width="100%"
  height="500"
  style="border:0;"
  loading="lazy"
  title="Dotted world map"
></iframe>
```

Works in Webflow's Code Embed block, Framer's Embed element, plain
HTML, Notion (`/embed` slash command), Astro, Next.js, anywhere
iframes are allowed. The full
[per-tool integration guide](https://github.com/alevizio/globestudio/tree/main/docs/integrations)
covers Webflow, Framer, Notion, and plain HTML in detail.

## When to NOT use a dotted map

The pattern is everywhere now. Use it deliberately:

- **You're a global business** with offices, customers, or routes in
  ≥3 countries. Dotted map says "we span the world" cleanly.
- **You're a data-viz tool** showing geographic distribution. Dots
  read as discrete data points.
- **You're an editorial / journalism brand** doing a piece with a
  cartographic angle.

When NOT to:

- You're a local business serving one region. A dotted globe reads as
  pretentious if you're a coffee shop in Brooklyn.
- The design needs to feel warm or human. Dots are inherently
  abstract.
- You're chasing the trend without it serving the content. The
  dotted-map cliché is real — if you can't articulate why this
  pattern serves your message, pick a different visual.

## What's next

If you want to go further:

- [Browse the preset gallery](https://globestudio.app/) — all 21 looks
  with one-click apply.
- [The GitHub repo](https://github.com/alevizio/globestudio) — full
  source, MIT licensed.
- [Integration guides](https://github.com/alevizio/globestudio/tree/main/docs/integrations)
  — Webflow, Framer, Notion, plain HTML.

The tool is open source and welcomes contributions. If you build
something interesting with it,
[share it in the Show and Tell discussions](https://github.com/alevizio/globestudio/discussions/categories/show-and-tell).

---

*Published 2026-05-20. Comments and corrections welcome at
[github.com/alevizio/globestudio](https://github.com/alevizio/globestudio).*
