// Color conversion helpers used by the color picker. All values use the
// canonical ranges used by CSS: r/g/b 0–255, h 0–360, s/v/l 0–100. Hex strings
// are 7 chars (#RRGGBB) or "transparent". RGB/HSB/HSL inputs round-trip
// losslessly enough that typing in one mode and switching to another shows
// the user the right numbers.

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const toHexByte = (n) =>
  clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");

export const isValidHex = (hex) => /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(hex).trim());

export const normalizeHex = (hex) => {
  const cleaned = String(hex).trim().replace(/^#/, "");
  const full = cleaned.length === 3
    ? cleaned.split("").map((c) => c + c).join("")
    : cleaned;
  return `#${full.toLowerCase()}`;
};

export const hexToRgb = (hex) => {
  const cleaned = String(hex).trim().replace(/^#/, "");
  const full = cleaned.length === 3
    ? cleaned.split("").map((c) => c + c).join("")
    : cleaned;
  const num = parseInt(full || "000000", 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

export const rgbToHex = ({ r, g, b }) =>
  `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;

// Theme-aware color flip. Uses HSL lightness inversion (l → 100-l) so:
// - hue + saturation are preserved (a designer's red stays red, just
//   light↔dark instead of inverting to cyan like a CMYK plate),
// - whites↔blacks, off-whites↔near-blacks,
// - low-saturation neutrals (the gray world-fills) get an extra nudge
//   away from middle-gray so they actually CHANGE lightness instead of
//   staying stuck at l~50% (the failure mode that made solid mode look
//   washed-out in light theme).
// Round-trips ARE NOT exact through the amplifier — a single toggle
// looks much better than a round-trip-preserving identity invert.
export const invertHex = (hex) => {
  if (!hex || hex === "transparent") return hex;
  if (!isValidHex(hex)) return hex;
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  let newL = 100 - hsl.l;
  if (hsl.s < 12) {
    if (newL >= 50) newL = Math.min(100, newL + 18);
    else newL = Math.max(0, newL - 18);
  }
  return rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: newL }));
};

// Invert a gradient's color stops while preserving angle, midpoint, and
// per-stop alphas. Returns null pass-through so the caller can keep its
// existing nullable semantics.
export const invertGradient = (gradient) => {
  if (!gradient) return gradient;
  return {
    ...gradient,
    from: invertHex(gradient.from),
    to: invertHex(gradient.to),
  };
};

export const rgbToHsb = ({ r, g, b }) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return { h, s: Math.round(s * 100), v: Math.round(max * 100) };
};

export const hsbToRgb = ({ h, s, v }) => {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;
  const i = Math.floor(hn * 6);
  const f = hn * 6 - i;
  const p = vn * (1 - sn);
  const q = vn * (1 - f * sn);
  const t = vn * (1 - (1 - f) * sn);
  let r;
  let g;
  let b;
  switch (i % 6) {
    case 0: r = vn; g = t; b = p; break;
    case 1: r = q; g = vn; b = p; break;
    case 2: r = p; g = vn; b = t; break;
    case 3: r = p; g = q; b = vn; break;
    case 4: r = t; g = p; b = vn; break;
    default: r = vn; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

export const rgbToHsl = ({ r, g, b }) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
};

export const hslToRgb = ({ h, s, l }) => {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hue2rgb = (t) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };
  return {
    r: Math.round(hue2rgb(hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(hn) * 255),
    b: Math.round(hue2rgb(hn - 1 / 3) * 255),
  };
};
