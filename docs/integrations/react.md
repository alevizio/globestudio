# Globestudio in React / Next.js

Paste, don't install. The Globestudio embed is a regular `<iframe>`
inside a React tree — no npm dependency, no SSR caveats, no global
state. Works in Next.js (App + Pages), Remix, Astro islands, Gatsby,
and CRA without changes.

## Drop-in component

```jsx
export const Globe = ({
  look = "halftone",
  width = 640,
  height = 480,
  className,
}) => (
  <iframe
    src={`https://globestudio.app/embed?look=${look}`}
    width={width}
    height={height}
    style={{ border: 0 }}
    loading="lazy"
    title="Globestudio dotted globe"
    className={className}
  />
);
```

```jsx
<Globe look="aurora" width={800} height={500} />
```

## Next.js App Router

The embed works in both **server** and **client** components. If you
want a stable layout-shift-free render, give the wrapper a fixed
aspect-ratio:

```jsx
// app/page.tsx
export default function Page() {
  return (
    <div style={{ aspectRatio: "4 / 3", maxWidth: 800 }}>
      <Globe look="risograph" width="100%" height="100%" />
    </div>
  );
}
```

## TypeScript

```ts
type GlobeProps = {
  look?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
};
```

## Customizing further

The Share URL pattern (`?c=<base64>`) works inside the `src` too —
generate one from the canvas app's **Export → Share** dialog and paste
it into your component.

```jsx
<Globe look={null} src="https://globestudio.app/embed?c=eyJsb29rIjoiYXVyb3JhIiwic2VsZWN0aW9uIjoiZXVyb3BlIn0" />
```

## Tips

- The iframe is just an iframe — Suspense, dynamic imports, and route
  prefetching don't affect it.
- Skip `next/dynamic` — it's not needed; the embed has no JS bundle to
  ship to your page.
- Use `loading="lazy"` to defer until in-view, especially on long pages.
