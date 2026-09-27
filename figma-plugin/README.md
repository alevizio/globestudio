# Globestudio — Figma plugin

**🚀 [Install from Figma Community →](https://www.figma.com/community/plugin/1641603648370488902/globestudio)**

Drops a customized Globestudio dotted map into your Figma file. The plugin
UI is a thin iframe over `globestudio.app/embed?plugin=figma`, which shows
a live globe with three pickers under it:

- **Look**: one of the 21 looks.
- **Country or region**: World, a continent, a subregion or one country,
  with search.
- **Density**: dot density from 1 to 90.

If the file has local color variables, a **Your colors** strip at the top
recolors the dots with one of them. **Insert into Figma** adds the map
with those settings, as vectors or a PNG (see below).

The panel remembers the last look, region and density in the browser's
sessionStorage (`src/utils/figma-picks.js`). That keeps them through a
**Your colors** reload, and it also carries them into the next plugin
open in the same Figma tab. The remembered picks win over any `look`,
`selection` or `density` in the embed URL, so a `ui.html` release that
starts passing those params needs a matching change to
`figma-picks.js`. If storage is blocked, the pickers start from the URL
each time.

The pickers are part of the embed, so every installed copy gets them as
soon as globestudio.app deploys. Changes to `ui.html`, `code.js` or
`manifest.json` reach designers only through a new plugin release, which
goes through Figma review (see `SUBMISSION.md`).

Works in **Figma design files** and **FigJam**.

## How it works

```
┌────────────────────────────────────────────────────────┐
│  Figma desktop / web                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Plugin window                                    │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  ui.html ─ thin postMessage bridge         │  │  │
│  │  │  ┌──────────────────────────────────────┐  │  │  │
│  │  │  │  <iframe src=globestudio.app/embed   │  │  │  │
│  │  │  │   ?plugin=figma>                     │  │  │  │
│  │  │  │                                       │  │  │  │
│  │  │  │  Live globe plus Look, Country or    │  │  │  │
│  │  │  │  region and Density pickers.         │  │  │  │
│  │  │  │  "Insert into Figma" button at the   │  │  │  │
│  │  │  │  bottom sends a canvas PNG and a     │  │  │  │
│  │  │  │  map SVG via postMessage ────────────┼──┼─►│  │
│  │  │  └──────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │                       │                            │  │
│  │  ui.html receives bytes, forwards to ─────────────┼──►│
│  │  code.js sandbox                                   │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  figma.createNodeFromSvg(svg) when the     │  │  │
│  │  │  map has up to 2,500 dots, otherwise       │  │  │
│  │  │  figma.createImage(bytes) as a             │  │  │
│  │  │  rectangle image fill                      │  │  │
│  │  │  Insert at viewport center                 │  │  │
│  │  │  A PNG updates in place if a prior         │  │  │
│  │  │  Globestudio node is selected              │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

## Local development install

1. Open **Figma desktop** (web Figma can't side-load plugins).
2. Top-left menu → **Plugins → Development → Import plugin from manifest…**
3. Pick this folder's `manifest.json`.
4. **Plugins → Development → Globestudio** — the panel opens with a live globe.
5. Pick a look, a country or region and a density, then press **Insert into Figma**.

Insert lands at the viewport center. A map with up to 2,500 dots arrives as editable vectors of the flat dotted map, in named layers (Background, Dots and, for looks with overlays, Effects). A denser map arrives as a PNG of the globe preview, at the panel canvas size, on a rectangle. Press Insert again with that PNG rectangle selected and it updates in place instead of adding a new one.

## Files

| File | Role |
|---|---|
| `manifest.json` | Plugin metadata + network allowlist for `globestudio.app` |
| `ui.html` | UI iframe + postMessage bridge to the sandbox |
| `code.js` | Sandbox: receives the SVG and PNG bytes, creates vectors or the Figma image, handles selection update-in-place |
| `SUBMISSION.md` | Marketing copy + step-by-step Figma Community submission guide |

## Roadmap

- [x] Submit to Figma Community (see `SUBMISSION.md` for the walkthrough)
- [ ] "Insert at 2× / 3× scale" option for hi-DPI exports
- [ ] FigJam sticky-board layout (manifest already declares both editors)
- [ ] Save-to-Figma-library so a user's brand presets stay in their team file
- [ ] Variable bindings — let the inserted rectangle reference Figma variables for size/position

## License

MIT — see [LICENSE](../LICENSE).
