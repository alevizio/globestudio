// Searchable adjectives per preset for the Cmd+K command palette.
// Tags are appended to the fuzzy-search corpus alongside name + group,
// so typing "synthwave" finds Vapor, "retro" finds CRT / BadTV /
// Pixel, "print" finds Halftone / Risograph / Newsprint, etc.
//
// Per docs/research/2026-05-ai-integration.md, this is the "smart
// substitute" for LLM-based preset search — covers 80% of the
// natural-language-query value with 0% cost.
//
// When adding a new preset, also tag it here. Keep tags short, lower-
// case, single-word or hyphenated. Aim for 4-8 tags per preset
// spanning aesthetic (modern, retro, soft), use-case (editorial,
// gaming, brand), and visual descriptors (glow, sketch, print).
export const presetTags = {
  default: ["clean", "minimal", "neutral", "simple", "starter"],
  halftone: ["print", "vintage", "editorial", "newspaper", "dots", "retro"],
  risograph: ["print", "pink", "cyan", "riso", "ink", "vibrant", "modern", "zine"],
  newsprint: ["cmyk", "print", "newspaper", "editorial", "vintage", "magazine"],
  aurora: ["glow", "atmospheric", "soft", "dreamy", "blue", "green", "space", "night"],
  pixel: ["8-bit", "retro", "game", "blocky", "square", "low-fi", "nintendo"],
  bayer: ["dither", "retro", "mac", "classic", "ordered", "monochrome"],
  atkinson: ["dither", "blue-noise", "mac", "classic", "monochrome", "apple"],
  wireframe: ["line", "outline", "edge", "technical", "sketch", "blueprint", "skeletal"],
  crt: ["retro", "scanline", "tv", "monitor", "phosphor", "vintage", "80s"],
  glitch: ["broken", "distorted", "error", "datamosh", "harsh"],
  badtv: ["vhs", "analog", "distorted", "retro", "scanline", "tape"],
  bloom: ["glow", "soft", "dreamy", "atmospheric", "warm", "halo"],
  metal: ["chrome", "shiny", "polished", "futuristic", "premium"],
  iridescent: ["holographic", "foil", "rainbow", "shimmer", "y2k", "sticker"],
  pencil: ["sketch", "hatching", "drawn", "traditional", "illustration"],
  corrupt: ["glitch", "broken", "datamosh", "harsh", "experimental"],
  toon: ["cartoon", "cel-shaded", "pop-art", "bold", "comic", "illustration"],
  threshold: ["binary", "two-tone", "minimal", "editorial", "contrast", "stark", "poster"],
  vapor: ["synthwave", "vaporwave", "retro", "neon", "pastel", "80s", "miami"],
  topographic: ["map", "contour", "terrain", "hiking", "nature", "outdoor", "earth"],
};
