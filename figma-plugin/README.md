# Globestudio Figma plugin

[Install from Figma Community](https://www.figma.com/community/plugin/1641603648370488902/globestudio)

Globestudio inside Figma. The plugin UI is a thin iframe
over `globestudio.app/?plugin=figma`: the studio in its phone layout, with
the globe above a sheet that holds every control from the web app (looks,
region, surface, globe, grid, network, data, animations, shaders and
background). Flat/Globe and **Insert into Figma** sit in the top bar.

Insert opens the studio's export dialog with two tabs:

- Image: a PNG at the crop and quality you pick (Original, 1:1, 4:5,
  16:9 or 9:16; Draft to Ultra, up to 4x). It starts at 1:1 for the globe
  and 16:9 for the flat map. The layer is sized in points, with the extra
  pixels kept for Retina.
- SVG: the flat map as editable vector dots, up to 2,500 dots. Above
  that `code.js` inserts the PNG that comes with it instead.

If the file has local color variables, a **Your colors** strip above the
studio sets the dot color to the one you click. The studio keeps its
settings in the browser like on the web.

To bring a design made on globestudio.app into Figma, copy its share link
and paste it into the plugin: into the **Paste a share link** field at the
top of the sheet, or anywhere outside a text field. The design loads, ready
to insert, and a short line says so, or that the text was not a Globestudio
link. Look links (`/looks/<id>`) and embed links work too, from
globestudio.app, www.globestudio.app and the Vercel preview hosts. The
studio reads the paste event itself, so this needs no clipboard permission
in Figma's iframe, and no new plugin version: it ships with the site.

Studio changes reach every installed copy as soon as globestudio.app
deploys. Changes to `ui.html`, `code.js` or `manifest.json` reach
designers through a new plugin version, published from the desktop app
(Plugins, Manage plugins, Publish new version); once a plugin is approved,
updates go live without another review.

Versions 1 and 2 of the plugin load `/embed?plugin=figma` (the small
look, region, density and view pickers), which keeps working for anyone
who hasn't updated yet.

It works in Figma design files and in FigJam.

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
│  │  │  │  Live preview plus Look, Country or  │  │  │  │
│  │  │  │  region, Density and View pickers.   │  │  │  │
│  │  │  │  "Insert into Figma" button at the   │  │  │  │
│  │  │  │  bottom sends a canvas PNG, plus a   │  │  │  │
│  │  │  │  map SVG in the Flat view, via       │  │  │  │
│  │  │  │  postMessage ────────────────────────┼──┼─►│  │
│  │  │  └──────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │                       │                            │  │
│  │  ui.html receives bytes, forwards to ─────────────┼──►│
│  │  code.js sandbox                                   │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  figma.createNodeFromSvg(svg) when an SVG  │  │  │
│  │  │  came with up to 2,500 dots, otherwise     │  │  │
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

1. Open the Figma desktop app (web Figma can't side-load plugins).
2. Top-left menu → **Plugins → Development → Import plugin from manifest…**
3. Pick this folder's `manifest.json`.
4. Run **Plugins → Development → Globestudio**. The panel opens with a live globe.
5. Pick a look, a country or region, a density and Globe or Flat, then press **Insert into Figma**.

Insert lands at the viewport center. The Globe view sends no SVG, so the map arrives as a PNG of the globe preview, at the panel canvas size, on a rectangle. The Flat view of a dotted look also sends an SVG of the flat dotted map: with up to 2,500 dots it arrives as editable vectors, in named layers (Background, Dots and, for looks with overlays, Effects). A denser flat map, or Bloom's solid one, arrives as a PNG of the flat preview on a rectangle, as the line above the Insert button says. When an insert lands as a PNG and a Globestudio PNG rectangle is selected, it updates that rectangle in place instead of adding a new one; editable vectors always land as a new layer.

## Files

| File | Role |
|---|---|
| `manifest.json` | Plugin metadata and the network allowlist for `globestudio.app` |
| `ui.html` | UI iframe and the postMessage bridge to the sandbox |
| `code.js` | Sandbox: receives the PNG bytes and, from the Flat view of a dotted look, the SVG; creates vectors or the Figma image, handles selection update-in-place |
| `SUBMISSION.md` | Listing copy and a step-by-step Figma Community submission guide |

## Roadmap

- [x] Submit to Figma Community (see `SUBMISSION.md` for the walkthrough)
- [ ] "Insert at 2× / 3× scale" option for hi-DPI exports
- [ ] FigJam sticky-board layout (manifest already declares both editors)
- [ ] Save-to-Figma-library so a user's brand presets stay in their team file
- [ ] Variable bindings: let the inserted rectangle reference Figma variables for size and position

## License

MIT. See [LICENSE](../LICENSE).
