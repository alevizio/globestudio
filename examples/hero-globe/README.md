# Example: `hero-globe`

> **Status**: 🟡 Stubbed — README only. Code to come.

A landing-page hero with an animated dotted globe as the background. Headline
copy sits on top, the globe spins gently, and the whole thing degrades
gracefully on slower devices and with `prefers-reduced-motion`.

## What this proves

Worlddots isn't just an export tool — it's also a **live embeddable** for the
landing pages you build. This example shows the recommended setup for:

- Mounting the globe inside a Next.js / Astro / Vite app
- Keeping the canvas non-interactive (no drag, no zoom — it's a background)
- Falling back to a static PNG export below a CSS media query

## Planned structure

```
hero-globe/
├─ README.md         (this file)
├─ package.json
├─ index.html
├─ src/
│  ├─ main.jsx       (React entry)
│  ├─ Hero.jsx       (the actual hero component)
│  └─ globe-mount.js (small wrapper around buildGlobeDotLayer)
├─ public/
│  └─ fallback.png   (high-res PNG export for low-end devices)
└─ vercel.json       (or netlify.toml)
```

## Configuration

The globe will use the **Bloom** preset by default — soft glow, dark
background, network arcs on. The configuration object is hardcoded so the
hero doesn't depend on the full panel UI.

```js
// Sketch of the intended API
import { mountGlobe } from "worlddots";

mountGlobe(canvasRef.current, {
  preset: "bloom",
  interactive: false,
  rotateAnimating: true,
  network: true,
  panelCollapsed: true,
});
```

> ⚠️ This API doesn't exist yet — it's part of the roadmap for an
> **embeddable mode**. Until then, you can fork the main repo and run the
> whole app in iframe-friendly mode.

## Why this matters

The number one question we hear is "could I drop this on my marketing site?"
Right now the answer is "fork the repo and hand-mount the canvas." This
example gets that down to **one npm install + 20 lines of JSX**.

## Want to build this?

If you'd like to take a swing at this example before we get to it, please
open a Discussion first — there's an embeddable-mode API design we need to
align on. The whole thing should be roughly a day of work once that API is
stable.

[→ Start a Discussion](https://github.com/alevizio/worlddots/discussions/categories/ideas)
