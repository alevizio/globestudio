#!/usr/bin/env node
// Captures REAL canvas screenshots — one per preset — by launching a
// headless chromium with WebGL enabled, navigating to /embed?look=<id>,
// and snapping the rendered output. Then composites our chrome
// (DottedGlobe wordmark, pixel-font headline, icon chips, URL) over
// each capture and writes to public/og/<id>.png.
//
// Why this exists: the SVG-based generator approximates each shader
// with CSS-style tricks (offset dots for risograph, gradient fills
// for iridescent, scanlines for CRT…). Designers can spot the gap.
// This script captures the actual shader output instead.
//
// Requires: the dev server running on http://localhost:4321.
//
// Run:
//   node scripts/capture-og-canvas.js
//
// Or to regenerate just one preset:
//   node scripts/capture-og-canvas.js halftone

import { chromium } from "playwright";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { lookPresets } from "../src/data/look-presets.js";
import { buildShareUrl } from "../src/utils/share-config.js";

// The teaser hero globe — mirrors TEASER_GLOBE in src/components/teaser-page.jsx
// (CRT phosphor + ASCII block dots + network arcs), but rendered on its solid
// dark background (transparent:false) so the OG card reads as a dark scene like
// the preset cards instead of compositing over nothing.
const TEASER_GLOBE = {
  selection: "world",
  transparent: false,
  background: "#020a10",
  density: 70,
  dotSize: 14,
  dotColor: "#ffffff",
  shape: "ASCII",
  asciiSymbol: "█",
  renderMode: "dots",
  worldFill: "#5a5a64",
  worldStroke: "#f6f2ea",
  shaderSettings: { intensity: 65, split: 8, grain: 10, scanlines: 78, cellSize: 9, threshold: 50, warp: 30, motion: 30, effect: "crt" },
  globeSettings: { autoSpin: true, autoSpinSpeed: 35, dotLift: 15, glow: true, glowStrength: 65, glowSpread: 50, grid: true, gridColor: "#ffffff", gridSize: 30, gridStrength: 45, network: true, networkStrength: 70, networkArcs: 60, networkPulses: 50, networkMono: true, routes: true, routesStrength: 82, surface: true, surfaceStrength: 30, surfaceColor: "#18191d" },
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const outputDir = resolve(projectRoot, "public/og");
const fontCacheDir = resolve(projectRoot, "scripts/.cache");
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

const W = 1200;
const H = 630;
const DEV = process.env.DEV_URL || "http://localhost:4321";
// Subset filter via CLI arg(s): `node script.js halftone aurora` etc.
const argFilter = process.argv.slice(2);

// Render the canvas at a square viewport larger than the OG card so
// we have room to:
//   1. position the globe BIGGER than it would be inside a 1200×630
//      viewport (more visible detail of the shader output), and
//   2. slide our crop window so the globe lands cropped at the
//      bottom-left corner of the final OG card — its upper-right arc
//      dominates the right two-thirds of the card, the wordmark +
//      headlines sit on the left, and the bottom-left of the globe
//      runs off-canvas.
// 2000×2000 viewport → canvas auto-fits to the smaller dimension,
// giving a ~800-px-radius globe centered at (1000, 1000).
const CAPTURE_W = 2000;
const CAPTURE_H = 2000;
// Crop window (1200×630) starts at (CROP_X, CROP_Y) of the capture.
// Picked so globe-center in the OG = (1000−50, 1000−500) = (950, 500)
// → globe radius ~800 → bottom-RIGHT arc spills off the card at
// (1750, 1300). Visible portion is the top-left arc, so the wordmark
// + headline column on the left of the OG sits cleanly over the
// darker limb of the sphere with the dark-vignette overlay providing
// extra contrast.
const CROP_X = 50;
const CROP_Y = 500;

// Pixel font for the chrome overlay (same as the SVG generator).
const fontBuffer = readFileSync(
  resolve(fontCacheDir, "PressStart2P-Regular.ttf"),
);
const fontBase64 = fontBuffer.toString("base64");

const WORDMARK_PATH =
  "M457.415 0C577.077 0 687.642 25.3348 769.933 68.4814C850.058 110.493 914.83 176.387 914.83 261.239C914.83 346.091 850.059 411.986 769.933 453.998C687.642 497.145 577.076 522.479 457.415 522.479C337.754 522.478 227.188 497.145 144.897 453.998C64.7716 411.986 0 346.091 0 261.239C4.95911e-05 176.387 64.7719 110.493 144.897 68.4814C227.188 25.3348 337.753 2.28882e-05 457.415 0ZM457.415 30C341.604 30 236.013 54.5808 158.828 95.0508C82.3501 135.15 30 193.157 30 261.239C30 329.321 82.35 387.329 158.828 427.429C236.013 467.899 341.604 492.478 457.415 492.479C573.226 492.479 678.817 467.899 756.002 427.429C832.48 387.329 884.83 329.321 884.83 261.239C884.83 193.157 832.48 135.15 756.002 95.0508C678.817 54.5808 573.226 30 457.415 30ZM447.762 379.399C448.207 385.1 448.416 390.819 448.416 396.496V462.225C393.093 459.109 343.637 427.435 312.534 379.399H447.762ZM602.297 379.399C573.461 423.933 528.851 454.403 478.416 461.092V396.495C478.416 390.818 478.626 385.099 479.071 379.399H602.297ZM277.807 379.399C290.681 403.351 307.364 424.569 326.986 441.969C296.377 431.761 268.782 418.103 245.271 401.813C235.114 394.776 225.762 387.283 217.272 379.399H277.807ZM697.559 379.399C689.069 387.283 679.717 394.776 669.56 401.813C646.049 418.103 618.453 431.761 587.842 441.969C607.465 424.569 624.149 403.351 637.024 379.399H697.559ZM175.928 379.399C189.539 395.616 205.789 410.449 224.119 423.605C205.747 416.765 188.567 409.148 172.759 400.859C159.8 394.065 147.882 386.891 137.044 379.399H175.928ZM777.786 379.399C766.948 386.891 755.03 394.065 742.071 400.859C726.264 409.148 709.083 416.764 690.712 423.604C709.042 410.448 725.293 395.616 738.903 379.399H777.786ZM130.606 271.081C132.238 298.946 140.758 325.294 154.762 349.399H102.487V350.88C77.6296 325.983 63.2504 298.815 60.4912 271.081H130.606ZM854.339 271.081C851.58 298.814 837.201 325.982 812.344 350.879V349.399H760.069C774.073 325.294 782.593 298.946 784.225 271.081H854.339ZM248.657 271.081C249.707 298.614 255.138 325.02 264.234 349.399H190.517C173.029 325.271 162.667 298.726 160.673 271.081H248.657ZM334.331 271.081C354.515 271.081 375.013 273.327 392.854 282.765C395.181 283.995 397.477 285.281 399.739 286.62C423.013 300.39 436.294 323.473 442.929 349.399H296.469C286.157 325.652 279.875 299.2 278.681 271.081H334.331ZM636.15 271.081C634.956 299.2 628.673 325.652 618.361 349.399H483.903C490.538 323.47 503.821 300.385 527.098 286.615C529.358 285.278 531.651 283.994 533.975 282.765C551.816 273.328 572.314 271.081 592.497 271.081H636.15ZM754.158 271.081C752.164 298.726 741.802 325.271 724.314 349.399H650.597C659.693 325.02 665.124 298.614 666.174 271.081H754.158ZM161.177 162.763C145.3 186.682 134.92 213.045 131.53 241.081H62.0566C67.6616 213.644 84.6358 186.976 111.855 162.763H161.177ZM268.353 162.763C258.051 186.955 251.434 213.376 249.259 241.081H161.811C165.958 213.195 178.644 186.623 198.55 162.763H268.353ZM443.129 162.763C436.563 189.009 423.25 212.422 399.741 226.332C398.682 226.959 397.615 227.574 396.542 228.177C378.028 238.58 356.428 241.081 335.191 241.081H279.352C281.843 212.721 289.534 186.243 301.286 162.763H443.129ZM613.544 162.763C625.296 186.243 632.988 212.721 635.479 241.081H591.638C570.401 241.081 548.801 238.58 530.287 228.177C529.216 227.575 528.152 226.962 527.096 226.337C503.584 212.427 490.268 189.012 483.702 162.763H613.544ZM716.281 162.763C736.187 186.623 748.873 213.195 753.021 241.081H665.572C663.397 213.376 656.781 186.955 646.479 162.763H716.281ZM802.975 162.763C830.194 186.976 847.169 213.644 852.773 241.081H783.301C779.911 213.045 769.531 186.682 753.654 162.763H802.975ZM224.114 98.876C209.747 109.189 196.658 120.531 185.115 132.763H152.99C159.282 128.948 165.874 125.23 172.759 121.62C188.565 113.332 205.744 105.717 224.114 98.876ZM326.986 80.5088C310.229 95.3673 295.617 113.011 283.688 132.763H229.15C234.271 128.598 239.648 124.562 245.271 120.665C268.782 104.376 296.376 90.7163 326.986 80.5088ZM448.416 116.456C448.416 121.871 448.227 127.324 447.823 132.763H319.678C350.932 90.5437 397.157 63.1396 448.416 60.2529V116.456ZM478.416 61.3857C524.855 67.5446 566.357 93.8659 595.152 132.763H479.009C478.605 127.325 478.416 121.872 478.416 116.457V61.3857ZM587.842 80.5088C618.453 90.7164 646.049 104.375 669.56 120.665C675.183 124.562 680.56 128.598 685.681 132.763H631.143C619.214 113.01 604.599 95.3675 587.842 80.5088ZM690.717 98.876C709.086 105.716 726.265 113.332 742.071 121.62C748.957 125.23 755.548 128.948 761.84 132.763H729.716C718.173 120.531 705.084 109.189 690.717 98.876Z";

const DOWNLOAD_ICON = `<g fill="currentColor"><path d="M14 9V3h-4v6H6l6 8 6-8h-4z"/><path d="M5 19h14v2H5z"/></g>`;
const KEYBOARD_ICON = `<g fill="currentColor"><path d="M2 4h20v2H2zM2 6h2v12H2zM20 6h2v12h-2zM2 18h20v2H2zM6 8h2v2H6zM10 8h2v2h-2zM14 8h2v2h-2zM18 8h2v2h-2zM6 12h2v2H6zM10 12h2v2h-2zM14 12h2v2h-2zM18 12h2v2h-2zM8 16h8v-2H8z"/></g>`;

// Per-preset accent (URL chip + tagline accent color). Falls back to
// cyan if a preset doesn't have an explicit accent.
const ACCENT = {
  default: "#8ddfff",
  halftone: "#a8a39b",
  newsprint: "#e83e9a",
  risograph: "#406bf5",
  aurora: "#52d8ff",
  pixel: "#a8a39b",
  bayer: "#a8a39b",
  atkinson: "#a8a39b",
  wireframe: "#6cb6ff",
  crt: "#3ec5e8",
  glitch: "#40e0ff",
  badtv: "#8ddfff",
  bloom: "#ff9a3c",
  metal: "#7a8290",
  pencil: "#7a7368",
  iridescent: "#7ce8e0",
  corrupt: "#00ff7f",
  toon: "#ffd84a",
  threshold: "#8ddfff",
  topographic: "#6cb6ff",
  vapor: "#52d8ff",
};

// Build the chrome overlay SVG that sits on top of the canvas
// screenshot. Same wordmark + pixel-font + icon-chip system as the
// SVG generator, but transparent everywhere the canvas should show
// through.
const buildOverlay = ({ headlines, accent, url }) => {
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
    <linearGradient id="vignette" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06060d" stop-opacity="0.88"/>
      <stop offset="30%" stop-color="#06060d" stop-opacity="0.78"/>
      <stop offset="55%" stop-color="#06060d" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#06060d" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Dark vignette over the left half so the wordmark + headlines
       have a legible bed regardless of the canvas content underneath. -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#vignette)"/>

  <!-- Wordmark — DottedGlobe horizontal-banded mark, top-left. -->
  <g transform="translate(72 60) scale(0.22)" fill="#f6f2ea">
    <path d="${WORDMARK_PATH}"/>
  </g>

  ${headlinesMarkup}

  <!-- Pixel-icon chips at the bottom-left. -->
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

  <!-- URL chip — preset-tinted. -->
  <text x="72" y="555" font-family="'Press Start 2P', ui-monospace, Menlo, monospace" font-size="14" fill="${accent}" letter-spacing="-1">${url}</text>
</svg>`;
};

const splitBlurb = (text, maxLen = 22) => {
  if (text.length <= maxLen) return [text];
  const breakAt = text.lastIndexOf(" ", maxLen);
  if (breakAt <= 0) return [text];
  return [text.slice(0, breakAt), text.slice(breakAt + 1)];
};

const main = async () => {
  console.log(`Launching chromium…`);
  const browser = await chromium.launch({
    args: [
      // Force ANGLE+SwiftShader so WebGL works in headless without GPU.
      "--use-gl=swiftshader",
      "--use-angle=swiftshader",
      "--ignore-gpu-blocklist",
      "--enable-webgl",
      "--enable-accelerated-2d-canvas",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: CAPTURE_W, height: CAPTURE_H },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const presets = lookPresets.filter(
    (p) => argFilter.length === 0 || argFilter.includes(p.id),
  );

  for (const preset of presets) {
    const url = `${DEV}/embed?look=${preset.id}`;
    console.log(`→ ${preset.id} (${url})`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    // Wait for the canvas element to be present and have a stable size.
    await page.waitForSelector("canvas", { timeout: 10000 });
    // Hide dev-only UI that would land in the screenshot — perf HUD
    // (top-right FPS/calls/geo/dots), the keyboard-shortcut toast,
    // and the onboarding hint pill.
    await page.addStyleTag({
      content: `
        .perf-monitor, .keyboard-hint, .onboarding-hint { display: none !important; }
      `,
    });
    // Three.js takes a few render frames to warm up shaders + post
    // effects + load the dotted-map data. 4s is empirically enough.
    await page.waitForTimeout(4000);

    // Clip to a 1200×630 window offset into the larger captured frame
    // so the globe lands cropped at the bottom-left of the OG card.
    const canvasPng = await page.screenshot({
      type: "png",
      clip: { x: CROP_X, y: CROP_Y, width: W, height: H },
    });

    const accent = ACCENT[preset.id] ?? "#8ddfff";
    const blurbLines = splitBlurb(preset.blurb);
    const headlines = [
      { text: preset.name, color: "#f6f2ea" },
      ...blurbLines.map((text) => ({ text, color: accent })),
    ];
    const overlaySvg = buildOverlay({
      headlines,
      accent,
      url: `globestudio.app/looks/${preset.id}`,
    });
    const overlayPng = new Resvg(overlaySvg, {
      fitTo: { mode: "width", value: W },
      font: { loadSystemFonts: true },
      background: "rgba(0,0,0,0)",
    })
      .render()
      .asPng();

    // Composite overlay over the canvas screenshot using sharp-style
    // pixel blend. We don't have sharp installed, so do it via a tiny
    // SVG that embeds both as image elements.
    const composedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
      <image href="data:image/png;base64,${canvasPng.toString("base64")}" width="${W}" height="${H}"/>
      <image href="data:image/png;base64,${overlayPng.toString("base64")}" width="${W}" height="${H}"/>
    </svg>`;
    const composedPng = new Resvg(composedSvg, {
      fitTo: { mode: "width", value: W },
    })
      .render()
      .asPng();

    const outPath = resolve(outputDir, `${preset.id}.png`);
    writeFileSync(outPath, composedPng);
    // Also overwrite default.png when the "default" preset is captured.
    if (preset.id === "default") {
      writeFileSync(resolve(outputDir, "default.png"), composedPng);
    }
    console.log(`  wrote ${outPath} (${composedPng.length} bytes)`);
  }

  // --- Teaser OG card: the hero CRT globe + teaser copy, same chrome/layout as
  //     the preset cards. Run `node scripts/capture-og-canvas.js teaser` to
  //     (re)build just this one. ---
  const wantTeaser = argFilter.length === 0 || argFilter.includes("teaser");
  if (wantTeaser) {
    const teaserUrl = buildShareUrl(TEASER_GLOBE, DEV, "/embed");
    console.log(`→ teaser (${teaserUrl})`);
    await page.goto(teaserUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForSelector("canvas", { timeout: 10000 });
    await page.addStyleTag({
      content: `.perf-monitor, .keyboard-hint, .onboarding-hint { display: none !important; }`,
    });
    await page.waitForTimeout(4000);
    const canvasPng = await page.screenshot({
      type: "png",
      clip: { x: CROP_X, y: CROP_Y, width: W, height: H },
    });
    const accent = "#52d8ff";
    const headlines = [
      { text: "Something worldly", color: "#f6f2ea" },
      { text: "is coming.", color: accent },
    ];
    const overlaySvg = buildOverlay({ headlines, accent, url: "globestudio.app" });
    const overlayPng = new Resvg(overlaySvg, {
      fitTo: { mode: "width", value: W },
      font: { loadSystemFonts: true },
      background: "rgba(0,0,0,0)",
    })
      .render()
      .asPng();
    const composedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
      <image href="data:image/png;base64,${canvasPng.toString("base64")}" width="${W}" height="${H}"/>
      <image href="data:image/png;base64,${overlayPng.toString("base64")}" width="${W}" height="${H}"/>
    </svg>`;
    const composedPng = new Resvg(composedSvg, {
      fitTo: { mode: "width", value: W },
    })
      .render()
      .asPng();
    const outPath = resolve(outputDir, "teaser.png");
    writeFileSync(outPath, composedPng);
    console.log(`  wrote ${outPath} (${composedPng.length} bytes)`);
  }

  await browser.close();
  console.log(`Done.`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
