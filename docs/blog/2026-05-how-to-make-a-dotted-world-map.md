---
title: "How to make a dotted world map in 2026"
slug: "how-to-make-a-dotted-world-map"
description: "A practical guide to making a dotted world map for landing pages, decks and editorial layouts, with no code. Covers free tools, design choices and export settings."
publishedAt: "2026-05-20"
targetKeyword: "how to make a dotted world map"
---

# How to make a dotted world map in 2026

You've seen the dotted world map on a hundred SaaS landing pages: a grid
of small circles or pixels across the continents, often spinning slowly
as a 3D globe behind the hero headline. It's quiet enough to sit behind
a headline and still says "we work globally" at a glance.

This guide walks through making one: what you need, what looks good,
and where people usually go wrong. By the end you'll have a dotted map
you can put on a landing page, in a deck or in a print layout. It takes
about 10 minutes.

## What "dotted world map" means

A dotted world map is any map where the land is drawn as a grid of dots
instead of filled shapes. There are roughly four kinds:

- Static dotted map: a single SVG or PNG, often used on websites,
  business cards or printed reports. It doesn't move.
- Animated dotted globe: a 3D sphere of dots that rotates, usually
  rendered with WebGL. Used as a landing-page hero or in video.
- Country-highlighted dot map: one or more countries in a different
  color, to mark presence, customers or routes.
- Data-driven dot map: dot size or color encodes a value (population,
  revenue, climate). This is closer to data visualization than
  decoration.

For most design work (landing pages, decks, editorial spreads,
conference signage) you want one of the first two, so that's what this
guide covers.

## What you need

1. A tool that generates the dots. Placing 6,000+ dots by hand in
   Illustrator is miserable. You want something that turns geographic
   data into a dot field for you.
2. A clear idea of the look. Choose the density, dot shape, color and
   any styling (print look, glow, distortion) on purpose instead of
   keeping the defaults.
3. An export format. PNG for static images, SVG for print at any size,
   WebM for video, or embed code for a live globe on a web page.

You don't need a design system, a Figma plugin or any math.

## The fastest free option in 2026

[Globestudio](https://globestudio.app) is an open-source web tool that
covers all three. It's free and MIT licensed, needs no account, and
runs entirely in the browser. Disclosure: I built it, because most of
the dotted-map generators I found in 2026 were behind paywalls, locked
to one brand's style, or couldn't export anything beyond a static PNG.

Open it, pick a country or region and a look preset, adjust density and
color, and export.

## A typical workflow

Say you want a dotted globe for a SaaS landing page. The brand is dark
mode, the headline is "Operations in 47 countries," and the globe
should move without pulling attention from the headline.

### 1. Pick a look that fits the brand

Globestudio ships 17 named looks. For a SaaS landing page in 2026, the
safe choices are:

- Default: plain white dots on dark. Good for enterprise brands where
  the design should stay in the background.
- Bloom: a soft glow around bright dots. Good for consumer and fintech
  brands that want something warmer.
- Aurora: northern-lights bands moving over the dot field. Good for
  tech brands that want motion.
- Halftone: round print-style dots. Good for editorial brands, design
  publications and magazine-style products.

Skip the heavy presets (Glitch, Bad TV, Corrupt) on a serious landing
page. They suit music, gaming and art-school brands better.

For this example, use [Bloom](https://globestudio.app/looks/bloom).

### 2. Tune density and dot size

Density matters more than any other setting. Globestudio caps it at 90,
for a reason I'll get to below. Behind text in a landing-page hero, a
density of 35 to 50 stays quiet. When the globe is the main graphic,
push it to 65 to 80.

Match the dot size to the density:

- High density (70+): small dots (8 to 12)
- Low density (30 to 50): medium dots (10 to 16)

Dots that are too big at high density make the globe look blobby, and
dots that are too small at low density make it look empty.

### 3. Pick a country or region, or stay global

The Country dropdown has every country in the world. Search works in
English, French, Spanish, German, Chinese, Arabic and Portuguese, so
typing "Espagne" or "Deutschland" finds the right one.

You can also pick a continent ("Europe"), a subregion ("Northern
Europe") or a US state. For the "Operations in 47 countries" hero, keep
it on World so the whole globe shows. For a launch page about one
market, pick that country.

### 4. Adjust the color

Globestudio's color picker handles solid colors, linear gradients with
an adjustable midpoint, and per-stop opacity. For a landing-page hero,
use your brand's primary or accent color. For a black-and-white print
piece, the default white on dark usually works best.

### 5. Export

Press `D` or click the download icon to open the export dialog. There
are four options:

- PNG re-renders the canvas at up to 4× resolution, for static hero
  images, web headers and social posts.
- SVG gives you vectors for print or for editing in Illustrator,
  Affinity or Figma. Shader effects don't carry over to SVG because
  they're WebGL only, so use it for the plain dot field.
- WebM records the live animation as a video you can bring into After
  Effects, a video editor, or post on X or LinkedIn.
- JSON config saves the full preset so you (or anyone else) can
  reproduce the look later. You can also share it as a URL, and every
  preset has a permalink at `/looks/{id}`.

## Common mistakes

After a couple of months of watching designers use the tool, the same
few things cause most of the bad results.

Density too high. More dots doesn't look more impressive. At density 90
with a small dot size, the globe loses its texture and turns into a
fuzzy sphere, and 50 to 70 looks better for most uses. The 90 cap is
there for performance, because mobile GPUs choke beyond it.

Too many shader effects. Globestudio applies one shader effect at a
time on purpose. If you want "halftone + bloom + chromatic split,"
the design probably has a bigger problem. Pick the effect that does
the most work and stick with it.

The wrong projection in solid mode. When you switch from dots to solid
mode in the flat view, you pick a projection (Mercator, Equal Earth,
Winkel Tripel, Robinson, Natural Earth). Mercator looks wrong to anyone
trained after 2010, because Greenland dwarfs South America. For modern
designs, Equal Earth is a better default. Use Mercator when you
specifically want the Google Maps look.

Auto-spin too fast. The default motion (35) is set to feel calm. Past
70 the globe looks nervous. For landing-page heroes, slower is almost
always better.

## Animating the globe

For a spinning globe in a landing-page hero, two things matter:

1. `prefers-reduced-motion`. A meaningful share of users turn on
   "reduce motion" in their OS accessibility settings. Globestudio
   pauses auto-spin, time-driven shaders and the cinematic morph
   flourishes for them. If you build your own globe from scratch, do
   the same, because animation that can't be paused is an
   accessibility failure.
2. Loop length. If you're exporting WebM for video, pick a loop length
   that divides cleanly into your video's frame rate. At 60 fps, a
   6-second loop is 360 frames and exports cleanly. A 5.5-second loop
   won't.

## Embedding in your site

If you want the live animated globe on your landing page instead of a
static PNG, Globestudio has an `/embed` route that renders only the
canvas, with no UI around it:

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

It works in Webflow's Code Embed block, Framer's Embed element, plain
HTML, Notion (the `/embed` slash command), Astro, Next.js and anywhere
else iframes are allowed. The
[integration guide](https://github.com/alevizio/globestudio/tree/main/docs/integrations)
covers Webflow, Framer, Notion and plain HTML in detail.

## When to use a dotted map, and when not to

The pattern is everywhere now, so use it when it fits:

- You're a global business with offices, customers or routes in 3 or
  more countries. A dotted map shows that you span the world.
- You're a data-viz tool showing geographic distribution, where dots
  read as discrete data points.
- You're an editorial or journalism brand doing a piece with a
  geographic angle.

Skip it when:

- You're a local business serving one region. A dotted globe looks
  pretentious on a coffee shop in Brooklyn.
- The design needs to feel warm or human. Dots are abstract.
- You're following the trend and it doesn't serve the content. The
  dotted map is a cliché by now, so if you can't say why it helps your
  message, pick a different visual.

## Where to go from here

- [Browse the preset gallery](https://globestudio.app/): all 21 looks,
  each one click to apply.
- [The GitHub repo](https://github.com/alevizio/globestudio): the full
  source, MIT licensed.
- [Integration guides](https://globestudio.app/integrations):
  Webflow, Framer, Notion and plain HTML.

The tool is open source and contributions are welcome. If you build
something with it,
[share it in the Show and Tell discussions](https://github.com/alevizio/globestudio/discussions/categories/show-and-tell).

Published 2026-05-20. Comments and corrections are welcome at
[github.com/alevizio/globestudio](https://github.com/alevizio/globestudio).
