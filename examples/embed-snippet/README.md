# Example: `embed-snippet`

> **Status**: 🟢 Ready — copy-paste HTML, works on any site

The smallest viable way to put Worlddots on your own page. Single iframe
pointing at a preset URL on `worlddots.app`. No build step, no npm install,
no JavaScript framework. Works on Webflow Code Embeds, Framer custom
HTML, plain WordPress, Shopify product pages, anywhere that accepts an
`<iframe>`.

## The 8-line version

Copy this into your site's HTML:

```html
<iframe
  src="https://worlddots.app/looks/halftone"
  style="width: 100%; aspect-ratio: 16/9; border: 0; background: #0a0a0a"
  loading="lazy"
  title="Worlddots dotted globe"
></iframe>
```

That's the whole integration. Picks the **Halftone** preset; swap to
`/looks/risograph`, `/looks/aurora`, `/looks/bayer`, etc. for other looks.

## Run the demo locally

```bash
# from the repo root
cd examples/embed-snippet
python3 -m http.server 8000   # or any static-file server
# open http://localhost:8000
```

Open `index.html` directly in your browser too — no server required.

## What's in `index.html`

- A `<picture>`-style preset switcher that swaps the iframe src on click
- `aspect-ratio: 16/9` so the embed scales responsively
- `loading="lazy"` to defer the load when the embed is below the fold
- A `prefers-reduced-motion` query that swaps the URL to a static-frame
  variant when the user prefers reduced motion (drops `?motion=0` for
  future-proofing — Worlddots already honors the OS-level pref, this is
  just extra insurance)
- No JavaScript framework — vanilla HTML/CSS/JS

## Available preset URLs

Every Worlddots preset has its own shareable URL:

`/looks/default`, `/looks/halftone`, `/looks/risograph`, `/looks/newsprint`,
`/looks/aurora`, `/looks/pixel`, `/looks/bayer`, `/looks/iridescent`,
`/looks/wireframe`, `/looks/crt`, `/looks/glitch`, `/looks/badtv`,
`/looks/bloom`, `/looks/metal`, `/looks/pencil`, `/looks/corrupt`.

## Why iframe

The whole tool runs client-side — no API calls, no server state. Iframing
is the cleanest integration because:

- **Versioned**: you embed `https://worlddots.app/...` and get whatever
  is deployed there at request time. No npm dependency to upgrade.
- **Sandboxed**: nothing from Worlddots can touch your page's DOM, CSS,
  or analytics.
- **Cached**: Vercel + browser caching means subsequent loads are
  near-instant.
- **Mobile-safe**: Worlddots's adaptive DPR + reduced-motion gating run
  inside the iframe automatically; your host page just needs to render
  the `<iframe>` element.

The downside: the embed isn't styleable from outside, and there's no JS
API to react to inside-iframe events. For deep integration (style sync,
event handlers), see the [hero-globe](../hero-globe/) example which
discusses the future `mountGlobe` API.

## Webflow / Framer specifics

**Webflow**: drag a "Code Embed" element onto the page, paste the
`<iframe>` snippet. Done.

**Framer**: insert an "Embed" component, paste the snippet, set the
component's height to match `aspect-ratio` (e.g. 360px height for 640px
width = 16:9).

**Notion**: paste the `worlddots.app/looks/...` URL directly — Notion
auto-detects it as an embed.

**Substack**: same. Paste the URL on its own line.

## See also

- [`hero-globe`](../hero-globe/) — when you need it as a full landing-page background
- [`conference-badge`](../conference-badge/) — when you need a static PNG for print/print-quality

## License

The example HTML in this folder is MIT, same as the rest of the repo.
The hosted preset URLs at `worlddots.app/looks/*` are free for commercial use.
