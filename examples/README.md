# Worlddots examples

This directory holds reference projects that show Worlddots in real
contexts — landing pages, decks, brand systems, motion content.

The goal isn't "copy the code." The goal is **proof**: when someone lands on
the repo and asks "could I use this for X," they should find an example that
makes the answer obvious.

## Status

Each example is in one of these states:

- 🟢 **Ready** — full code, deployed somewhere, README explains the use case
- 🟡 **Stubbed** — README exists, code is a placeholder
- 🔴 **Idea** — only listed, not started

## Examples

| | Example | What it proves | Status |
|---|---|---|---|
| 🌍 | [`hero-globe`](./hero-globe) | Animated globe behind a landing page hero | 🟡 Stubbed |
| 🔭 | [`funding-map-story`](./funding-map-story) | Country-by-country data story / report | 🟡 Stubbed |
| 🗺️ | [`svg-country-pack`](./svg-country-pack) | Pre-exported SVG country shapes for brand systems | 🟡 Stubbed |
| 🎨 | [`shader-presets-showcase`](./shader-presets-showcase) | Side-by-side gallery of every preset | 🟡 Stubbed |

## Contributing an example

Want to add one? Open a [Discussion](https://github.com/alevizio/worlddots/discussions/new?category=show-and-tell)
first to make sure it doesn't overlap with something already planned, then
open a PR that adds a directory under `examples/` with:

1. A `README.md` describing the use case
2. The actual project (Next.js / Vite / plain HTML — your call)
3. Screenshots in `examples/<your-example>/screenshots/`
4. A deployed link if you have one

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full guide.

## What we'd love to see

These aren't planned, but if you ship any of them as a PR we'll feature it:

- A **scrollytelling article** that uses dotted globe sections as section
  dividers
- A **brand microsite** that uses Worlddots as the only visual asset (logo +
  hero + footer)
- A **video opener** export — WebM looped behind a typeface, designed for a
  conference talk or stream
- A **data-journalism piece** with per-country dot intensity bound to a CSV
- A **404 page** that uses a glitched globe as the visual

Pitch ideas in [Show & Tell](https://github.com/alevizio/worlddots/discussions/categories/show-and-tell).
