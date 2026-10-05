# Example: `react-component`

> **Status**: 🟢 Ready — copy-paste reference, zero dependencies.

A drop-in `<Globestudio>` React component for **Next.js / Vite / Remix
/ any React 18+ tree**. Wraps the hosted `/embed` route as an iframe
with strongly-typed props for every embed parameter, auto-resizes
height when the host doesn't pin one, and is SSR-safe (no `window`
access at render time).

## Install

Prefer the npm package, which covers all 21 looks:
`npm install @globestudio/react` (see [`packages/react`](../../packages/react/)).
This file is the zero-install alternative; copy it in:

```bash
curl -O https://raw.githubusercontent.com/alevizio/globestudio/main/examples/react-component/Globestudio.tsx
```

Drop it into your project (e.g. `components/Globestudio.tsx`). The
component has **zero dependencies** beyond React itself.

## Usage

```tsx
import { Globestudio } from "./components/Globestudio";

export function Hero() {
  return (
    <Globestudio
      look="halftone"
      density={50}
      selection="continent:Europe"
      style={{ width: "100%", height: 480 }}
    />
  );
}
```

### Embed a custom share config

If someone shared a custom look with you (a URL like
`globestudio.app/?c=…`), use the token after `?c=`. It's URL-encoded JSON:

```tsx
<Globestudio shareToken="%7B%22v%22%3A1%2C%22selection%22%3A%22country%3AFRA%22%7D" />
```

Props on the component **override** matching fields in the shared
config — so you can take someone else's config and pin one parameter
(e.g. selection) without re-encoding the whole token.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `look` | `GlobestudioLook` | `"default"` | One of the 17 preset IDs (the npm package has all 21) |
| `density` | `number` | preset's | 1–100 |
| `dotSize` | `number` | preset's | Dot radius |
| `dotColor` | `string` | preset's | Hex (with or without `#`) |
| `worldFill` | `string` | preset's | Continent fill (solid mode) |
| `renderMode` | `"dots" \| "solid"` | preset's | |
| `selection` | `string` | `"world"` | `country:USA`, `continent:Europe`, `subregion:Western Europe` |
| `motion` | `number` | 35 | 0–100 |
| `tiltX`, `tiltY` | `number` | 0 | Globe tilt in degrees |
| `autoSpin` | `boolean` | true | Continuous rotation |
| `view` | `"flat" \| "globe"` | `"globe"` | |
| `background` | `string` | preset's | Hex |
| `transparent` | `boolean` | false | Overrides `background` when true |
| `theme` | `"light" \| "dark"` | `"dark"` | `"light"` suits a light page: Wireframe's white ink turns graphite |
| `staticMode` | `boolean` | false | Freezes motion |
| `shareToken` | `string` | — | The blob after `?c=` in a share URL |
| `source` | `string` | `"react-component"` | Analytics tag |
| `origin` | `string` | `https://globestudio.app` | Override for self-hosting |
| `className`, `style`, `title`, `loading` | standard React iframe props | — | |

## What's nice

- **SSR-safe** — `useEffect`-gated message listener, no `window` access
  at render. Works in Next.js's RSC + client-component split, in
  Remix loaders + components, in Astro islands.
- **Auto-resize** — listens for `postMessage({ type: "globestudio-resize" })`
  from the embed and adjusts the iframe height. Only activates when
  the host element doesn't have a fixed `style.height`.
- **Typed all the way through** — `look`, `view`, `renderMode`,
  `projection` all narrowed to their actual union types. Pasting in
  `look="atomic"` is a compile error.
- **Dependency-free** — single file, no peer deps beyond React 18+.

## When to use this vs the alternatives

| Tool you're using | Preferred path |
|---|---|
| **Next.js / Vite / Remix / Astro (React)** | This component |
| **Plain HTML / Webflow / Squarespace** | [embed.js script tag](../../README.md#one-line-script-tag-recommended) |
| **Framer** | [Framer code component](../framer-component/) |
| **Figma** | [Figma plugin](../../figma-plugin/) |
| **No JS at all** | [Plain `<iframe>`](../../README.md#plain-iframe) |

## See also

- [Embed parameters](../../README.md#embed-parameters): the full embed parameter reference
- [globestudio.app/integrations](https://globestudio.app/integrations): every integration path, with copy-paste setups
