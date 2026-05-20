# Integrations

How to drop Worlddots into the tools you already use. Every integration
is built on the [`/embed` route](https://worlddots.app/embed) — a
query-string-driven view that renders just the canvas with no chrome.

## Available now

| Tool | Method | Doc |
|---|---|---|
| **Webflow** | Paste into a Code Embed block | [webflow.md](./webflow.md) |
| **Framer** | Code component (or iframe) | [framer.md](./framer.md) |
| **Plain HTML** | `<iframe>` tag | [embed.md](./embed.md) |
| **Notion** | `/embed` slash command | [notion.md](./notion.md) |
| **Anything iframe-friendly** | Same as plain HTML | [embed.md](./embed.md) |

## Roadmap

| Tool | Plan |
|---|---|
| **Figma** | Plugin that hosts the embed UI + exports to a frame fill |
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
| `selection` | string | `world` | `country:USA`, `region:Europe`, `state:CA`, etc. |
| `motion` | 0–100 | `35` | Animation speed |
| `view` | `flat` \| `globe` | `globe` | |
| `autoSpin` | 0/1 | `1` | Continuous globe rotation |
| `static` | 0/1 | `0` | Freeze all motion. Use for Framer canvas mode or static screenshots |
| `transparent` | 0/1 | `0` | Transparent background |
| `background` | hex | preset's | Page background |
| `source` | string | `embed` | Analytics tag — `framer`, `webflow`, `notion`, etc. |
| `locale` | 2-letter | auto | Force a country-name display language |

## postMessage resize protocol

When iframed, Worlddots posts its desired height to the parent:

```js
window.addEventListener("message", (event) => {
  if (event.data?.type === "worlddots-resize") {
    iframe.style.height = `${event.data.height}px`;
  }
});
```

Most integrations don't need this — a fixed iframe height usually looks
better than an auto-resizing one for a globe. But it's there if you need it.

## When something doesn't work

- **WebGL 2 required** — Worlddots needs WebGL 2. ~95% of 2026 browsers
  have it. If a browser doesn't, the embed shows a graceful fallback
  message linking to worlddots.app.
- **Sandbox restrictions** — some iframe sandboxes block scripts.
  Worlddots needs `allow-scripts`. If your host enforces stricter
  sandboxing, the canvas won't render.
- **CSP** — Worlddots ships `Content-Security-Policy: frame-ancestors *`
  so any origin can embed. If you're proxying it through a strict-CSP
  host (corporate intranet, etc.), you may need to relax that.

[Open a Discussion](https://github.com/alevizio/worlddots/discussions/categories/q-a)
if you hit something unexpected.
