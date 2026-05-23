# Globestudio for Figma

A Figma plugin that drops a customized Globestudio dotted globe into
the cursor's location as a high-resolution image. Iframe-based — the
plugin UI is a thin shell around `globestudio.app/embed`, so the same
preset library, shader effects, and projections you'd use on the web
are available in the plugin panel.

## What it does

- Pick a preset (17 looks — halftone, risograph, aurora, glitch, etc.)
- Tweak density, dot size, projection, country/region selection
- Press **Insert into Figma** → the plugin captures the live canvas at
  its native resolution and creates a Rectangle node filled with the
  PNG, centered in your viewport
- Press Insert again while the inserted node is selected → updates in
  place (same position, name, parent) instead of spawning a duplicate

## Install (dev / local)

The plugin isn't on the Figma Community yet. To run it locally:

1. **Clone this repo** and `cd` into the `figma-plugin/` directory.
2. Open Figma desktop (the plugin runtime requires the desktop app —
   web Figma doesn't support local plugin development).
3. From the menu bar: **Plugins → Development → Import plugin from
   manifest…** → pick `figma-plugin/manifest.json`.
4. Open any Figma file. **Plugins → Development → Globestudio.** The
   panel opens with the live globe.

## Architecture

The plugin is intentionally thin — almost no JS in the plugin sandbox.
The heavy lifting (Three.js, presets, controls) lives on
`globestudio.app/embed` and gets loaded into the plugin UI as an
iframe.

```
┌─────────────────────────────────────────────────────────┐
│  Figma plugin sandbox (code.js)                          │
│   • figma.showUI(ui.html)                                 │
│   • on "insert" → figma.createImage(bytes)                │
│                                                            │
│   ┌──────────────────────────────────────────────────┐   │
│   │  ui.html (Figma plugin UI iframe)                 │   │
│   │   • full-bleed iframe → globestudio.app/embed     │   │
│   │   • forwards postMessages to sandbox              │   │
│   │                                                    │   │
│   │   ┌───────────────────────────────────────────┐  │   │
│   │   │  globestudio.app/embed?plugin=figma       │  │   │
│   │   │   • full preset library + controls         │  │   │
│   │   │   • Insert button (canvas.toBlob → bytes)  │  │   │
│   │   │   • postMessage({ type: insert, bytes })   │  │   │
│   │   └───────────────────────────────────────────┘  │   │
│   └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

This means:

- **Plugin updates ship without re-submission.** New presets, shader
  effects, or bug fixes deployed to globestudio.app are live in the
  plugin within seconds.
- **The plugin code stays tiny.** The sandbox is ~70 lines of plain
  JS. No build step, no bundler, no SDK.
- **One source of truth.** The web app and the Figma plugin show the
  same globe at the same fidelity.

## Files

- `manifest.json` — Figma plugin manifest. Declares `globestudio.app`
  as an allowed network domain so the iframe can load.
- `ui.html` — Iframe + the postMessage bridge between embed and
  sandbox. ~50 lines.
- `code.js` — Sandbox code. Creates the image + rectangle. ~80 lines.

## postMessage protocol

The embed → ui.html bridge expects:

```ts
{
  type: "globestudio-insert",
  bytes: Uint8Array,    // PNG bytes from canvas.toBlob()
  width: number,        // native canvas width
  height: number,
  presetName: string,   // applied as the rectangle's name
}
```

The ui.html → sandbox forward wraps that in `{ pluginMessage: ... }`
per the Figma plugin protocol.

## Roadmap

- [ ] Submit to Figma Community as **free**.
- [ ] Add an "Insert at 2× / 3× scale" option for hi-DPI exports.
- [ ] Support FigJam sticky-board layout (manifest already declares
      `editorType: ["figma", "figjam"]`).
- [ ] "Convert to SVG" path that emits a Globestudio scene as native
      Figma vector nodes (long-term — needs SVG export from the
      renderer that the plugin can ingest).
