# Globestudio in Webflow

Drop a dotted globe or map into any Webflow project via the Code Embed
block. No plugins, no account, no React. The full Globestudio tool renders
inside the iframe; query-string parameters configure the look.

## Quick — script-tag embed (Recommended)

Easiest path. Paste this into a Code Embed block. Customize via
`data-*` attributes — no iframe / URL editing required.

```html
<div
  data-globestudio
  data-look="halftone"
  data-density="50"
  style="width: 100%; height: 480px;"
></div>
<script async src="https://globestudio.app/embed.js"></script>
```

Add more `data-*` attributes to customize:

```html
<div
  data-globestudio
  data-look="aurora"
  data-density="70"
  data-selection="continent:Europe"
  data-render-mode="dots"
  data-auto-spin="true"
  data-dot-color="#ffffff"
  data-source="webflow"
  style="width: 100%; height: 520px;"
></div>
<script async src="https://globestudio.app/embed.js"></script>
```

The script is ~3kb gzipped, scans for any `[data-globestudio]` element on
the page (now or later — works with Webflow's interactions / CMS-bound
content), and replaces it with an iframe configured from the data
attributes. Auto-resizes height to match the canvas aspect when the host
element has no explicit height.

## Direct iframe — when you need full control

Drop into a Code Embed block. Useful if you want to tweak the embed URL
inline, route it through a CDN, or apply custom styles to the iframe.

```html
<iframe
  src="https://globestudio.app/embed?look=halftone&density=70&autoSpin=1&source=webflow"
  width="100%"
  height="500"
  style="border:0; display:block;"
  loading="lazy"
  title="Globestudio dotted globe"
  allow="autoplay"
></iframe>
```

> The `?source=webflow` query (or `data-source="webflow"` on the script
> embed) tells our analytics where the embed lives, so we can
> prioritize Webflow-specific improvements. Optional but appreciated.

## Picking a look

| Style you want | `look=` value |
|---|---|
| Clean white dots on dark | `default` |
| Newspaper halftone print | `halftone` |
| Risograph pink + cyan ink | `risograph` |
| Glowing aurora | `bloom` |
| Glitchy / VHS bad signal | `glitch` or `badtv` |
| Cathode ray / retro screen | `crt` |
| Pencil-drawn sketch | `pencil` |
| Iridescent foil | `iridescent` |
| Bayer dither (Mac classic) | `bayer` |
| Atkinson dither (Mac crunchy) | `atkinson` |
| Northern lights bands | `aurora` |

Full preset list with previews: <https://globestudio.app/>

## Picking a region

| Param | Examples |
|---|---|
| `selection=world` | Default — full world |
| `selection=country:USA` | One country (use the 3-letter code) |
| `selection=continent:Europe` | Continent |
| `selection=subregion:Northern Europe` | Sub-region |
| `selection=state:CA` | US state (use 2-letter postal code) |

## Common patterns

### Full-bleed hero behind your headline

Set the Code Embed's containing div to `position: relative` and your
headline overlay to `position: absolute` with a z-index above the iframe:

```html
<!-- Inside a Webflow Hero section -->
<iframe
  src="https://globestudio.app/embed?look=bloom&autoSpin=1&source=webflow"
  width="100%"
  height="100%"
  style="position:absolute; inset:0; border:0;"
  loading="eager"
  title="Animated dotted globe"
></iframe>
<div class="hero-headline">
  <h1>Your headline here</h1>
</div>
```

### Static decorative element (no motion)

For sections where animation would distract — e.g. inside a long-form
article or above a footer — freeze motion via `?static=1`:

```html
<iframe
  src="https://globestudio.app/embed?look=wireframe&static=1&source=webflow"
  width="100%"
  height="400"
  style="border:0"
  loading="lazy"
></iframe>
```

### Country-specific data callout

If your section is about one market, pin the embed to that country:

```html
<iframe
  src="https://globestudio.app/embed?look=halftone&selection=country:JPN&view=flat&source=webflow"
  width="100%"
  height="500"
  style="border:0"
  loading="lazy"
></iframe>
```

## Performance tips

- **Use `loading="lazy"`** on iframes below the fold so they don't block
  first paint. Webflow doesn't add this by default — paste it explicitly.
- **Set `width="100%"`** and a reasonable fixed `height`. Auto-resize via
  postMessage is supported but usually a fixed height reads better for
  a hero.
- **One embed per page is fine.** Two or three are okay on a fast page.
  Beyond ~5 you'll start hitting the WebGL context limit some browsers
  enforce.

## What Webflow Interactions can do

Webflow's native Interactions engine can't directly target content
inside an iframe (the embed is a separate browsing context). It CAN:

- Animate the iframe element itself (opacity, transform, position).
- Show/hide the iframe on scroll.
- Trigger a class change on a sibling that the iframe doesn't read.

If you need Globestudio to react to Webflow Interactions (e.g. switch
preset on scroll), wait for the [native Webflow Code Component](https://developers.webflow.com/code-components/introduction)
which is on our roadmap — it would render as real DOM and respond to
Interactions.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| iframe shows "doesn't support WebGL 2" message | Old browser / no WebGL | Update browser, or test in Chrome/Safari/Firefox |
| iframe is blank | Code Embed has a typo in the URL | Compare to the snippet above — common issue is missing `https:` |
| iframe is too short / cut off | Fixed height too small | Increase the `height` attribute, or rely on `postMessage` resize |
| Multiple iframes per page lag the browser | WebGL context limit | Reduce embeds, or use `static=1` on most of them |
| Embed shows the full app UI (panel visible) | Wrong URL — using `/` instead of `/embed` | Make sure the URL is `/embed?...` not `/?...` |

## Reference

- Live embed playground: <https://globestudio.app/embed?look=halftone>
- Embed parameters: [`docs/integrations/README.md`](./README.md#common-parameters)
- All looks: <https://globestudio.app/>
