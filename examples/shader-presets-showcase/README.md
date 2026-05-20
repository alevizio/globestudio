# Example: `shader-presets-showcase`

> **Status**: 🟢 Ready — see `index.html`

A grid gallery showing every Globestudio preset side-by-side, each as a
live mini-iframe. Useful as:

- A **picker tool** for designers comparing presets before committing
- A **demo page** for blog posts / portfolios introducing Globestudio
- A **screen-recording subject** for social posts ("16 dotted-globe
  looks in 30 seconds")

## What's in the gallery

All 16 presets:

`default`, `halftone`, `risograph`, `newsprint`, `aurora`, `pixel`,
`bayer`, `iridescent`, `wireframe`, `crt`, `glitch`, `badtv`, `bloom`,
`metal`, `pencil`, `corrupt`.

Each card:

- Iframe pointing at `/looks/:id`
- Preset name + one-line description
- "Open in Globestudio →" link to the full app with that preset

## Run

```bash
cd examples/shader-presets-showcase
python3 -m http.server 8000
```

Or open `index.html` directly.

## Performance notes

16 iframes is a lot. The page uses `loading="lazy"` on each so iframes
below the fold don't load until scrolled into view. On mobile, the
gallery switches to 2 columns to keep memory usage reasonable.

## When to reach for this

- Picking a look for a client project (compare 4 visually similar
  presets at once)
- Internal design-system page documenting the available styles
- Blog post about how Globestudio looks vary
- Conference talk slide with the full catalog visible

## See also

- [`embed-snippet`](../embed-snippet/) — single-preset version
- [`hero-globe`](../hero-globe/) — when you've already picked one
