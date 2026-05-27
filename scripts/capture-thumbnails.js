#!/usr/bin/env node
// Captures a small square thumbnail of each preset's REAL canvas
// output. Drives two surfaces inside the app:
//   - The looks-chip preview at the top of the panel (replaces the
//     generic dotted-globe SVG with the actual shader output).
//   - The Cmd+K command palette row for preset apply actions.
//
// Unlike the OG capture, no overlay chrome is added — the file is
// just the canvas. 512×512 keeps file sizes around 30-80 KB per
// preset and stays crisp at 2x retina up to ~256-px displays.
//
// Requires: the dev server running on http://localhost:4321.
//
// Run:
//   node scripts/capture-thumbnails.js              (all presets)
//   node scripts/capture-thumbnails.js halftone aurora  (subset)

import { chromium } from "playwright";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { lookPresets } from "../src/data/look-presets.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const outputDir = resolve(projectRoot, "public/looks");
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

const SIZE = 512;
const DEV = process.env.DEV_URL || "http://localhost:4321";
const argFilter = process.argv.slice(2);

// Center the globe inside the square thumbnail. Earlier we tried the
// OG "bottom-right spill" composition here so the thumbnail matched
// the press-kit OG card, but at small consumer sizes (44 px in the
// docs preset cards, 28 px in the Cmd+K palette, ~36 px in the looks
// chips) the off-center crop reads as a misaligned image rather than
// an intentional composition. Centered is the correct general-purpose
// thumbnail; the bottom-right framing still lives in capture-og-canvas.js
// for the press-kit OG cards.
//
// Viewport 880 puts the globe radius at ~352 in capture coords, so a
// 512×512 crop centered on (440, 440) sits the globe diameter at ~82%
// of the tile width — leaves a clear ring of background visible all
// around so the silhouette reads even at tiny display sizes.
const CAPTURE = 880;
const GLOBE_X = 440;
const GLOBE_Y = 440;
const CROP_X = Math.round(GLOBE_X - SIZE / 2);
const CROP_Y = Math.round(GLOBE_Y - SIZE / 2);

const main = async () => {
  console.log(`Launching chromium…`);
  const browser = await chromium.launch({
    args: [
      "--use-gl=swiftshader",
      "--use-angle=swiftshader",
      "--ignore-gpu-blocklist",
      "--enable-webgl",
      "--enable-accelerated-2d-canvas",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: CAPTURE, height: CAPTURE },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const presets = lookPresets.filter(
    (p) => argFilter.length === 0 || argFilter.includes(p.id),
  );

  for (const preset of presets) {
    const url = `${DEV}/embed?look=${preset.id}`;
    console.log(`→ ${preset.id}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector("canvas", { timeout: 20000 });
    // Hide dev/UX HUDs that would land in the screenshot.
    await page.addStyleTag({
      content: `
        .perf-monitor, .keyboard-hint, .onboarding-hint { display: none !important; }
      `,
    });
    // Three.js needs render frames + map data + shader warmup.
    await page.waitForTimeout(4000);

    const png = await page.screenshot({
      type: "png",
      clip: { x: CROP_X, y: CROP_Y, width: SIZE, height: SIZE },
    });
    const outPath = resolve(outputDir, `${preset.id}.png`);
    writeFileSync(outPath, png);
    console.log(`  wrote ${outPath} (${png.length} bytes)`);
  }

  await browser.close();
  console.log(`Done. ${presets.length} thumbnails captured.`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
