# @globestudio/element

Framework-agnostic `<globe-studio>` web component for embedding [Globestudio](https://globestudio.app) dotted globes. It has no dependencies. It's a small wrapper over `globestudio.app/embed`, so Three.js, shaders and country data all run on the embed origin.

It works anywhere custom elements do, including plain HTML, Svelte, Vue, Solid, Astro, Webflow and Framer.

## Install

```sh
npm install @globestudio/element
```

## Usage

```js
import "@globestudio/element"; // auto-registers <globe-studio>
```

```html
<!-- Pick a preset -->
<globe-studio look="aurora" width="800" height="600"></globe-studio>

<!-- From a share config (the ?c= payload from the app's Share tab) -->
<globe-studio config="…" height="480"></globe-studio>

<!-- On a light page -->
<globe-studio look="wireframe" theme="light"></globe-studio>

<!-- Halftone, Toon and Threshold paint a dark page, so make them see-through too -->
<globe-studio look="halftone" theme="light" config='{"backgroundStyle":"transparent"}'></globe-studio>
```

Or via CDN, no build step:

```html
<script type="module" src="https://esm.sh/@globestudio/element"></script>
<globe-studio look="halftone"></globe-studio>
```

## Attributes

| Attribute | Default | Notes |
|---|---|---|
| `look` | `halftone` | Any shipped preset id. With `config`, the config is layered over it. |
| `config` | | Pre-built share config (`?c=` payload), layered over `look`, or over Default without one. |
| `theme` | `dark` | `light` suits a light page: the glow and grid switch to a palette for light pages, and the white ink of Halftone, Wireframe, Toon and Threshold turns graphite. Halftone, Toon and Threshold paint a dark page of their own, so make them see-through in `config` too. Other values are ignored. |
| `width` | `100%` | Forwarded to the iframe. |
| `height` | `480` | Forwarded to the iframe. |
| `title` | `Globestudio dotted globe` | Accessible label. |
| `loading` | `lazy` | `lazy` defers off-screen embeds. |
| `source` | | Analytics attribution tag. |

Attributes are reactive: change `look`, `config` or `theme` and the globe updates.

In the app, the export dialog's Share tab writes this tag for the design on
screen: pick Web component under Embed code and copy it.

## API

```js
import { defineGlobeStudio, buildEmbedUrl } from "@globestudio/element";

defineGlobeStudio("my-globe"); // register under a custom tag
buildEmbedUrl({ look: "vapor" }); // → "https://globestudio.app/embed?look=vapor"
buildEmbedUrl({ look: "vapor", theme: "light" }); // → "https://globestudio.app/embed?look=vapor&theme=light"
```

MIT © Globestudio
