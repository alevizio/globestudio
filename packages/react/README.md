# @globestudio/react

Drop-in React component for embedding [Globestudio](https://globestudio.app) dotted globes and maps. Zero deps, SSR-friendly, autocomplete on every preset.

## Install

```bash
npm install @globestudio/react
# or pnpm add @globestudio/react
# or yarn add @globestudio/react
```

## Use

```tsx
import { Globe } from "@globestudio/react";

export default function Page() {
  return (
    <section>
      <h1>Worldwide coverage</h1>
      <Globe look="aurora" width={800} height={600} />
    </section>
  );
}
```

That's it. The component is a styled `<iframe>` over `globestudio.app/embed`, so the heavy lift (Three.js, shaders, country data) runs on the embed origin — your bundle stays a couple hundred bytes.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `look` | `LookId` | `"halftone"` | Autocomplete on every shipped preset |
| `width` | `number \| string` | `"100%"` | Numbers → pixels |
| `height` | `number \| string` | `480` | Numbers → pixels |
| `config` | `string` | — | Pre-built share-URL payload — overrides `look` |
| `title` | `string` | `"Globestudio dotted globe"` | A11y label |
| `className` | `string` | — | Forwarded |
| `style` | `CSSProperties` | — | Merged after `border: 0` |
| `loading` | `"lazy" \| "eager"` | `"lazy"` | Off-screen embeds defer WebGL until scrolled near |
| `source` | `string` | — | Tag for analytics attribution |
| `onLoad` | `(e) => void` | — | Forwarded |

## Helpers

```tsx
import { globestudio } from "@globestudio/react";

const embed = globestudio.embedUrl({ look: "vapor" });
//          → "https://globestudio.app/embed?look=vapor"

const thumb = globestudio.thumbnailUrl("halftone");
//          → "https://globestudio.app/looks/halftone.png"

const share = globestudio.shareUrl("eyJsb29rIjoidmFwb3IifQ");
//          → "https://globestudio.app/?c=eyJsb29rIjoidmFwb3IifQ"
```

Use these when you need the URL but not the iframe (e.g. Next.js `<Image src>`, server-rendered markup, OG metadata).

## SSR

The component is just JSX — renders the iframe HTML on the server, hydrates on the client without re-mounting (no client-only state, no `useEffect`).

```tsx
// app/page.tsx (Next.js App Router)
import { Globe } from "@globestudio/react";

export default function Page() {
  return <Globe look="risograph" />;
}
```

## Sizing patterns

```tsx
// Fill container
<Globe look="halftone" />  {/* width="100%", height=480 default */}

// Square in a card
<div style={{ width: 320, aspectRatio: "1 / 1" }}>
  <Globe look="aurora" width="100%" height="100%" />
</div>

// Background hero
<section style={{ position: "relative", height: 520 }}>
  <Globe
    look="vapor"
    width="100%"
    height="100%"
    style={{ position: "absolute", inset: 0 }}
  />
  <div style={{ position: "relative", padding: 64 }}>
    <h1>Hero content over the globe</h1>
  </div>
</section>
```

## Why a package and not a copy-paste snippet?

The snippet on [globestudio.app/integrations](https://globestudio.app/integrations) is what most people start with. The package adds:

- **TypeScript autocomplete on `look`** — no typos shipping to prod
- **Versioning** — pin to a tested version, upgrade deliberately
- **One-line install** in SaaS templates that ship via npm
- **`globestudio.*` helpers** for URL building outside the iframe context

The total surface area is one component and one helper object. Stays tiny on purpose.

## License

MIT — see [LICENSE](https://github.com/alevizio/globestudio/blob/main/LICENSE).
