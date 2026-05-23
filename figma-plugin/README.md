# Globestudio — Figma plugin

Drops a customized Globestudio dotted globe into your Figma file as a
high-resolution image. The plugin UI is a thin iframe over
`globestudio.app/embed`, so you get the full preset library + shader
effects + country selection inside Figma.

## Quick install (development)

1. Open **Figma desktop** (web Figma can't import local plugins).
2. **Plugins → Development → Import plugin from manifest…**
3. Pick this folder's `manifest.json`.
4. **Plugins → Development → Globestudio.** The panel opens with a
   live globe.

Press **Insert into Figma** to drop a 1200×675 PNG of the current view
at the viewport center. Press it again with the inserted rectangle
selected to update in place.

## Files

| File | Role |
|---|---|
| `manifest.json` | Plugin metadata + network allowlist for `globestudio.app` |
| `ui.html` | UI iframe + postMessage bridge to the sandbox |
| `code.js` | Sandbox: receives PNG bytes, creates the Figma image |

See [`docs/integrations/figma.md`](../docs/integrations/figma.md) for
architecture details and the postMessage protocol.

## Roadmap

- Submit to Figma Community (free).
- "Insert at 2× / 3× scale" option for hi-DPI exports.
- FigJam sticky-board layout (manifest already declares both editors).
