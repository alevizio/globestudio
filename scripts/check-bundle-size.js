#!/usr/bin/env node
// Bundle-size budget gate.
//
// Walks dist/assets/ after a production build and compares each chunk's
// size (raw + gzip) against a documented budget. Exits non-zero if any
// chunk is over budget so CI can block regressions before they ship.
//
// Update budgets here when a chunk legitimately needs to grow — the diff
// is the audit trail. The numbers below are the ceiling, not the target;
// they include ~15% headroom over the current build so normal feature
// work doesn't trip the gate. A chunk that overruns its budget either
// needs trimming or a deliberate budget bump in this file.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const distAssets = resolve(here, "..", "dist", "assets");

// Chunks are hashed (e.g. `three-CTQTyFdZ.js`). Match by the prefix.
// Budgets are bytes. Raw = uncompressed; gzip = sent over the wire.
const BUDGETS = [
  // Initial-load chunks (block first paint)
  // Main app shell includes schema-aligned share/config import
  // validation. Keeping that guard in the initial chunk ensures
  // malformed ?c= payloads are rejected before they can mutate render
  // state.
  // Since Vite 8.0.16 (Rolldown 1.0.3) the shared chunks the shell imports
  // statically (icons, math, globe-settings and shader-effects, below) fold
  // into this one, so its budget is the old 340 / 98 kB plus theirs. The
  // first paint JS is the same bytes in 5 requests instead of 9.
  { prefix: "index-",            ext: ".js",  raw: 374_000,  gzip: 108_500, lazy: false },
  { prefix: "react-",            ext: ".js",  raw: 210_000,  gzip:  70_000, lazy: false },
  { prefix: "dotted-map-",       ext: ".js",  raw: 430_000,  gzip: 170_000, lazy: false },
  { prefix: "src-",              ext: ".js",  raw:  20_000,  gzip:   8_000, lazy: false },
  { prefix: "vendor-",           ext: ".js",  raw:  10_000,  gzip:   5_000, lazy: false },
  { prefix: "rolldown-runtime-", ext: ".js",  raw:   2_000,  gzip:   1_000, lazy: false },
  // Rolldown may fold this ~1 kB helper into index-*.js; it does since
  // globe-background imports the client_error tracker from analytics.jsx.
  // Its bytes then count toward the index budget and the initial total, so
  // a missing file here is not a regression.
  { prefix: "preload-helper-",   ext: ".js",  raw:   2_000,  gzip:   1_000, lazy: false, optional: true },
  // icons.jsx. Rolldown splits it out of index-*.js once the Figma plugin
  // pickers are a lazy chunk; it is still preloaded on first paint, so it
  // counts as initial. Rolldown 1.0.3 folds it into index-*.js (see above),
  // so a missing file here is not a regression; the same goes for math,
  // globe-settings and shader-effects.
  { prefix: "icons-",            ext: ".js",  raw:  22_000,  gzip:   5_000, lazy: false, optional: true },
  // CSS is unminified — the build pipeline drops -webkit-backdrop-filter
  // / backdrop-filter pairs when minified, breaking modal frosted-glass
  // across browsers (see vite.config.js#cssMinify: false). Budget bumped
  // accordingly. The v1 launch surface intentionally keeps docs,
  // controls, modal, mobile sheet, and accessibility fallback styles in
  // one critical stylesheet so first paint does not wait on route-level
  // CSS. Revisit once the app has route-level CSS splitting.
  { prefix: "index-",            ext: ".css", raw: 214_000,  gzip:  50_000, lazy: false },

  // Lazy chunks (loaded after first paint)
  // 41 kB gzip since low power mode and the region overlay clip (Oct 2026).
  // 121 kB raw since the flat Solid map frames a picked US state (Oct 2026)
  // and each layer reads the design's color space (hex colors).
  { prefix: "globe-background-", ext: ".js",  raw: 121_000,  gzip:  41_000, lazy: true },
  { prefix: "three-",            ext: ".js",  raw: 620_000,  gzip: 160_000, lazy: true },
  { prefix: "geo-",              ext: ".js",  raw:  35_000,  gzip:  12_000, lazy: true },
  { prefix: "states-10m-",       ext: ".js",  raw: 130_000,  gzip:  45_000, lazy: true },
  { prefix: "countries-50m-",    ext: ".js",  raw: 800_000,  gzip: 260_000, lazy: true },
  // Route-level split: the /examples showcase (heavy hero CSS + globe
  // embeds) is lazy-loaded, so it no longer weighs on first paint. Its
  // deps (flow shader, math) split out alongside it.
  { prefix: "examples-page-",    ext: ".js",  raw:  40_000,  gzip:  13_000, lazy: true },
  // Grew with the per-showcase inline-style CSS (Stripe/Vercel/Game Over/News +
  // their mobile overrides). Lazy chunk, so it doesn't touch first paint.
  { prefix: "examples-page-",    ext: ".css", raw:  24_000,  gzip:   7_500, lazy: true },
  { prefix: "flow-background-shader-", ext: ".js", raw: 5_000, gzip: 2_000, lazy: true },
  { prefix: "math-",             ext: ".js",  raw:   4_000,  gzip:   2_500, lazy: true, optional: true },
  // gifenc / mp4-muxer — only fetched when a GIF / MP4 export is requested.
  { prefix: "gifenc-",           ext: ".js",  raw:  12_000,  gzip:   5_500, lazy: true },
  { prefix: "mp4-muxer-",        ext: ".js",  raw:  36_000,  gzip:  11_000, lazy: true },
  // Looks gallery — lazy /gallery route + co-located CSS.
  { prefix: "gallery-page-",     ext: ".js",  raw:   3_000,  gzip:   1_500, lazy: true },
  { prefix: "gallery-page-",     ext: ".css", raw:   3_500,  gzip:   1_500, lazy: true },
  // Privacy policy — lazy /privacy route. Its CSS stays in index-*.css with
  // the other takeover pages, so there is no co-located stylesheet.
  { prefix: "privacy-page-",     ext: ".js",  raw:   9_000,  gzip:   3_000, lazy: true },
  // Comparison pages — lazy /compare/:slug route + co-located CSS.
  { prefix: "compare-page-",     ext: ".js",  raw:  10_000,  gzip:   3_500, lazy: true },
  { prefix: "compare-page-",     ext: ".css", raw:   3_500,  gzip:   1_500, lazy: true },
  // Look, region, density and view pickers, fetched only by /embed?plugin=figma.
  { prefix: "figma-plugin-pickers-", ext: ".js", raw: 2_000, gzip: 1_000, lazy: true },
  // The Paste a share link field and its link reader, which reads an embed
  // link's own params too, fetched only by the studio in the Figma plugin
  // (/?plugin=figma).
  { prefix: "figma-paste-link-", ext: ".js", raw: 3_600, gzip: 1_850, lazy: true },
  // data/look-presets.js. Rolldown splits it out of index-*.js once the
  // paste link chunk reads it too (index-*.js got 1.4 kB gzip smaller).
  // The app shell still preloads it on first paint, so it counts as
  // initial. Optional: if Rolldown folds it back, index-*.js carries it.
  { prefix: "look-presets-",     ext: ".js",  raw:   7_000,  gzip:   2_100, lazy: false, optional: true },
  // The export dialog's MCP tab (MCP connect commands + Copy for AI
  // prompt), fetched only when that tab opens. Its CSS rides along so the
  // critical stylesheet doesn't grow.
  { prefix: "agent-share-",      ext: ".js",  raw:   6_500,  gzip:   3_000, lazy: true },
  { prefix: "agent-share-",      ext: ".css", raw:   2_000,  gzip:   1_000, lazy: true },
  // The export dialog's Skill tab (the agent skill's install commands),
  // fetched only when that tab opens. It uses the dialog's own styles, so it
  // has no CSS.
  { prefix: "agent-skill-",      ext: ".js",  raw:   2_500,  gzip:   1_200, lazy: true },
  // Config defaults split into shared chunks once look-presets is imported by
  // a lazy route (gallery) as well as the main app.
  { prefix: "globe-settings-",   ext: ".js",  raw:   3_000,  gzip:   1_500, lazy: false, optional: true },
  { prefix: "shader-effects-",   ext: ".js",  raw:   5_000,  gzip:   1_500, lazy: false, optional: true },
  // Pre-launch teaser (only loaded when VITE_TEASER=1). Includes the
  // LiquidMetal + the canvas ChromeShader logo shaders — hence the budget.
  { prefix: "teaser-page-",      ext: ".js",  raw:  62_000,  gzip:  20_000, lazy: true },
  // Headroom for the CRT/pixel-corner clip-path polygons (verbose by nature)
  // plus the choreographed entrance (stagger keyframes), globe pointer-parallax
  // transform, and CTA/input micro-interactions. Gzip stays well under.
  { prefix: "teaser-page-",      ext: ".css", raw:  14_600,  gzip:   4_800, lazy: true },
];

// Total initial-payload budget. Sum of non-lazy chunks' gzip sizes.
// First-paint floor: this is what a cold user actually downloads before
// the canvas appears. Bumped after disabling CSS minification (see
// vite.config.js#cssMinify) to keep modal backdrop-filter prefixes
// intact; this is the floor including that CSS cost and the launch docs
// surface that ships in the app shell.
const INITIAL_GZIP_BUDGET = 360_000;

const format = (bytes) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${bytes} B`;
};

const files = readdirSync(distAssets).map((name) => {
  const fullPath = join(distAssets, name);
  const raw = statSync(fullPath).size;
  const gzip = gzipSync(readFileSync(fullPath)).length;
  return { name, raw, gzip };
});

const rows = [];
const failures = [];
let initialGzipTotal = 0;
const matchedNames = new Set();

for (const budget of BUDGETS) {
  const match = files.find(
    (f) => f.name.startsWith(budget.prefix) && f.name.endsWith(budget.ext),
  );
  if (!match) {
    if (!budget.optional) failures.push(`missing expected chunk ${budget.prefix}*${budget.ext}`);
    continue;
  }
  matchedNames.add(match.name);
  const overRaw = match.raw > budget.raw;
  const overGzip = match.gzip > budget.gzip;
  rows.push({
    name: match.name,
    raw: match.raw,
    rawBudget: budget.raw,
    gzip: match.gzip,
    gzipBudget: budget.gzip,
    lazy: budget.lazy,
    over: overRaw || overGzip,
  });
  if (!budget.lazy) initialGzipTotal += match.gzip;
  if (overRaw) {
    failures.push(
      `${match.name}: raw ${format(match.raw)} > budget ${format(budget.raw)}`,
    );
  }
  if (overGzip) {
    failures.push(
      `${match.name}: gzip ${format(match.gzip)} > budget ${format(budget.gzip)}`,
    );
  }
}

// Surface chunks the build produced that aren't in BUDGETS — a new chunk
// snuck in and needs an explicit budget rather than slipping by unwatched.
for (const file of files) {
  if (!matchedNames.has(file.name)) {
    failures.push(
      `unbudgeted chunk: ${file.name} (raw ${format(file.raw)}, gzip ${format(file.gzip)}). Add an entry to BUDGETS in scripts/check-bundle-size.js.`,
    );
  }
}

// three.js loads with the lazy globe-background chunk. If a module the app
// shell imports statically pulls it in again, index.html preloads it and
// first paint waits on it, while its budget row above still reads "lazy".
const indexHtml = readFileSync(resolve(distAssets, "..", "index.html"), "utf8");
if (/\/assets\/three-[^"]*\.js/.test(indexHtml)) {
  failures.push(
    "dist/index.html loads three-*.js up front. Import three.js only from modules behind the lazy globe-background chunk.",
  );
}

if (initialGzipTotal > INITIAL_GZIP_BUDGET) {
  failures.push(
    `initial-payload gzip total ${format(initialGzipTotal)} > budget ${format(INITIAL_GZIP_BUDGET)}`,
  );
}

console.log("Bundle size check");
console.log("-----------------");
const pad = (s, n) => String(s).padEnd(n);
console.log(
  pad("chunk", 36) + pad("raw", 18) + pad("gzip", 18) + "type",
);
for (const row of rows) {
  const rawCell = `${format(row.raw)} / ${format(row.rawBudget)}`;
  const gzipCell = `${format(row.gzip)} / ${format(row.gzipBudget)}`;
  const mark = row.over ? " ❌" : "";
  console.log(
    pad(row.name, 36) +
      pad(rawCell, 18) +
      pad(gzipCell, 18) +
      (row.lazy ? "lazy" : "initial") +
      mark,
  );
}
console.log(
  `\nInitial-payload gzip total: ${format(initialGzipTotal)} (budget ${format(INITIAL_GZIP_BUDGET)})`,
);

if (failures.length > 0) {
  console.error("\nBudget violations:");
  for (const f of failures) console.error("  - " + f);
  console.error(
    "\nFix by trimming the chunk, or bump the budget in scripts/check-bundle-size.js with a commit explaining why.",
  );
  process.exit(1);
}

console.log("\n✓ all chunks within budget");
