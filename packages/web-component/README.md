# @globestudio/element

Framework-agnostic `<globe-studio>` web component for embedding [Globestudio](https://globestudio.app) dotted globes. Zero dependencies — it's a tiny wrapper over `globestudio.app/embed`, so Three.js, shaders, and country data all run on the embed origin.

Works anywhere custom elements do: vanilla HTML, Svelte, Vue, Solid, Astro, Webflow, Framer.

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
```

Or via CDN, no build step:

```html
<script type="module" src="https://esm.sh/@globestudio/element"></script>
<globe-studio look="halftone"></globe-studio>
```

## Attributes

| Attribute | Default | Notes |
|---|---|---|
| `look` | `halftone` | Any shipped preset id. Ignored when `config` is set. |
| `config` | — | Pre-built share config (`?c=` payload). Overrides `look`. |
| `width` | `100%` | Forwarded to the iframe. |
| `height` | `480` | Forwarded to the iframe. |
| `title` | `Globestudio dotted globe` | Accessible label. |
| `loading` | `lazy` | `lazy` defers off-screen embeds. |
| `source` | — | Analytics attribution tag. |

Attributes are reactive — change `look`/`config` and the globe updates.

## API

```js
import { defineGlobeStudio, buildEmbedUrl } from "@globestudio/element";

defineGlobeStudio("my-globe"); // register under a custom tag
buildEmbedUrl({ look: "vapor" }); // → "https://globestudio.app/embed?look=vapor"
```

MIT © Globestudio
