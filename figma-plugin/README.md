# Globestudio — Figma plugin

**🚀 [Install from Figma Community →](https://www.figma.com/community/plugin/1641603648370488902/globestudio)**

Drops a customized Globestudio dotted globe into your Figma file as a
high-resolution image. The plugin UI is a thin iframe over
`globestudio.app/embed`, so you get the full preset library + shader
effects + country selection inside Figma — no separate UI to maintain.

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
│  │  │  │  Full Globestudio app — presets,     │  │  │  │
│  │  │  │  density, shaders, country select.   │  │  │  │
│  │  │  │  "Insert into Figma" button at the   │  │  │  │
│  │  │  │  bottom captures the canvas → PNG    │  │  │  │
│  │  │  │  bytes via postMessage ──────────────┼──┼─►│  │
│  │  │  └──────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │                       │                            │  │
│  │  ui.html receives bytes, forwards to ─────────────┼──►│
│  │  code.js sandbox                                   │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  figma.createImage(bytes)                  │  │  │
│  │  │  figma.createRectangle() w/ image fill     │  │  │
│  │  │  Insert at viewport center                 │  │  │
│  │  │  Update-in-place if a prior Globestudio    │  │  │
│  │  │  node is selected                          │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

## Local development install

1. Open **Figma desktop** (web Figma can't side-load plugins).
2. Top-left menu → **Plugins → Development → Import plugin from manifest…**
3. Pick this folder's `manifest.json`.
4. **Plugins → Development → Globestudio** — the panel opens with a live globe.
5. Customize → press **Insert into Figma**.

A 1200×675 PNG drops at the viewport center. Press Insert again with the inserted rectangle selected and it updates in place (no duplicate spawn).

## Files

| File | Role |
|---|---|
| `manifest.json` | Plugin metadata + network allowlist for `globestudio.app` |
| `ui.html` | UI iframe + postMessage bridge to the sandbox |
| `code.js` | Sandbox: receives PNG bytes, creates the Figma image, handles selection update-in-place |
| `SUBMISSION.md` | Marketing copy + step-by-step Figma Community submission guide |

## Roadmap

- [ ] Submit to Figma Community (see `SUBMISSION.md` for the walkthrough)
- [ ] "Insert at 2× / 3× scale" option for hi-DPI exports
- [ ] FigJam sticky-board layout (manifest already declares both editors)
- [ ] Save-to-Figma-library so a user's brand presets stay in their team file
- [ ] Variable bindings — let the inserted rectangle reference Figma variables for size/position

## License

MIT — see [LICENSE](../LICENSE).
