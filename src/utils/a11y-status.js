// Formats the current canvas state into a screen-reader-friendly summary.
// This drives the visually-hidden proxy DOM that mirrors the WebGL canvas
// so blind / low-vision users can understand what's rendered without
// seeing the canvas.
//
// The output is two pieces:
//   1. summary — one-sentence narration ("World map in globe view, ...")
//   2. details — list of [label, value] pairs for the proxy's
//      definition-list rendering
//
// Both are computed from the same App state that drives the canvas, so
// they stay in sync automatically.

const LOOK_PRESET_DESCRIPTIONS = {
  default: "Default — clean dotted globe",
  halftone: "Halftone — newspaper print pattern",
  risograph: "Risograph — pink and cyan ink",
  newsprint: "Newsprint — CMYK halftone",
  aurora: "Aurora — flowing northern-lights bands",
  pixel: "Pixel — 8-bit blocky pixelation",
  bayer: "Bayer — classic-Mac binary dither",
  atkinson: "Atkinson — blue-noise blobby dither",
  iridescent: "Iridescent — pearlescent foil sheen",
  wireframe: "Wireframe — edge-traced outlines",
  crt: "CRT — cathode-ray phosphor scanlines",
  glitch: "Glitch — broken signal slices",
  badtv: "Bad TV — VHS analog distortion",
  bloom: "Bloom — soft glowing aurora",
  metal: "Metal — polished chrome reflections",
  pencil: "Pencil — cross-hatched sketch",
  corrupt: "Corrupt — channel-corrupted datamosh",
};

const PROJECTION_NAMES = {
  mercator: "Mercator",
  equalEarth: "Equal Earth",
  naturalEarth1: "Natural Earth",
  winkel3: "Winkel Tripel",
  robinson: "Robinson",
};

export const formatGlobeStatus = (state) => {
  const {
    viewMode = "globe",
    renderMode = "dots",
    selection = { mode: "country", label: "World" },
    lookName = null,
    lookId = null,
    density = 40,
    dotCount = 0,
    effect = "none",
    flatProjection = "mercator",
    riversVisible = false,
    citiesVisible = false,
  } = state || {};

  const viewLabel = viewMode === "flat" ? "flat view" : "globe view";
  const modeLabel = renderMode === "solid" ? "solid mode" : "dotted mode";
  const selectionLabel = selection.label || "World";
  const lookLabel = lookName || (lookId ? lookId.replace(/-/g, " ") : "custom");

  // Sentence-form summary for the screen reader's initial read.
  const summary = `${selectionLabel} in ${viewLabel}, ${modeLabel}, ${lookLabel} preset. ${
    renderMode === "dots" ? `${dotCount.toLocaleString()} dots at density ${density}.` : ""
  }`.trim();

  const details = [
    ["Region", selectionLabel],
    ["View", viewMode === "flat" ? "Flat (2D plane)" : "Globe (3D sphere)"],
    ["Render mode", renderMode === "solid" ? "Solid land + stroke" : "Dot field"],
    ["Look preset", LOOK_PRESET_DESCRIPTIONS[lookId] || lookLabel],
  ];
  if (renderMode === "dots") {
    details.push(["Dot count", dotCount.toLocaleString()]);
    details.push(["Density", `${density} out of 90`]);
  }
  if (effect && effect !== "none") {
    details.push(["Shader effect", effect.charAt(0).toUpperCase() + effect.slice(1)]);
  }
  if (renderMode === "solid" && viewMode === "flat") {
    details.push(["Projection", PROJECTION_NAMES[flatProjection] || flatProjection]);
  }
  if (riversVisible) details.push(["Rivers", "Visible"]);
  if (citiesVisible) details.push(["Cities", "Visible"]);

  return { summary, details };
};
