// Extract a small brand palette from a logo/screenshot. The core
// (`paletteFromPixels`) is a pure function over an RGBA pixel array so it
// can be unit-tested without a canvas; `extractPaletteFromImage` is the thin
// browser wrapper that rasterizes the image first.

const relLuminance = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const saturation = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};

const channelToHex = (v) =>
  Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");

const toHex = (r, g, b) => `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;

/**
 * @param {Uint8ClampedArray|number[]} data RGBA pixels (length a multiple of 4)
 * @param {number} count max colors to return
 * @returns {string[]} hex colors, most brand-relevant first
 */
export const paletteFromPixels = (data, count = 5) => {
  const buckets = new Map();
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 125) continue; // skip mostly-transparent pixels
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // 5 bits/channel so near-identical colors merge into one bucket.
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const e = buckets.get(key);
    if (e) {
      e.r += r;
      e.g += g;
      e.b += b;
      e.n += 1;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }
  const colors = [...buckets.values()].map((e) => {
    const r = e.r / e.n;
    const g = e.g / e.n;
    const b = e.b / e.n;
    const lum = relLuminance(r, g, b);
    // Favor saturated, mid-bright colors (brand accents), weighted by
    // coverage via sqrt so a small but vivid accent can still rank.
    const vibrancy = (0.25 + saturation(r, g, b)) * (0.35 + 0.65 * (1 - Math.abs(lum - 0.55) * 1.4));
    return { r, g, b, n: e.n, score: vibrancy * Math.sqrt(e.n), hex: toHex(r, g, b) };
  });
  colors.sort((a, b) => b.score - a.score);
  // Drop perceptually-close duplicates so the swatches aren't five near-greys.
  const picked = [];
  for (const c of colors) {
    const distinct = picked.every(
      (p) => Math.abs(p.r - c.r) + Math.abs(p.g - c.g) + Math.abs(p.b - c.b) > 60,
    );
    if (distinct) picked.push(c);
    if (picked.length >= count) break;
  }
  return picked.map((c) => c.hex);
};

/** Darkest color in a hex palette — used as a logo-matched background. */
export const darkestColor = (hexes) => {
  if (!hexes || !hexes.length) return null;
  let best = hexes[0];
  let bestLum = Infinity;
  for (const hex of hexes) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lum = relLuminance(r, g, b);
    if (lum < bestLum) {
      bestLum = lum;
      best = hex;
    }
  }
  return best;
};

/** Browser wrapper: rasterize the image small, then extract its palette. */
export const extractPaletteFromImage = (img, count = 5) => {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, size, size);
  return paletteFromPixels(ctx.getImageData(0, 0, size, size).data, count);
};
