# Integrations

How to drop Globestudio into the tools you already use. Every integration
is built on the [`/embed` route](https://globestudio.app/embed) — a
query-string-driven view that renders just the canvas with no chrome.

## Quickest path — one-line script embed

For Webflow / Squarespace / blog posts / any HTML, the easiest method is
the script-tag loader:

```html
<div data-globestudio data-look="halftone" data-density="50"
     style="width: 100%; height: 480px;"></div>
<script async src="https://globestudio.app/embed.js"></script>
```

Configure via `data-*` attributes — every embed param has a matching
attribute (`data-look`, `data-selection`, `data-render-mode`, etc.). The
script auto-injects the iframe + listens for resize messages. ~3kb
gzipped, zero dependencies. Works with later-added elements
(SPAs, Webflow interactions) via a MutationObserver.

## Per-tool guides

| Tool | Method | Doc |
|---|---|---|
| **Webflow** | Script tag or Code Embed block | [webflow.md](./webflow.md) |
| **Framer** | Code component (or iframe) | [framer.md](./framer.md) |
| **Figma** | Plugin — opens the embed in the side panel, inserts as image | [figma.md](./figma.md) |
| **React (Next.js / Vite / Remix)** | Drop-in `<Globestudio>` component, zero deps | [`examples/react-component/`](../../examples/react-component/) |
| **Plain HTML** | Script tag or `<iframe>` | [embed.md](./embed.md) |
| **Notion** | `/embed` slash command | [notion.md](./notion.md) |
| **AI assistants (Claude, ChatGPT, Codex, Cursor)** | `llms.txt` + JSON Schema | [ai-assistants.md](./ai-assistants.md) |
| **Anything iframe-friendly** | Same as plain HTML | [embed.md](./embed.md) |

## Roadmap

| Tool | Plan |
|---|---|
| **Figma Community submission** | Plugin scaffold ships now; community publishing post-launch |
| **Webflow Code Component** | DevLink-based native React component (gated on demand) |
| **`.worlddot` portable format** | Tool-agnostic JSON file + tiny JS player runtime |

See [`docs/plans/integrations-rollout.md`](../plans/integrations-rollout.md)
for the full phased plan.

## Common parameters

Every integration accepts the same query string:

| Param | Type | Default | Notes |
|---|---|---|---|
| `look` | enum | `default` | One of the 17 preset IDs (e.g. `halftone`, `bayer`, `risograph`, `aurora`) |
| `density` | 1–90 | `40` | Dot count cap |
| `dotSize` | 0.1–25 | `10` | Dot radius |
| `dotColor` | hex (no `#`) | preset's | `?dotColor=ffffff` |
| `worldFill` | hex (no `#`) | preset's | Solid-mode land fill |
| `renderMode` | `dots` \| `solid` | preset's | |
| `selection` | string | `world` | `country:USA`, `continent:Europe`, `subregion:Western Europe`, etc. |
| `motion` | 0–100 | `35` | Animation speed |
| `view` | `flat` \| `globe` | `globe` | |
| `autoSpin` | 0/1 | `1` | Continuous globe rotation |
| `static` | 0/1 | `0` | Freeze all motion. Use for Framer canvas mode or static screenshots |
| `transparent` | 0/1 | `0` | Transparent background |
| `background` | hex | preset's | Page background |
| `source` | string | `embed` | Analytics tag — `framer`, `webflow`, `notion`, etc. |
| `locale` | 2-letter | auto | Force a country-name display language |

## Config files (`.json`)

The Export → Share tab also lets users export their full canvas
config as a `.json` file. The file format is documented as a JSON
Schema published at:

```
https://globestudio.app/schema/config.json
```

VS Code / Cursor / WebStorm read the `$schema` field in the config
file and provide autocomplete + validation. The exported configs
already include the schema reference at the top — IDE intellisense
works on a downloaded config file without any extra setup.

## postMessage resize protocol

When iframed, Globestudio posts its desired height to the parent:

```js
window.addEventListener("message", (event) => {
  if (event.data?.type === "globestudio-resize") {
    iframe.style.height = `${event.data.height}px`;
  }
});
```

Most integrations don't need this — a fixed iframe height usually looks
better than an auto-resizing one for a globe. But it's there if you need it.

## When something doesn't work

- **WebGL 2 required** — Globestudio needs WebGL 2. ~95% of 2026 browsers
  have it. If a browser doesn't, the embed shows a graceful fallback
  message linking to globestudio.app.
- **Sandbox restrictions** — some iframe sandboxes block scripts.
  Globestudio needs `allow-scripts`. If your host enforces stricter
  sandboxing, the canvas won't render.
- **CSP** — Globestudio ships `Content-Security-Policy: frame-ancestors *`
  so any origin can embed. If you're proxying it through a strict-CSP
  host (corporate intranet, etc.), you may need to relax that.

[Open a Discussion](https://github.com/alevizio/globestudio/discussions/categories/q-a)
if you hit something unexpected.
