# Worlddots examples

This directory holds reference projects that show Worlddots in real
contexts — landing pages, decks, brand systems, motion content.

The goal isn't "copy the code." The goal is **proof**: when someone lands on
the repo and asks "could I use this for X," they should find an example that
makes the answer obvious.

## Status

Each example is in one of these states:

- 🟢 **Ready** — runnable HTML, deployable, documented
- 🟡 **Stubbed** — README exists, code is a placeholder
- 🔴 **Idea** — only listed, not started

## Examples

| | Example | What it proves | Status |
|---|---|---|---|
| 🧩 | [`embed-snippet`](./embed-snippet) | The minimum-viable iframe embed pattern — paste into any site | 🟢 Ready |
| 🌍 | [`hero-globe`](./hero-globe) | Animated globe behind a landing page hero | 🟢 Ready |
| 📊 | [`funding-map-story`](./funding-map-story) | Scroll-driven annual-report data story | 🟢 Ready |
| 🎨 | [`shader-presets-showcase`](./shader-presets-showcase) | All 16 presets in one auto-fit gallery | 🟢 Ready |
| 🏷️ | [`conference-badge`](./conference-badge) | Single-country PNG for print artwork | 🟢 Ready |
| 🗺️ | [`country-highlight`](./country-highlight) | Single-country profile page template | 🟢 Ready |
| 🎯 | [`svg-country-pack`](./svg-country-pack) | Vector country shapes for Illustrator / Figma | 🟢 Ready (workflow docs) |
| 🅵 | [`framer-component`](./framer-component) | Framer code component — designer-panel props, iframe-bridged | 🟢 Ready (paste-into-Framer) |

## Run an example locally

Each `index.html` works standalone. Two options:

```bash
# Option 1 — open the HTML file directly in your browser
open examples/hero-globe/index.html

# Option 2 — serve via Python (recommended for caching headers)
cd examples/hero-globe && python3 -m http.server 8000
# open http://localhost:8000
```

All examples use `https://worlddots.vercel.app/looks/:id` URLs for live
embeds — no build step or npm install required.

## Adapt an example for your project

Each example folder contains:

- `README.md` — what it shows + how to adapt it for your project
- `index.html` (where applicable) — runnable demo
- `config.json` (where applicable) — exact Worlddots config that
  reproduces the look

Most adaptations are a matter of:

1. Copy the `index.html` into your project
2. Change the preset URL in the iframe `src`
3. Restyle the surrounding HTML/CSS to match your brand

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

Community examples we'd put on the front page if someone built them:

- Webflow showcase template
- Framer code component (gated on integrations Phase 2)
- Figma plugin (gated on integrations Phase 3)
- Astro starter with Worlddots embedded
- After Effects template — animated tag-along map for video projects
- Notion embed cookbook
- Cloudflare Worker that proxies preset URLs to a custom domain
