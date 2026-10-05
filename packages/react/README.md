# @globestudio/react

React component that embeds [Globestudio](https://globestudio.app) dotted globes and maps. It has no dependencies, works with SSR and autocompletes preset names.

## Install

```bash
npm install @globestudio/react
# or pnpm add @globestudio/react
# or yarn add @globestudio/react
```

For a new project, copy the [starter](https://github.com/alevizio/globestudio/tree/main/examples/starter-react) instead. It is a Vite app with a globe on the page:

```bash
npx degit alevizio/globestudio/examples/starter-react my-globe
```

Or [open it in StackBlitz](https://stackblitz.com/github/alevizio/globestudio/tree/main/examples/starter-react) to try it with nothing to install.

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

The component is a styled `<iframe>` over `globestudio.app/embed`, so the heavy work (Three.js, shaders, country data) runs on the embed origin and your bundle stays a couple hundred bytes.

In the app, the export dialog's Share tab writes a `<Globe config=… />` snippet for the design on screen: pick React under Embed code and copy it.

On a light page, add `theme="light"`, so Wireframe's white ink turns graphite instead of all but vanishing:

```tsx
<Globe look="wireframe" theme="light" />
```

Halftone, Toon and Threshold paint a dark page of their own, where graphite ink is lost, so make them see-through in the config as well:

```tsx
<Globe look="halftone" theme="light" config='{"backgroundStyle":"transparent"}' />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `look` | `LookId` | `"halftone"` | Autocomplete on every shipped preset |
| `width` | `number \| string` | `"100%"` | A number means pixels |
| `height` | `number \| string` | `480` | A number means pixels |
| `config` | `string` | | The design's JSON string (`JSON.stringify(design)`), not URL encoded. Layered over `look` when you pass both, or over Default alone. A whole share link, or its `?c=` query, works too |
| `theme` | `"light" \| "dark"` | `"dark"` | `"light"` suits a light page: the glow and grid switch to a palette for light pages, and the white ink of Halftone, Wireframe, Toon and Threshold turns graphite. Halftone, Toon and Threshold paint a dark page of their own, so make them see-through in `config` too |
| `title` | `string` | `"Globestudio dotted globe"` | A11y label |
| `className` | `string` | | Forwarded |
| `style` | `CSSProperties` | | Merged after `border: 0` |
| `loading` | `"lazy" \| "eager"` | `"lazy"` | Off-screen embeds defer WebGL until scrolled near |
| `source` | `string` | | Tag for analytics attribution |
| `onLoad` | `(e) => void` | | Forwarded |

## Helpers

```tsx
import { globestudio } from "@globestudio/react";

const embed = globestudio.embedUrl({ look: "vapor" });
//          → "https://globestudio.app/embed?look=vapor"

const thumb = globestudio.thumbnailUrl("halftone");
//          → "https://globestudio.app/looks/halftone.png"

// A share config is URL-encoded JSON: the ?c= value from a link the
// Share dialog made, or one you build yourself. "v": 3 tells Globestudio
// it was encoded once, so every value (a "%" too) arrives as written, and
// that its colors render as their hex.
const payload = encodeURIComponent(JSON.stringify({ v: 3, selection: "country:JPN" }));
const share = globestudio.shareUrl(payload);
//          → "https://globestudio.app/?c=%7B%22v%22%3A3%2C%22selection%22%3A%22country%3AJPN%22%7D"
```

Use these when you need the URL but not the iframe (e.g. Next.js `<Image src>`, server-rendered markup, OG metadata).

## SSR

The component is plain JSX. It renders the iframe HTML on the server and hydrates on the client without re-mounting, since it has no client-only state and no `useEffect`.

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

## Package or snippet

Most people start with the snippet on [globestudio.app/integrations](https://globestudio.app/integrations). The package adds:

- TypeScript autocomplete on `look`, so typos get caught
- Versioning: pin a tested version and upgrade when you choose
- A one-line install in SaaS templates that ship via npm
- `globestudio.*` helpers for building URLs outside the iframe

The whole API is one component and one helper object.

## License

MIT. See [LICENSE](https://github.com/alevizio/globestudio/blob/main/LICENSE).
