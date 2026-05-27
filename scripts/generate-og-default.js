#!/usr/bin/env node
// Generates EVERY Open Graph card for globestudio.app:
//   - public/og/default.png          → headline card for /
//   - public/og.svg                  → SVG mirror of the headline
//   - public/og/{preset-id}.png × 19 → per-preset cards for /looks/:id
//
// All cards share the same composition: a dotted globe (real Natural
// Earth 1:50m coastlines, projected to a sphere) cropped to the
// bottom-right, the DottedGlobe wordmark in the top-left, a pixel-font
// headline + blurb, two pixel-icon chips at the bottom-left, and the
// URL. Per-preset cards swap in the preset's name + blurb, tint the
// dots/accent with the preset's palette, and link to /looks/:id.
//
// Replaces both the old scripts/generate-og-images.js (designed cards
// with a flat dot grid) and the earlier generate-og-default (which
// only produced the headline). Single pass, ~30 seconds for all 20.
//
// Run:
//   node scripts/generate-og-default.js

import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { feature as topoFeature } from "topojson-client";
import { geoContains } from "d3-geo";
import { lookPresets } from "../src/data/look-presets.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const outputDir = resolve(projectRoot, "public/og");
const fontCacheDir = resolve(projectRoot, "scripts/.cache");
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
if (!existsSync(fontCacheDir)) mkdirSync(fontCacheDir, { recursive: true });

// ----- Pixel-font fetch (Press Start 2P — classic pixel font, OFL) -----
const fetchFont = async (filename, url) => {
  const cachePath = resolve(fontCacheDir, filename);
  if (existsSync(cachePath)) return readFileSync(cachePath);
  console.log(`Fetching ${filename}…`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${filename}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(cachePath, buffer);
  return buffer;
};
const fontBuffer = await fetchFont(
  "PressStart2P-Regular.ttf",
  "https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf",
);
const fontBase64 = fontBuffer.toString("base64");

// ----- World map data -----
const topoModule = await import(
  resolve(projectRoot, "node_modules/world-atlas/countries-50m.json"),
  { with: { type: "json" } },
);
const topology = topoModule.default;
const world = topoFeature(topology, topology.objects.countries);
world.features = world.features.filter(
  (f) => String(parseInt(f.id, 10)) !== "10", // drop Antarctica
);

// ----- Canvas + globe geometry -----
const W = 1200;
const H = 630;
const GLOBE_CX = 1080;
const GLOBE_CY = 540;
const GLOBE_R = 520;
const YAW = (-20 * Math.PI) / 180;
const PITCH = (18 * Math.PI) / 180;

// Compute dot positions ONCE — the projection is shared across every
// preset, only the dot color changes per card.
const computeDots = () => {
  const dots = [];
  const LAT_STEP = 2;
  const LNG_STEP = 2;
  for (let lat = -56; lat <= 78; lat += LAT_STEP) {
    const cosLat = Math.cos((lat * Math.PI) / 180);
    if (cosLat < 0.05) continue;
    const lngStep = LNG_STEP / Math.max(0.18, cosLat);
    for (let lng = -180; lng <= 180; lng += lngStep) {
      if (!geoContains(world, [lng, lat])) continue;
      const latR = (lat * Math.PI) / 180;
      const lngR = (lng * Math.PI) / 180;
      let x = Math.cos(latR) * Math.sin(lngR);
      let y = Math.sin(latR);
      let z = Math.cos(latR) * Math.cos(lngR);
      const x2 = x * Math.cos(YAW) + z * Math.sin(YAW);
      const z2 = -x * Math.sin(YAW) + z * Math.cos(YAW);
      x = x2;
      z = z2;
      const y3 = y * Math.cos(PITCH) - z * Math.sin(PITCH);
      const z3 = y * Math.sin(PITCH) + z * Math.cos(PITCH);
      y = y3;
      z = z3;
      if (z < 0.04) continue;
      const sx = GLOBE_CX + x * GLOBE_R;
      const sy = GLOBE_CY - y * GLOBE_R;
      if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;
      dots.push({
        x: +sx.toFixed(1),
        y: +sy.toFixed(1),
        r: +(2.0 + z * 2.8).toFixed(2),
        op: +(0.32 + z * 0.55).toFixed(2),
      });
    }
  }
  return dots;
};
const dots = computeDots();

// ----- Per-preset style: drives both the dot rendering and the
// accent color. `style` picks one of the rendering modes below;
// `dot` / `accent` are the primary colors. Modes implemented:
//   circle        small dots, depth-scaled (default look)
//   big-circle    fatter halftone-style dots
//   square        pixelated squares
//   square-bw     binary B/W squares (threshold)
//   ring          hollow circle outlines (topographic)
//   gradient      circles filled with the preset's accent gradient
//   dual-ink      two color layers slightly offset (risograph)
//   cmyk          three CMY offset layers (newsprint)
//   rgb-shift     three RGB color channels at offsets (glitch)
//   bloom         soft-glow halos under each dot (bloom)
//   bayer         small squares laid out in an ordered dither pattern
//   pencil        rough sketched short strokes per point
//   bands         horizontal aurora bands modulate dot opacity
//   crt           dots + horizontal scanline overlay
//   badtv         dots + chromatic-aberration jitter
//   corrupt       dots + random pixel-corruption blocks
//   metal         dots with bright-to-dark vertical gradient fill
//   toon          two-tone stepped color based on dot Y position
//   vapor         vertical gradient pink-to-cyan
const PRESET_PALETTES = {
  default: { dot: "#f6f2ea", accent: "#8ddfff", style: "circle" },
  halftone: { dot: "#f6f2ea", accent: "#a8a39b", style: "big-circle" },
  newsprint: { dot: "#3ec5e8", accent: "#e83e9a", style: "cmyk" },
  risograph: { dot: "#ff5c9a", accent: "#406bf5", style: "dual-ink", dot2: "#406bf5" },
  aurora: { dot: "#2ef098", accent: "#52d8ff", style: "bands", dot2: "#52d8ff" },
  pixel: { dot: "#f6f2ea", accent: "#a8a39b", style: "square" },
  bayer: { dot: "#ffffff", accent: "#a8a39b", style: "bayer" },
  atkinson: { dot: "#ffffff", accent: "#a8a39b", style: "bayer" },
  wireframe: { dot: "#a8e5f5", accent: "#6cb6ff", style: "ring" },
  crt: { dot: "#7fffd4", accent: "#3ec5e8", style: "crt" },
  glitch: { dot: "#ff3c94", accent: "#40e0ff", style: "rgb-shift" },
  badtv: { dot: "#cda47c", accent: "#8ddfff", style: "badtv" },
  bloom: { dot: "#fff2a3", accent: "#ff9a3c", style: "bloom" },
  metal: { dot: "#cfd6e0", accent: "#7a8290", style: "metal" },
  pencil: { dot: "#d9d3c0", accent: "#7a7368", style: "pencil" },
  iridescent: { dot: "#c8b8ff", accent: "#7ce8e0", style: "gradient" },
  corrupt: { dot: "#ff007f", accent: "#00ff7f", style: "corrupt", dot2: "#00ff7f" },
  toon: { dot: "#3df4ff", accent: "#ffd84a", style: "toon", dot2: "#ffd84a" },
  threshold: { dot: "#ffffff", accent: "#8ddfff", style: "square-bw" },
  topographic: { dot: "#a8e5f5", accent: "#6cb6ff", style: "ring" },
  vapor: { dot: "#ff5cb3", accent: "#52d8ff", style: "vapor", dot2: "#52d8ff" },
};
const paletteFor = (id) => PRESET_PALETTES[id] ?? PRESET_PALETTES.default;

// Stable PRNG for any preset that needs jitter (corrupt, pencil…).
const rng32 = (seed) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Build the SVG markup that paints the globe's dots for a given style.
// Each style consumes the precomputed `dots` array and emits a string
// of SVG primitives (<circle>, <rect>, paths, etc.). Where a style
// also needs a defs entry (gradient, filter), it returns it via the
// `defs` field; the outer renderCard pulls those in. Optional
// `overlay` markup is laid OVER the dots (scanlines, noise blocks).
const buildGlobePaint = ({ id, style, dot, dot2, accent }) => {
  const defs = [];
  let body = "";
  let overlay = "";

  const eachDot = (fn) => dots.map(fn).join("");

  switch (style) {
    case "circle":
      body = eachDot(
        (d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${dot}" opacity="${d.op}"/>`,
      );
      break;

    case "big-circle":
      // Halftone — bigger dots, density-driven would need real luma;
      // we just bump radius and opacity for the look.
      body = eachDot(
        (d) => `<circle cx="${d.x}" cy="${d.y}" r="${(d.r * 1.45).toFixed(2)}" fill="${dot}" opacity="${Math.min(1, d.op + 0.1).toFixed(2)}"/>`,
      );
      break;

    case "square":
      // Pixel — squares scaled to similar visual weight as the
      // default circles. Square sides == 2 * radius * 1.2.
      body = eachDot((d) => {
        const s = +(d.r * 2.2).toFixed(2);
        const x = (d.x - s / 2).toFixed(2);
        const y = (d.y - s / 2).toFixed(2);
        return `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${dot}" opacity="${d.op}"/>`;
      });
      break;

    case "square-bw":
      // Threshold — fully opaque B/W squares, no depth fade.
      body = eachDot((d) => {
        const s = +(d.r * 2.4).toFixed(2);
        const x = (d.x - s / 2).toFixed(2);
        const y = (d.y - s / 2).toFixed(2);
        return `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${dot}"/>`;
      });
      break;

    case "bayer":
      // Bayer/Atkinson dither — small squares, alternating rows
      // dropped to simulate the ordered-dither sparseness.
      body = eachDot((d, i) => {
        if (i % 3 === 0) return ""; // skip every third for the sparse look
        const s = 2.4;
        const x = (d.x - s / 2).toFixed(2);
        const y = (d.y - s / 2).toFixed(2);
        return `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${dot}" opacity="${(0.6 + d.op * 0.4).toFixed(2)}"/>`;
      });
      break;

    case "ring":
      // Topographic / wireframe — hollow circle outlines.
      body = eachDot(
        (d) => `<circle cx="${d.x}" cy="${d.y}" r="${(d.r * 1.4).toFixed(2)}" fill="none" stroke="${dot}" stroke-width="1.2" opacity="${(d.op * 0.85).toFixed(2)}"/>`,
      );
      break;

    case "gradient": {
      // Iridescent — rainbow gradient running across the globe disc.
      defs.push(`<linearGradient id="og-rainbow-${id}" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ff5cb3"/>
        <stop offset="33%" stop-color="${accent}"/>
        <stop offset="66%" stop-color="${dot}"/>
        <stop offset="100%" stop-color="#ffd84a"/>
      </linearGradient>`);
      body = eachDot(
        (d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="url(#og-rainbow-${id})" opacity="${d.op}"/>`,
      );
      break;
    }

    case "dual-ink":
      // Risograph — two color layers slightly offset for the
      // misregistered-ink look.
      body =
        eachDot(
          (d) => `<circle cx="${(d.x - 3).toFixed(1)}" cy="${d.y}" r="${d.r}" fill="${dot}" opacity="${(d.op * 0.85).toFixed(2)}"/>`,
        ) +
        eachDot(
          (d) => `<circle cx="${(d.x + 3).toFixed(1)}" cy="${(d.y + 2).toFixed(1)}" r="${d.r}" fill="${dot2 ?? accent}" opacity="${(d.op * 0.85).toFixed(2)}"/>`,
        );
      break;

    case "cmyk":
      // Newsprint — three CMY plates rotated/offset slightly.
      body =
        eachDot(
          (d) => `<circle cx="${(d.x - 2).toFixed(1)}" cy="${(d.y - 2).toFixed(1)}" r="${(d.r * 0.95).toFixed(2)}" fill="#3ec5e8" opacity="${(d.op * 0.7).toFixed(2)}"/>`,
        ) +
        eachDot(
          (d) => `<circle cx="${(d.x + 2).toFixed(1)}" cy="${(d.y - 1).toFixed(1)}" r="${(d.r * 0.95).toFixed(2)}" fill="#e83e9a" opacity="${(d.op * 0.7).toFixed(2)}"/>`,
        ) +
        eachDot(
          (d) => `<circle cx="${d.x}" cy="${(d.y + 2.5).toFixed(1)}" r="${(d.r * 0.95).toFixed(2)}" fill="#ffd84a" opacity="${(d.op * 0.7).toFixed(2)}"/>`,
        );
      break;

    case "rgb-shift":
      // Glitch — R / G / B channels offset horizontally.
      body =
        eachDot(
          (d) => `<circle cx="${(d.x - 4).toFixed(1)}" cy="${d.y}" r="${d.r}" fill="#ff3c94" opacity="${(d.op * 0.75).toFixed(2)}"/>`,
        ) +
        eachDot(
          (d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="#40ff80" opacity="${(d.op * 0.55).toFixed(2)}"/>`,
        ) +
        eachDot(
          (d) => `<circle cx="${(d.x + 4).toFixed(1)}" cy="${d.y}" r="${d.r}" fill="#40e0ff" opacity="${(d.op * 0.75).toFixed(2)}"/>`,
        );
      break;

    case "bloom":
      // Bloom — soft halo behind each dot.
      defs.push(`<filter id="og-bloom-${id}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3"/>
      </filter>`);
      body =
        `<g filter="url(#og-bloom-${id})">` +
        eachDot(
          (d) => `<circle cx="${d.x}" cy="${d.y}" r="${(d.r * 1.8).toFixed(2)}" fill="${dot}" opacity="${(d.op * 0.55).toFixed(2)}"/>`,
        ) +
        `</g>` +
        eachDot(
          (d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${dot}" opacity="${d.op}"/>`,
        );
      break;

    case "metal": {
      // Metal — vertical bright-to-dark gradient fill on every dot.
      defs.push(`<linearGradient id="og-metal-${id}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="55%" stop-color="${dot}"/>
        <stop offset="100%" stop-color="${accent}"/>
      </linearGradient>`);
      body = eachDot(
        (d) => `<circle cx="${d.x}" cy="${d.y}" r="${(d.r * 1.1).toFixed(2)}" fill="url(#og-metal-${id})" opacity="${d.op}"/>`,
      );
      break;
    }

    case "pencil": {
      // Pencil — short tilted strokes instead of round dots.
      const rand = rng32(0xdeadbeef);
      body = eachDot((d) => {
        const len = d.r * 2.6;
        const angle = (rand() - 0.5) * 0.8;
        const dx = Math.cos(angle) * len;
        const dy = Math.sin(angle) * len;
        return `<line x1="${(d.x - dx / 2).toFixed(2)}" y1="${(d.y - dy / 2).toFixed(2)}" x2="${(d.x + dx / 2).toFixed(2)}" y2="${(d.y + dy / 2).toFixed(2)}" stroke="${dot}" stroke-width="1.1" opacity="${(d.op * 0.85).toFixed(2)}"/>`;
      });
      break;
    }

    case "bands":
      // Aurora — vertical bands of dots in alternating colors.
      body = eachDot((d) => {
        // 0-1 along x within the globe area; modulate between dot and dot2.
        const t = ((d.x - (GLOBE_CX - GLOBE_R)) / (GLOBE_R * 2)) % 1;
        const band = Math.sin(t * Math.PI * 4) * 0.5 + 0.5;
        const color = band > 0.5 ? dot : dot2 ?? accent;
        return `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${color}" opacity="${d.op}"/>`;
      });
      break;

    case "crt": {
      body = eachDot(
        (d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${dot}" opacity="${d.op}"/>`,
      );
      // Horizontal scanlines across the globe area.
      defs.push(`<pattern id="og-scanlines-${id}" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect x="0" y="0" width="6" height="3" fill="rgba(0,0,0,0.55)"/>
      </pattern>`);
      overlay = `<circle cx="${GLOBE_CX}" cy="${GLOBE_CY}" r="${GLOBE_R}" fill="url(#og-scanlines-${id})" opacity="0.4"/>`;
      break;
    }

    case "badtv": {
      // Bad TV — slight chromatic split + horizontal jitter bands.
      body =
        eachDot(
          (d) => `<circle cx="${(d.x - 1.5).toFixed(1)}" cy="${d.y}" r="${d.r}" fill="#ff8c4a" opacity="${(d.op * 0.5).toFixed(2)}"/>`,
        ) +
        eachDot(
          (d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${dot}" opacity="${d.op}"/>`,
        ) +
        eachDot(
          (d) => `<circle cx="${(d.x + 1.5).toFixed(1)}" cy="${d.y}" r="${d.r}" fill="#5cc8ff" opacity="${(d.op * 0.5).toFixed(2)}"/>`,
        );
      // A few static-noise horizontal bands.
      const rand = rng32(0xbadbad11);
      let bands = "";
      for (let i = 0; i < 4; i++) {
        const by = GLOBE_CY - GLOBE_R + rand() * GLOBE_R * 2;
        const bh = 2 + rand() * 6;
        bands += `<rect x="${GLOBE_CX - GLOBE_R}" y="${by.toFixed(1)}" width="${GLOBE_R * 2}" height="${bh.toFixed(1)}" fill="#ffffff" opacity="0.08"/>`;
      }
      overlay = bands;
      break;
    }

    case "corrupt": {
      // Corrupt — base dots + random color-block bursts.
      body = eachDot(
        (d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${dot}" opacity="${d.op}"/>`,
      );
      const rand = rng32(0xc0debeef);
      const palette = [dot, dot2 ?? accent, "#ffffff"];
      let blocks = "";
      for (let i = 0; i < 22; i++) {
        const bx = GLOBE_CX - GLOBE_R + rand() * GLOBE_R * 2;
        const by = GLOBE_CY - GLOBE_R + rand() * GLOBE_R * 2;
        const bw = 4 + rand() * 24;
        const bh = 2 + rand() * 6;
        const c = palette[Math.floor(rand() * palette.length)];
        blocks += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${c}" opacity="${(0.5 + rand() * 0.4).toFixed(2)}"/>`;
      }
      overlay = blocks;
      break;
    }

    case "toon":
      // Toon — two-color stepped fill based on dot Y position
      // (cheap cel-shaded look).
      body = eachDot((d) => {
        const t = (d.y - (GLOBE_CY - GLOBE_R)) / (GLOBE_R * 2);
        const color = t < 0.5 ? dot : dot2 ?? accent;
        return `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${color}" opacity="${d.op}"/>`;
      });
      break;

    case "vapor": {
      // Vapor — vertical pink-to-cyan gradient fill on the globe.
      defs.push(`<linearGradient id="og-vapor-${id}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ff5cb3"/>
        <stop offset="50%" stop-color="${dot2 ?? accent}"/>
        <stop offset="100%" stop-color="${accent}"/>
      </linearGradient>`);
      body = eachDot(
        (d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="url(#og-vapor-${id})" opacity="${d.op}"/>`,
      );
      break;
    }

    default:
      body = eachDot(
        (d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${dot}" opacity="${d.op}"/>`,
      );
  }

  return { defs: defs.join(""), body, overlay };
};

// ----- Logo path (DottedGlobe horizontal-banded mark, source 915×523) -----
const WORDMARK_PATH =
  "M457.415 0C577.077 0 687.642 25.3348 769.933 68.4814C850.058 110.493 914.83 176.387 914.83 261.239C914.83 346.091 850.059 411.986 769.933 453.998C687.642 497.145 577.076 522.479 457.415 522.479C337.754 522.478 227.188 497.145 144.897 453.998C64.7716 411.986 0 346.091 0 261.239C4.95911e-05 176.387 64.7719 110.493 144.897 68.4814C227.188 25.3348 337.753 2.28882e-05 457.415 0ZM457.415 30C341.604 30 236.013 54.5808 158.828 95.0508C82.3501 135.15 30 193.157 30 261.239C30 329.321 82.35 387.329 158.828 427.429C236.013 467.899 341.604 492.478 457.415 492.479C573.226 492.479 678.817 467.899 756.002 427.429C832.48 387.329 884.83 329.321 884.83 261.239C884.83 193.157 832.48 135.15 756.002 95.0508C678.817 54.5808 573.226 30 457.415 30ZM447.762 379.399C448.207 385.1 448.416 390.819 448.416 396.496V462.225C393.093 459.109 343.637 427.435 312.534 379.399H447.762ZM602.297 379.399C573.461 423.933 528.851 454.403 478.416 461.092V396.495C478.416 390.818 478.626 385.099 479.071 379.399H602.297ZM277.807 379.399C290.681 403.351 307.364 424.569 326.986 441.969C296.377 431.761 268.782 418.103 245.271 401.813C235.114 394.776 225.762 387.283 217.272 379.399H277.807ZM697.559 379.399C689.069 387.283 679.717 394.776 669.56 401.813C646.049 418.103 618.453 431.761 587.842 441.969C607.465 424.569 624.149 403.351 637.024 379.399H697.559ZM175.928 379.399C189.539 395.616 205.789 410.449 224.119 423.605C205.747 416.765 188.567 409.148 172.759 400.859C159.8 394.065 147.882 386.891 137.044 379.399H175.928ZM777.786 379.399C766.948 386.891 755.03 394.065 742.071 400.859C726.264 409.148 709.083 416.764 690.712 423.604C709.042 410.448 725.293 395.616 738.903 379.399H777.786ZM130.606 271.081C132.238 298.946 140.758 325.294 154.762 349.399H102.487V350.88C77.6296 325.983 63.2504 298.815 60.4912 271.081H130.606ZM854.339 271.081C851.58 298.814 837.201 325.982 812.344 350.879V349.399H760.069C774.073 325.294 782.593 298.946 784.225 271.081H854.339ZM248.657 271.081C249.707 298.614 255.138 325.02 264.234 349.399H190.517C173.029 325.271 162.667 298.726 160.673 271.081H248.657ZM334.331 271.081C354.515 271.081 375.013 273.327 392.854 282.765C395.181 283.995 397.477 285.281 399.739 286.62C423.013 300.39 436.294 323.473 442.929 349.399H296.469C286.157 325.652 279.875 299.2 278.681 271.081H334.331ZM636.15 271.081C634.956 299.2 628.673 325.652 618.361 349.399H483.903C490.538 323.47 503.821 300.385 527.098 286.615C529.358 285.278 531.651 283.994 533.975 282.765C551.816 273.328 572.314 271.081 592.497 271.081H636.15ZM754.158 271.081C752.164 298.726 741.802 325.271 724.314 349.399H650.597C659.693 325.02 665.124 298.614 666.174 271.081H754.158ZM161.177 162.763C145.3 186.682 134.92 213.045 131.53 241.081H62.0566C67.6616 213.644 84.6358 186.976 111.855 162.763H161.177ZM268.353 162.763C258.051 186.955 251.434 213.376 249.259 241.081H161.811C165.958 213.195 178.644 186.623 198.55 162.763H268.353ZM443.129 162.763C436.563 189.009 423.25 212.422 399.741 226.332C398.682 226.959 397.615 227.574 396.542 228.177C378.028 238.58 356.428 241.081 335.191 241.081H279.352C281.843 212.721 289.534 186.243 301.286 162.763H443.129ZM613.544 162.763C625.296 186.243 632.988 212.721 635.479 241.081H591.638C570.401 241.081 548.801 238.58 530.287 228.177C529.216 227.575 528.152 226.962 527.096 226.337C503.584 212.427 490.268 189.012 483.702 162.763H613.544ZM716.281 162.763C736.187 186.623 748.873 213.195 753.021 241.081H665.572C663.397 213.376 656.781 186.955 646.479 162.763H716.281ZM802.975 162.763C830.194 186.976 847.169 213.644 852.773 241.081H783.301C779.911 213.045 769.531 186.682 753.654 162.763H802.975ZM224.114 98.876C209.747 109.189 196.658 120.531 185.115 132.763H152.99C159.282 128.948 165.874 125.23 172.759 121.62C188.565 113.332 205.744 105.717 224.114 98.876ZM326.986 80.5088C310.229 95.3673 295.617 113.011 283.688 132.763H229.15C234.271 128.598 239.648 124.562 245.271 120.665C268.782 104.376 296.376 90.7163 326.986 80.5088ZM448.416 116.456C448.416 121.871 448.227 127.324 447.823 132.763H319.678C350.932 90.5437 397.157 63.1396 448.416 60.2529V116.456ZM478.416 61.3857C524.855 67.5446 566.357 93.8659 595.152 132.763H479.009C478.605 127.325 478.416 121.872 478.416 116.457V61.3857ZM587.842 80.5088C618.453 90.7164 646.049 104.375 669.56 120.665C675.183 124.562 680.56 128.598 685.681 132.763H631.143C619.214 113.01 604.599 95.3675 587.842 80.5088ZM690.717 98.876C709.086 105.716 726.265 113.332 742.071 121.62C748.957 125.23 755.548 128.948 761.84 132.763H729.716C718.173 120.531 705.084 109.189 690.717 98.876Z";

// Pixelarticons (MIT)
const DOWNLOAD_ICON = `<g fill="currentColor"><path d="M14 9V3h-4v6H6l6 8 6-8h-4z"/><path d="M5 19h14v2H5z"/></g>`;
const KEYBOARD_ICON = `<g fill="currentColor"><path d="M2 4h20v2H2zM2 6h2v12H2zM20 6h2v12h-2zM2 18h20v2H2zM6 8h2v2H6zM10 8h2v2h-2zM14 8h2v2h-2zM18 8h2v2h-2zM6 12h2v2H6zM10 12h2v2h-2zM14 12h2v2h-2zM18 12h2v2h-2zM8 16h8v-2H8z"/></g>`;

// Headline copy. The default card uses the product positioning;
// per-preset cards use the preset's own name + blurb.
// Headline copy is the single most-shared surface of the product —
// every Twitter / Slack / Discord preview lands on this card. So it
// has to feel like the product, not describe it. The old "dotted
// maps. animated globes. designer-first." literally names the medium
// twice; designers respond to a confident verb + the aesthetic
// references they actually use in conversation.
const DEFAULT_HEADLINES = [
  { text: "Render the world.", color: "#f6f2ea" },
  { text: "Halftone. Risograph.", color: "#f6f2ea" },
  { text: "Cartography, restyled.", color: "#8ddfff" },
];

const renderCard = ({ headlines, palette, url, presetId = "default" }) => {
  const { defs: paintDefs, body: dotsMarkup, overlay } = buildGlobePaint({
    id: presetId,
    style: palette.style ?? "circle",
    dot: palette.dot,
    dot2: palette.dot2,
    accent: palette.accent,
  });

  const headlinesMarkup = headlines
    .map((line, i) => {
      const y = 280 + i * 52;
      return `<text x="72" y="${y}" font-family="'Press Start 2P', ui-monospace, Menlo, monospace" font-size="34" fill="${line.color}" letter-spacing="-1">${line.text}</text>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <style>
      @font-face {
        font-family: "Press Start 2P";
        src: url(data:font/ttf;base64,${fontBase64}) format("truetype");
      }
    </style>
    <radialGradient id="bg" cx="55%" cy="50%" r="80%">
      <stop offset="0%" stop-color="#0e0e1a"/>
      <stop offset="60%" stop-color="#06060d"/>
      <stop offset="100%" stop-color="#020205"/>
    </radialGradient>
    <radialGradient id="nebula" cx="18%" cy="22%" r="55%">
      <stop offset="0%" stop-color="#1a1144" stop-opacity="0.30"/>
      <stop offset="55%" stop-color="#0a0820" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="atm" cx="50%" cy="50%" r="50%">
      <stop offset="62%" stop-color="${palette.accent}" stop-opacity="0"/>
      <stop offset="80%" stop-color="${palette.accent}" stop-opacity="0.13"/>
      <stop offset="94%" stop-color="${palette.accent}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0"/>
    </radialGradient>
    <!-- Per-style defs (preset-specific gradients, filters, patterns) -->
    ${paintDefs}
    <!-- Clip the per-style overlay (scanlines / glitch bands) to the
         globe disc so it doesn't bleed onto the wordmark column. -->
    <clipPath id="og-globe-clip">
      <circle cx="${GLOBE_CX}" cy="${GLOBE_CY}" r="${GLOBE_R}"/>
    </clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#nebula)"/>

  <g fill="#dceaff">
    <circle cx="80" cy="80" r="0.9" opacity="0.55"/>
    <circle cx="158" cy="48" r="0.7" opacity="0.42"/>
    <circle cx="220" cy="120" r="1.0" opacity="0.62"/>
    <circle cx="100" cy="220" r="0.8" opacity="0.48"/>
    <circle cx="280" cy="280" r="0.6" opacity="0.38"/>
    <circle cx="60" cy="380" r="1.1" opacity="0.66"/>
    <circle cx="200" cy="460" r="0.7" opacity="0.45"/>
    <circle cx="380" cy="120" r="0.8" opacity="0.50"/>
    <circle cx="460" cy="60" r="1.0" opacity="0.60"/>
    <circle cx="540" cy="180" r="0.6" opacity="0.40"/>
  </g>

  <g transform="translate(160 220)" opacity="0.55">
    <rect x="-22" y="-0.6" width="44" height="1.2" fill="#dceaff"/>
    <rect x="-0.6" y="-22" width="1.2" height="44" fill="#dceaff"/>
    <circle cx="0" cy="0" r="2.4" fill="#dceaff"/>
  </g>

  <circle cx="${GLOBE_CX}" cy="${GLOBE_CY}" r="${GLOBE_R + 36}" fill="url(#atm)"/>
  <circle cx="${GLOBE_CX}" cy="${GLOBE_CY}" r="${GLOBE_R}" fill="#0a0a14"/>

  <g clip-path="url(#og-globe-clip)">${dotsMarkup}${overlay}</g>

  <g transform="translate(72 60) scale(0.22)" fill="#f6f2ea">
    <path d="${WORDMARK_PATH}"/>
  </g>

  ${headlinesMarkup}

  <g transform="translate(72 480)" font-family="'Press Start 2P', ui-monospace, Menlo, monospace" font-size="12" fill="#a8a39b">
    <g transform="translate(0 0)">
      <svg x="0" y="-12" width="16" height="16" viewBox="0 0 24 24" color="#a8a39b">${DOWNLOAD_ICON}</svg>
      <text x="24" y="0">PNG / SVG / WebM</text>
    </g>
    <g transform="translate(280 0)">
      <svg x="0" y="-12" width="16" height="16" viewBox="0 0 24 24" color="#a8a39b">${KEYBOARD_ICON}</svg>
      <text x="24" y="0">19 presets</text>
    </g>
  </g>

  <text x="72" y="555" font-family="'Press Start 2P', ui-monospace, Menlo, monospace" font-size="14" fill="${palette.accent}" letter-spacing="-1">${url}</text>
</svg>`;
};

// Wrap a long blurb across two lines if needed; pixel font is wide so
// anything over ~22 chars overflows the column at fontSize 22.
const splitBlurb = (text, maxLen = 22) => {
  if (text.length <= maxLen) return [text];
  // Break at last space before maxLen.
  const breakAt = text.lastIndexOf(" ", maxLen);
  if (breakAt <= 0) return [text];
  return [text.slice(0, breakAt), text.slice(breakAt + 1)];
};

// ----- Render the default headline card -----
{
  const svg = renderCard({
    headlines: DEFAULT_HEADLINES,
    palette: PRESET_PALETTES.default,
    url: "globestudio.app",
    presetId: "default",
  });
  writeFileSync(resolve(projectRoot, "public/og.svg"), svg);
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    font: { loadSystemFonts: true },
  })
    .render()
    .asPng();
  writeFileSync(resolve(outputDir, "default.png"), png);
  console.log(`default → ${png.length} bytes`);
}

// ----- Render every per-preset card -----
for (const preset of lookPresets) {
  // Skip "default" — its filename clashes with the homepage headline
  // card (index.html's og:image points at /og/default.png, and that
  // should stay the product-positioning card, not a generic "Default"
  // preset card).
  if (preset.id === "default") continue;
  const palette = paletteFor(preset.id);
  // Headline: preset name on top (cream), then 1-2 lines of blurb in
  // accent color. The pixel font is wide, so we soft-wrap long blurbs.
  const blurbLines = splitBlurb(preset.blurb);
  const headlines = [
    { text: preset.name, color: "#f6f2ea" },
    ...blurbLines.map((text) => ({ text, color: palette.accent })),
  ];
  const svg = renderCard({
    headlines,
    palette,
    url: `globestudio.app/looks/${preset.id}`,
    presetId: preset.id,
  });
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    font: { loadSystemFonts: true },
  })
    .render()
    .asPng();
  writeFileSync(resolve(outputDir, `${preset.id}.png`), png);
  console.log(`${preset.id} → ${png.length} bytes`);
}

console.log(`Done. ${lookPresets.length + 1} OG cards written to public/og/.`);
