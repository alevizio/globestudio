#!/usr/bin/env node
// Animated OG card → public/og/default.gif
//
// Renders N frames of the homepage headline card with the dotted globe
// rotated a full 360° (seamless loop), then ffmpeg assembles the GIF.
// Reuses public/og.svg (written by generate-og-default.js) as the card
// chrome and only swaps the globe's dot layer per frame, so the wordmark,
// headline, stars, and URL stay identical to the static card — meaning the
// GIF's first frame matches /og/default.png for platforms that show og:image
// statically (Twitter/X, LinkedIn, Facebook, iMessage). Animates on
// Discord/Telegram et al.
//
// Run:  node scripts/generate-og-animated.js   (then the ffmpeg step)
//   or: npm run og:animate

import { writeFileSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { feature as topoFeature } from "topojson-client";
import { geoContains } from "d3-geo";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const framesDir = "/tmp/og-frames";
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

// World coastlines (same source + Antarctica drop as the static generator).
const topo = (
  await import(resolve(root, "node_modules/world-atlas/countries-50m.json"), {
    with: { type: "json" },
  })
).default;
const world = topoFeature(topo, topo.objects.countries);
world.features = world.features.filter((f) => String(parseInt(f.id, 10)) !== "10");

// Same canvas + globe geometry as generate-og-default.js.
const W = 1200, CX = 1080, CY = 540, R = 520, PITCH = (18 * Math.PI) / 180;

// Precompute the land points ONCE — geoContains (the expensive part) is
// yaw-independent; only the rotation/projection changes per frame.
const land = [];
for (let lat = -56; lat <= 78; lat += 2) {
  const cl = Math.cos((lat * Math.PI) / 180);
  if (cl < 0.05) continue;
  for (let lng = -180; lng <= 180; lng += 2 / Math.max(0.18, cl)) {
    if (!geoContains(world, [lng, lat])) continue;
    const a = (lat * Math.PI) / 180, b = (lng * Math.PI) / 180;
    land.push([Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)]);
  }
}

// Dot layer for a given yaw (rotation about the vertical axis = the spin).
const dotsAt = (yaw) => {
  const out = [];
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(PITCH), sp = Math.sin(PITCH);
  for (const [x0, y0, z0] of land) {
    let x = x0 * cyw + z0 * syw, z = -x0 * syw + z0 * cyw, y = y0;
    const y3 = y * cp - z * sp, z3 = y * sp + z * cp;
    y = y3; z = z3;
    if (z < 0.04) continue;
    const sx = CX + x * R, sy = CY - y * R;
    if (sx < -10 || sx > W + 10 || sy < -10 || sy > 640) continue;
    out.push(
      `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(2.0 + z * 2.8).toFixed(2)}" fill="#f6f2ea" opacity="${(0.32 + z * 0.55).toFixed(2)}"/>`,
    );
  }
  return out.join("");
};

// Card chrome from the static SVG; we only replace the clipped dot group.
const base = readFileSync(resolve(root, "public/og.svg"), "utf8");
const DOTS_RE = /(<g clip-path="url\(#og-globe-clip\)">)[\s\S]*?(<\/g>)/;

const N = 48;                       // frames in one full revolution
const baseYaw = (-20 * Math.PI) / 180; // frame 0 == the static card's yaw

for (let f = 0; f < N; f++) {
  const yaw = baseYaw + (f / N) * 2 * Math.PI;
  const svg = base.replace(DOTS_RE, `$1${dotsAt(yaw)}$2`);
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    font: { loadSystemFonts: true },
  })
    .render()
    .asPng();
  writeFileSync(resolve(framesDir, `f${String(f).padStart(3, "0")}.png`), png);
}
console.log(`Rendered ${N} frames; assembling GIF…`);

// Assemble a high-quality looping GIF: a per-clip diff palette + dithering
// keeps the dark space gradient from posterizing, and diff_mode=rectangle
// only re-encodes the changing globe region (keeps it ~2 MB).
const gifPath = resolve(root, "public/og/default.gif");
execFileSync(
  "ffmpeg",
  [
    "-y", "-framerate", "16", "-i", `${framesDir}/f%03d.png`,
    "-vf",
    "split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle",
    "-loop", "0", gifPath,
  ],
  { stdio: "ignore" },
);
console.log(`Wrote ${gifPath}`);
