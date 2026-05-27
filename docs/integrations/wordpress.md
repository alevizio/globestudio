# Globestudio in WordPress

A Globestudio embed is just an iframe. Any block editor (Gutenberg) site
can drop one in, and Classic Editor works too.

## Block editor (Gutenberg)

1. Click the `+` block inserter, choose **Custom HTML**.
2. Paste:

```html
<iframe
  src="https://globestudio.app/embed?look=halftone"
  width="100%"
  height="480"
  style="border:0"
  loading="lazy"
  title="Globestudio dotted globe"
></iframe>
```

3. Click **Preview** to see it render inside the editor.
4. Publish.

## Classic Editor

Switch to the **Text** tab and paste the same iframe.

## Pick a preset

The `look` query parameter accepts any preset id:

- `halftone`, `risograph`, `newsprint`, `aurora`, `bloom`, `iridescent`,
  `crt`, `glitch`, `wireframe`, `pixel`, `bayer`, `atkinson`, `vapor`,
  `toon`, `metal`, `pencil`, `corrupt`, `threshold`, `topographic`, `badtv`.
- `default` is the plain dotted globe with no shader.

Browse the full set at <https://globestudio.app/docs#presets>.

## Tips

- Set `loading="lazy"` so the iframe defers until the user scrolls to it
  — the rest of the post stays fast.
- Use `width="100%"` so the embed flexes with the column. Height can
  stay a fixed `px` value or you can let your theme apply a responsive
  wrapper.
- Some themes wrap iframes in a 16:9 aspect-ratio container. If your
  globe gets letterboxed, override that wrapper in the theme's CSS.

## Customizing further

Want to share a specific configuration (colors, projection, density)?
Open the export dialog in the canvas app, copy the **Share URL** —
it'll look like `https://globestudio.app/embed?c=<base64>` — and paste
that as your iframe `src`. The recipient sees your exact canvas state.

See [docs/integrations/embed.md](./embed.md) for the full Embed +
share-URL surface.
