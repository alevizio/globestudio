# Globestudio iframe embed (plain HTML)

Drop a Globestudio globe or map into any iframe-supporting page. Works
in plain HTML, Astro, Next.js, SvelteKit, Eleventy, Jekyll — anything.

## Minimum-viable snippet

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
