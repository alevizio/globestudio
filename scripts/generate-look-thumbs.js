#!/usr/bin/env node
// Downsamples each look's 512×512 canvas capture (public/looks/<id>.png,
// written by scripts/capture-thumbnails.js) into the small thumbnails the
// 28 px chips actually display: public/looks/thumbs/<id>@2x.webp (56 px)
// and <id>@3x.webp (84 px).
//
// Why this exists: the chips used to draw the 512 px PNG at 28 px with
// image-rendering: pixelated, i.e. nearest-neighbour picking one source
// pixel out of every ~18. On dot and halftone patterns that aliases into
// noise, and every chip cost a 40-340 KB download. Resampling offline with
// a proper filter gives smooth previews at ~1 % of the bytes.
//
// Filter: Lanczos. swscale's "area" flag leaves a checkerboard moiré on
// the halftone grid at this ratio; Lanczos low-passes it cleanly.
// Light: the resize runs in linear light (zscale decodes sRGB first and
// re-encodes after). Averaging sRGB values instead darkens fine bright
// detail on black: Bayer and Atkinson kept under a third of their light
// and read as blank discs. Linear light keeps each thumb's mean brightness
// within a few percent of its source, and the #0b0b0c canvas round-trips
// exactly.
// Encoding: lossless WebP. Lossy WebP is always 4:2:0, which washes the
// Risograph pink/cyan misregistration out to grey at this size; lossless
// keeps every resampled pixel and still lands at 2-12 KB per file.
//
// Requires an ffmpeg built with libzimg for the zscale filter (most packaged
// builds are) on PATH, or FFMPEG=/path/to/ffmpeg. Commit the output:
// the thumbs are static assets served from public/.
//
// Run:
//   npm run thumbs:generate              (all presets)
//   npm run thumbs:generate -- halftone  (subset)

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { lookPresets } from "../src/data/look-presets.js";
import { LOOK_THUMB_WIDTHS } from "../src/utils/look-thumbs.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const sourceDir = resolve(projectRoot, "public/looks");
const outputDir = resolve(sourceDir, "thumbs");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
// The captures are untagged full-range sRGB; say so, or zscale guesses.
const RGB_FULL = "pin=bt709:p=bt709:min=gbr:m=gbr:rin=full:r=full";
const argFilter = process.argv.slice(2);

const presets = argFilter.length
  ? lookPresets.filter((preset) => argFilter.includes(preset.id))
  : lookPresets;

if (presets.length === 0) {
  console.error(`No presets match: ${argFilter.join(", ")}`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

let failed = 0;
for (const preset of presets) {
  const source = resolve(sourceDir, `${preset.id}.png`);
  if (!existsSync(source)) {
    console.error(`  ✗ ${preset.id}: missing ${source}`);
    failed += 1;
    continue;
  }
  for (const [density, width] of Object.entries(LOOK_THUMB_WIDTHS)) {
    const output = resolve(outputDir, `${preset.id}@${density}.webp`);
    const result = spawnSync(
      FFMPEG,
      [
        "-v", "error",
        "-y",
        "-i", source,
        "-vf", [
          `zscale=tin=iec61966-2-1:t=linear:${RGB_FULL}`,
          "format=gbrpf32le",
          `zscale=w=${width}:h=${width}:f=lanczos`,
          `zscale=tin=linear:t=iec61966-2-1:${RGB_FULL}`,
          "format=gbrp",
        ].join(","),
        "-c:v", "libwebp",
        "-lossless", "1",
        "-compression_level", "6",
        "-map_metadata", "-1",
        "-fflags", "+bitexact",
        output,
      ],
      { encoding: "utf8" },
    );
    if (result.error || result.status !== 0) {
      console.error(`  ✗ ${preset.id}@${density}: ${result.error?.message ?? result.stderr.trim()}`);
      failed += 1;
      continue;
    }
    console.log(`  ✓ looks/thumbs/${preset.id}@${density}.webp (${width}px)`);
  }
}

if (failed > 0) process.exit(1);
