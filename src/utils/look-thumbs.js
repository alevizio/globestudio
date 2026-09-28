// Small look previews for the 28 px chips (looks bar, command palette) and
// the 44 px docs catalog cards. scripts/generate-look-thumbs.js downsamples
// public/looks/<id>.png into these; the 512 px PNGs stay for the gallery
// and the share pipeline. Widths are named by the density they serve at a
// 28 px slot; `sizes` lets the browser pick the right one for any slot.
export const LOOK_THUMB_WIDTHS = { "2x": 56, "3x": 84 };

export const lookThumbProps = (id, sizes) => ({
  src: `/looks/thumbs/${id}@2x.webp`,
  srcSet: Object.entries(LOOK_THUMB_WIDTHS)
    .map(([density, width]) => `/looks/thumbs/${id}@${density}.webp ${width}w`)
    .join(", "),
  sizes,
});
