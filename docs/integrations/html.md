# Globestudio in plain HTML

Two patterns, pick the one that fits your page.

## 1. Iframe (zero JS)

```html
<iframe
  src="https://globestudio.app/embed?look=halftone"
  width="640"
  height="480"
  style="border:0"
  loading="lazy"
  title="Globestudio dotted globe"
></iframe>
```

Works on every static-site host: Cloudflare Pages, Vercel, Netlify,
GitHub Pages, S3, plain Apache, anything.

## 2. Script-tag loader (one-liner)

```html
<div data-globestudio data-look="bayer" style="height:480px"></div>
<script src="https://globestudio.app/embed.js" async></script>
```

The script finds every `<div data-globestudio>` and replaces it with
a sized iframe. Useful when your CMS gives you a script slot but
not an iframe slot. Reads `data-look` and `data-config` (a JSON
or base64 payload) from the div.

## Custom config

The Share URL pattern works here too:

```html
<iframe
  src="https://globestudio.app/embed?c=<base64>"
  width="640"
  height="480"
></iframe>
```

`<base64>` is the URL-safe base64 of the full canvas config JSON.
Generate one from the canvas app's **Export → Share** dialog.

## Tips

- `loading="lazy"` defers the iframe until the user scrolls to it.
- `width="100%"` makes it flex with the parent.
- `title="..."` is read by screen readers — always include it.
- Wrap in a responsive container (`aspect-ratio: 4/3`) if you want
  proper letterbox-free scaling on phones.
