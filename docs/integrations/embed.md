# Globestudio embed (plain HTML)

Drop a Globestudio globe or map into any HTML-friendly page. Works in
plain HTML, Astro, Next.js, SvelteKit, Eleventy, Jekyll — anything.

## Method 1 — Script tag (Recommended)

The easiest method. Drop a div with `data-*` attributes and the
`embed.js` loader; the script swaps it for an iframe configured from
the attributes.

```html
<div data-globestudio data-look="halftone" data-density="50"
     style="width: 100%; height: 480px;"></div>
<script async src="https://globestudio.app/embed.js"></script>
```

You can drop multiple `[data-globestudio]` divs with different
attributes on the same page — they each get their own iframe.

```html
<div data-globestudio data-look="aurora" data-selection="continent:Europe"
     style="width: 100%; height: 420px;"></div>

<div data-globestudio data-look="risograph" data-selection="country:JPN"
     data-render-mode="solid" style="width: 100%; height: 420px;"></div>

<script async src="https://globestudio.app/embed.js"></script>
```

Auto-resizes the iframe height to match the canvas aspect when the host
element has no explicit height. ~3kb gzipped, zero dependencies, scans
the page on load + on any later DOM additions (so it works with SPAs
and dynamic content too).

### Embedding a custom config (someone else's share link)

When someone shares a custom config with you (a URL like
`globestudio.app/?c=…`), you can drop that exact look into your own
page via the `data-config` attribute:

```html
<div
  data-globestudio
  data-config="eyJ2IjoxLCJzZWxlY3Rpb24iOiJjb3VudHJ5OkZSQSJ9…"
  style="width: 100%; height: 480px;"
></div>
<script async src="https://globestudio.app/embed.js"></script>
```

The value is the token after `?c=` in the share URL (everything after
the `=`). The loader strips a leading `?c=` if you pasted the whole
query string, so this also works:

```html
<div data-globestudio
     data-config="?c=eyJ2IjoxLCJzZWxlY3Rpb24iOiJjb3VudHJ5OkZSQSJ9…">
</div>
```

The shared config layers on top of any other `data-*` attributes on
the same element. So you can take someone's share token and pin the
selection or motion separately without re-encoding the whole config.

## Method 2 — Plain iframe

Useful when you want to pin the iframe URL inline, route it through a
CDN, or apply custom iframe styles.

```html
<iframe
  src="https://globestudio.app/embed?look=halftone&density=70&autoSpin=1"
  width="100%"
  height="500"
  style="border:0;"
  loading="lazy"
  title="Globestudio dotted globe"
></iframe>
```

## All parameters

See [`docs/integrations/README.md`](./README.md#common-parameters)
for the full table.

## Auto-resize via postMessage

Globestudio posts its desired height on mount and on every resize:

```js
window.addEventListener("message", (event) => {
  if (event.data?.type === "globestudio-resize") {
    document.querySelector("#globestudio-iframe").style.height =
      event.data.height + "px";
  }
});
```

Most pages don't need this — a fixed iframe height usually reads better
for a hero. But if you're embedding inside a flexible layout (e.g. a CMS
that doesn't know the height ahead of time), wire up the listener.

## Runnable example

See [`examples/embed-snippet/index.html`](../../examples/embed-snippet/index.html)
for a complete page you can copy and adapt.
