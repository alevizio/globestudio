#!/usr/bin/env node
// Build-time generator for per-preset Open Graph share cards. Produces a
// 1200x630 PNG per preset, written to public/og/{presetId}.png. Each card
// has the preset name, blurb, the Globestudio wordmark, and a subtle pattern
// that hints at the preset's aesthetic.
//
// Why: every time someone shares /looks/halftone (or any preset URL) on
// Twitter, Slack, Discord, iMessage, LinkedIn, etc., the platform fetches
// the og:image meta. With this in place, every share-preview becomes a
// real piece of marketing instead of a tiny chip-preview fallback.
//
// Re-run when preset names / blurbs change:
//   npm run og:generate
//
// Runtime uses satori (JSX → SVG) + @resvg/resvg-js (SVG → PNG). Both are
// dev-only deps; the generated PNGs are static assets in public/og/.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { lookPresets } from "../src/data/look-presets.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const fontCacheDir = resolve(projectRoot, "scripts/.cache");
const outputDir = resolve(projectRoot, "public/og");

if (!existsSync(fontCacheDir)) mkdirSync(fontCacheDir, { recursive: true });
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

// Inter (open-source, used by ~everyone) — fetched once, cached to disk.
// We only need the bold cut for the headline + the regular for body text.
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

// Map each preset to a representative palette. Drives the accent color
// + a few decorative dots in the background. Each entry is a pair of
// hex colors that read on the dark #0a0a0a base.
const PRESET_PALETTES = {
  default: ["#f6f2ea", "#a8a39b"],
  halftone: ["#f6f2ea", "#6a655c"],
  risograph: ["#ff5c9a", "#406bf5"],
  newsprint: ["#3ec5e8", "#e83e9a"],
  aurora: ["#2ef098", "#52d8ff"],
  pixel: ["#f6f2ea", "#888"],
  bayer: ["#ffffff", "#444"],
  atkinson: ["#ffffff", "#666"],
  wireframe: ["#a8e5f5", "#6cb6ff"],
  crt: ["#7fffd4", "#3ec5e8"],
  glitch: ["#ff3c94", "#40e0ff"],
  badtv: ["#cda47c", "#5b5b5b"],
  bloom: ["#fff2a3", "#ff9a3c"],
  metal: ["#cfd6e0", "#7a8290"],
  pencil: ["#d9d3c0", "#7a7368"],
  iridescent: ["#c8b8ff", "#7ce8e0"],
  corrupt: ["#ff007f", "#00ff7f"],
};

const cardJSX = (preset) => {
  const palette = PRESET_PALETTES[preset.id] || PRESET_PALETTES.default;
  const [accent, accentSoft] = palette;
  // Dot pattern in the background — 6 rows × 14 columns of accent-colored
  // dots, fading toward the bottom. Gives each card the dotted-globe
  // brand signal without literally rendering the canvas.
  const dots = [];
  const cols = 14;
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const opacity = 0.18 + (r / rows) * 0.32;
      dots.push({
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: `${80 + r * 70}px`,
            left: `${720 + c * 32}px`,
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: accentSoft,
            opacity,
          },
        },
      });
    }
  }

  return {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px",
        background: "linear-gradient(135deg, #0a0a0a 0%, #14141a 100%)",
        color: "#f6f2ea",
        fontFamily: "Inter",
        position: "relative",
        overflow: "hidden",
      },
      children: [
        // Decorative dot grid
        ...dots,
        // Accent bar — vertical strip on the left
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "6px",
              background: accent,
            },
          },
        },
        // Top row — Globestudio wordmark
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "16px",
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#f6f2ea",
            },
            children: [
              // Tiny globe icon — a stylized circle with dots
              {
                type: "div",
                props: {
                  style: {
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: accent,
                    display: "flex",
                  },
                },
              },
              "globestudio",
            ],
          },
        },
        // Center — preset name + blurb
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              maxWidth: "720px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "104px",
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    color: "#f6f2ea",
                  },
                  children: preset.name,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "32px",
                    fontWeight: 400,
                    color: accent,
                    lineHeight: 1.3,
                  },
                  children: preset.blurb,
                },
              },
            ],
          },
        },
        // Bottom row — URL + dotted-globe descriptor
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "20px",
              color: "#8d887e",
              fontWeight: 500,
            },
            children: [
              {
                type: "div",
                props: { children: "Dotted maps + animated 3D globes" },
              },
              {
                type: "div",
                props: {
                  style: { color: "#f6f2ea" },
                  children: `globestudio.app/looks/${preset.id}`,
                },
              },
            ],
          },
        },
      ],
    },
  };
};

const main = async () => {
  // Inter from rsms/inter — open-source font with broad coverage. Tarball
  // weight is small. Cached locally so we only download once per dev box.
  const [interBold, interRegular] = await Promise.all([
    fetchFont(
      "Inter-Bold.ttf",
      "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf",
    ),
    fetchFont(
      "Inter-Regular.ttf",
      "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf",
    ),
  ]);

  const fonts = [
    { name: "Inter", data: interBold, weight: 700, style: "normal" },
    { name: "Inter", data: interRegular, weight: 400, style: "normal" },
  ];

  let count = 0;
  for (const preset of lookPresets) {
    const svg = await satori(cardJSX(preset), {
      width: 1200,
      height: 630,
      fonts,
    });
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
    const png = resvg.render().asPng();
    const outputPath = resolve(outputDir, `${preset.id}.png`);
    writeFileSync(outputPath, png);
    console.log(`✓ ${preset.id}.png (${Math.round(png.length / 1024)} KB)`);
    count++;
  }

  console.log(`\n✓ Generated ${count} OG cards → public/og/`);
};

main().catch((error) => {
  console.error("OG generation failed:", error);
  process.exit(1);
});
