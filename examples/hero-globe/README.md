# Example: `hero-globe`

> **Status**: 🟢 Ready (via iframe) · 🟡 Native `mountGlobe` API queued

A landing-page hero with an animated dotted globe as the background.
Headline copy sits on top, the globe spins gently, and the whole thing
degrades gracefully on slower devices and with `prefers-reduced-motion`.

## What this proves

Worlddots isn't just an export tool — it's a **live embeddable** for
the landing pages you build. This example shows the recommended setup.

## The shippable version (today)

Drop this into your hero section:

```html
<section class="hero">
  <iframe
    class="hero-bg"
    src="https://worlddots.app/looks/bloom"
    title="Dotted globe background"
    loading="eager"
    aria-hidden="true"
  ></iframe>
  <div class="hero-content">
    <h1>Your headline goes here</h1>
    <p>Your subtitle. Your CTA.</p>
  </div>
</section>
```

```css
.hero {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: #0a0a0a;
}
.hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  pointer-events: none; /* let your CTAs handle clicks */
}
.hero-content {
  position: relative;
  z-index: 1;
  padding: 12vh 6vw;
  color: #fff;
}
@media (prefers-reduced-motion: reduce) {
  .hero-bg { opacity: 0.6; }
}
```

That's it. The globe spins via Worlddots's `autoSpin`, the iframe is
non-interactive so your CTAs receive clicks, and reduced-motion users
get a dimmed-but-static version (the inner Worlddots app already pauses
animation under the OS preference; this CSS layer is extra polish).

## Preset suggestions

The Bloom preset (`/looks/bloom`) is the strongest hero candidate —
soft glow, dark background, network arcs on. Other good fits:

- `/looks/aurora` — northern-lights bands, ethereal mood
- `/looks/iridescent` — pearlescent, modern
- `/looks/default` — calm classic

Avoid the "stamped" looks (`halftone`, `risograph`, `newsprint`,
`bayer`) for full-bleed hero backgrounds — they read better at
medium sizes where the dot grid is legible.

## Future: `mountGlobe` native API

The iframe approach has one limitation: no JS API for fine-grained
control (scroll-driven parameter changes, parallax-tied tilt, etc).
A future `@worlddots/embed` npm package will expose:

```js
import { mountGlobe } from "@worlddots/embed";

const globe = mountGlobe(canvasRef.current, {
  preset: "bloom",
  interactive: false,
  rotateAnimating: true,
  network: true,
});

// Later — react to scroll
window.addEventListener("scroll", () => {
  globe.set({ tiltX: window.scrollY * 0.02 });
});
```

Tracked in [docs/plans/integrations-rollout.md](../../docs/plans/integrations-rollout.md)
Phase 0 (the `/embed` route foundation) + Phase 5 (portable format).

## Reference implementation links

- [Vercel deployment of Worlddots itself](https://worlddots.app/) uses
  the dotted globe as its own background — view source for production
  CSS techniques.
- [`embed-snippet`](../embed-snippet/) — runnable HTML demo of the
  iframe pattern.

## License

MIT.
