# Looks bar chip preview images

Bitmap previews in `public/looks/`, used by the chips at the top of the side panel.
The chip renders this image instead of the SVG approximation when
a preset in `src/data/look-presets.js` carries a `previewImage`
field that points here.

## Naming

Match the preset's `id`:

```
default.png
halftone.png
pixel.png
wireframe.png
crt.png
glitch.png
badtv.png
bloom.png
metal.png
pencil.png
corrupt.png
```

Any of `.png`, `.webp`, `.jpg` work. WebP is smallest; PNG is
universal; JPG is fine for photographic looks (Bloom, Metal).

## Size

The chip displays at **40 × 40 CSS px** but renders at up to 2×
DPR — so source images should be **at least 80 × 80 px**.
**128 × 128 px** is a comfortable target that downscales cleanly.

The image is `object-fit: cover` against a 40 × 40 cell, so square
images crop cleanly; non-square images centre-crop.

## Generating

Easiest workflow:

1. Open the app, click the preset chip you want to capture.
2. Wait for the canvas to settle on a frame you like.
3. Open **Export → PNG**, set the size to 256 × 256, transparent
   background off, export.
4. Open the resulting PNG, crop tight on the sphere (keep
   ~5 % padding around the silhouette), save as
   `public/looks/<preset-id>.png`.
5. In `src/data/look-presets.js`, add the field to the matching
   preset:

   ```js
   {
     id: "halftone",
     name: "Halftone",
     blurb: "Halftone shader print",
     previewImage: "/looks/halftone.png",  // ← add this
     settings: merge({ ... }),
   },
   ```

## Small thumbnails

The looks bar chips, the command palette and the docs preset catalog
don't load these PNGs. They use `thumbs/<id>@2x.webp` (56 px) and
`thumbs/<id>@3x.webp` (84 px), downsampled with Lanczos so dot and
halftone patterns don't alias into noise, in linear light so dithered
looks keep their brightness. The script needs an ffmpeg with the
`zscale` filter. After adding or recapturing a PNG here, run:

```
npm run thumbs:generate            # every preset
npm run thumbs:generate -- <id>    # one preset
```

and commit the files in `thumbs/`. The same run writes `<id>.webp` next
to each PNG, a lossless copy the `/gallery` cards load; commit those
too. `src/utils/look-thumbs.test.js` fails if a preset is missing its
thumbs or its gallery copy.

## Fallback

If `previewImage` is missing **or** the file 404s, the chip falls
back to the live SVG render in `src/components/look-preview.jsx`.
So you can roll out images one preset at a time — no
big-bang switchover required.
