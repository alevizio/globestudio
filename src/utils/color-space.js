// Which color space a stored hex is in.
//
// Every hex that reached WebGL went through THREE.Color, which converts it
// from sRGB to linear. The canvas then shows that linear value as is: there
// is no sRGB encode at the end of the effect chain. So each color rendered
// darker than its hex (#808080 showed as #373737), and a PNG never matched
// the SVG export of the same design.
//
// A design now says which way its colors are read. With hex colors (the
// studio switches to them when a color is picked, and a v3 link or a version
// 2 file carries them) a color enters WebGL as the value of its hex and
// renders as that hex (three/picked-color.js). Every other design, the
// looks, the defaults, old links and saved designs included, keeps the old
// reading and renders exactly as before. legacyColorsToLinear turns old
// colors into the hex colors that render the same, and hexColorsToLegacy
// goes back.
//
// Only colors drawn by WebGL as picked colors take part. The background
// (CSS), the sphere and the glow (tuned through the old conversion, and the
// glow hex also tints the CSS halo as is) are read the old way in both.

// three.js's own transfer functions (src/math/ColorManagement.js), copied so
// this module stays free of three and matches THREE.Color to the last bit.
export const srgbToLinear = (c) =>
  c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);

export const linearToSrgb = (c) =>
  c < 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 0.41666) - 0.055;

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const toByte = (value) => Math.round(Math.min(1, Math.max(0, value)) * 255);

// The six digits of a 3 or 6 digit hex, or null. Anything else (#rgba,
// #rrggbbaa, names) fails THREE.Color's parser either way, so it is left
// alone.
const hexDigits = (hex) => {
  const match = typeof hex === "string" ? HEX_RE.exec(hex) : null;
  if (!match) return null;
  return match[1].length === 3
    ? match[1].split("").map((d) => d + d).join("")
    : match[1];
};

const mapHex = (hex, mapByte) => {
  const digits = hexDigits(hex);
  if (!digits) return hex;
  let out = "#";
  for (let i = 0; i < 6; i += 2) {
    out += mapByte(parseInt(digits.slice(i, i + 2), 16)).toString(16).padStart(2, "0");
  }
  // Channels at 0 or 255 map to themselves. Keep such a color exactly as
  // written ("#FFF" stays "#FFF"), since the renderer compares dotColor
  // with "#ffffff" as a string.
  return out === `#${digits.toLowerCase()}` ? hex : out;
};

// The old sRGB byte a hex color byte stands for. toLinearHex sends up to
// seven dark sRGB bytes to one byte (#3c, #3d and #3e all give #0c), and no
// sRGB byte reaches some bright bytes. For a byte it reaches, this is the
// middle sRGB byte of its group (the upper one of two, and 0 for 0), which
// is the one every look and default color came from; null for the rest.
const SOURCE_BYTES = (() => {
  const groups = Array.from({ length: 256 }, () => []);
  for (let c = 0; c < 256; c += 1) groups[toByte(srgbToLinear(c / 255))].push(c);
  return groups.map((group, byte) => (byte === 0 ? 0 : group.length ? group[group.length >> 1] : null));
})();

// The value WebGL is given for a byte of a hex color. For a byte
// toLinearHex reaches it is the exact value THREE.Color gave the old byte
// behind it, so a look or a design turned into hex colors draws the very
// pixels it drew before. It still rounds to the byte itself, so a picked
// color renders as its hex. Any other byte goes in as it is.
export const storedChannel = (byte) => {
  const source = SOURCE_BYTES[byte];
  return source === null ? byte / 255 : srgbToLinear(source / 255);
};

// The working-space r, g, b of a hex color, or null when it isn't a 3 or 6
// digit hex.
export const storedRgb = (hex) => {
  const digits = hexDigits(hex);
  if (!digits) return null;
  return [0, 2, 4].map((i) => storedChannel(parseInt(digits.slice(i, i + 2), 16)));
};

// The hex color that renders the way the old color `hex` did:
// round(255 * srgbToLinear(c)) per channel.
export const toLinearHex = (hex) => mapHex(hex, (byte) => toByte(srgbToLinear(byte / 255)));

// The inverse: the old color that renders the way the hex color `hex` does.
// The solid-mode world texture is an sRGB canvas that the GPU decodes when
// it samples it, so a hex color is drawn into it as toSrgbHex(color) and
// reaches the shader as storedRgb gives it: the old byte behind each
// channel, or the nearest sRGB byte where there is none.
export const toSrgbHex = (hex) => mapHex(hex, (byte) => SOURCE_BYTES[byte] ?? toByte(linearToSrgb(byte / 255)));

// Every config color that WebGL draws as a picked color.
const COLOR_FIELDS = ["dotColor", "worldFill", "worldStroke"];
const GRADIENT_FIELDS = ["dotGradient", "worldFillGradient", "worldStrokeGradient"];
const GLOBE_COLOR_FIELDS = ["gridColor", "arcColor", "pulseColor", "dataMarkerColor"];
const GLOBE_GRADIENT_FIELDS = ["gridGradient"];
const FLOW_COLOR_FIELDS = ["colorA", "colorB", "colorC"];

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const convertColors = (config, mapColor) => {
  if (!isRecord(config)) return config;
  const convertFields = (source, colorFields, gradientFields) => {
    const next = { ...source };
    for (const key of colorFields) {
      if (key in next) next[key] = mapColor(next[key]);
    }
    for (const key of gradientFields) {
      const gradient = next[key];
      if (isRecord(gradient)) next[key] = { ...gradient, from: mapColor(gradient.from), to: mapColor(gradient.to) };
    }
    return next;
  };
  const next = convertFields(config, COLOR_FIELDS, GRADIENT_FIELDS);
  if (isRecord(config.globeSettings)) {
    next.globeSettings = convertFields(config.globeSettings, GLOBE_COLOR_FIELDS, GLOBE_GRADIENT_FIELDS);
  }
  if (isRecord(config.flowSettings)) {
    next.flowSettings = convertFields(config.flowSettings, FLOW_COLOR_FIELDS, []);
  }
  return next;
};

// A config (or any part of one) with its old colors rewritten as hex colors
// that render the same.
export const legacyColorsToLinear = (config) => convertColors(config, toLinearHex);

// A config with its hex colors rewritten as old colors that render the same.
export const hexColorsToLegacy = (config) => convertColors(config, toSrgbHex);
