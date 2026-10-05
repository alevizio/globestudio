import { backgroundKind } from "./canvas-background.js";

// What SVG and Copy as vectors leave out of a design, for the export
// dialog's note. The SVG (svg-markup.js) is the flat map's dots, with their
// shapes and colors, on a flat background. Every shader effect is drawn on
// the GPU (three/post-effects.js): the SVG gives six of them a rough filter
// or pattern, and Figma drops most of that on paste, so every effect counts
// as left out. The atmosphere, grid and sphere aren't listed: the SVG is
// the flat map, where they don't show.
//
// Each entry is what the vectors leave out, and true when it takes "come".
// Every effect in shaderEffectOptions has one (vector-note.test.js).
export const EFFECT_DROPS = {
  none: null,
  bloom: ["the bloom"],
  chromatic: ["the color split"],
  crt: ["the scanlines and glow", true],
  halftone: ["the halftone pattern"],
  pixel: ["the pixelation"],
  threshold: ["the two-tone threshold"],
  glitch: ["the glitches", true],
  edge: ["the traced edges", true],
  wave: ["the wave distortion"],
  metal: ["the chrome shading"],
  pencil: ["the pencil strokes and paper", true],
  toon: ["the cel shading"],
  stripes: ["the stripes", true],
  badtv: ["the tape static"],
  rgb: ["the RGB split"],
  chroma: ["the chroma zoom"],
  corrupt: ["the datamosh"],
  bayer: ["the dithering"],
  iridescent: ["the foil shimmer"],
  risograph: ["the pink and cyan inks", true],
  newsprint: ["the CMYK halftone"],
  aurora: ["the aurora bands", true],
  atkinson: ["the dithering"],
  ascii: ["the ASCII art"],
};

const SOLID_LAND = ["the solid land"];

// What the vectors leave out of the current design (the studio's state or a
// look's settings), empty when they keep all of it.
export const vectorDrops = ({ shaderSettings, renderMode, backgroundStyle, transparent, globeSettings }) => {
  const effect = shaderSettings?.effect ?? "none";
  const drops = [];
  // The SVG draws the dots even when the canvas shows solid land.
  if (renderMode === "solid") drops.push(SOLID_LAND);
  if (EFFECT_DROPS[effect]) drops.push(EFFECT_DROPS[effect]);
  // The panel's Glow puts a halo around every dot, on the flat map too
  // (three/globe.js). Bloom and CRT already name theirs.
  if (globeSettings?.look === "borderless" && effect !== "bloom" && effect !== "crt") drops.push(["the glow"]);
  const kind = backgroundKind({ backgroundStyle, transparent });
  if (kind === "space" || kind === "flow") drops.push([`the ${kind} background`]);
  return drops;
};

// The note for the SVG tab, or with figma for the Figma tab, where
// copyImage points to Copy as image instead of PNG. Null when nothing is
// left out.
export const vectorNote = (drops, { figma = false, copyImage = false } = {}) => {
  if (!drops?.length) return null;
  const names = drops.map(([name]) => name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  const verb = names.length > 1 || drops[0][1] ? "come" : "comes";
  const lead = drops.includes(SOLID_LAND) ? `${figma ? "Vectors draw" : "SVG draws"} this map as dots. ` : "";
  const keep = copyImage ? "with Copy as image" : "in PNG";
  return `${lead}${list[0].toUpperCase()}${list.slice(1)} only ${verb} through ${keep}.`;
};
