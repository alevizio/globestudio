#!/usr/bin/env node
// One-shot script. Takes the raw Natural Earth 1:50m rivers + lake
// centerlines GeoJSON (1.26MB) and produces a slim version with:
//   - only name + featurecla + scalerank properties retained
//   - coordinates rounded to 2 decimal places (~1km precision at the
//     equator, plenty for designer-tool visualization)
//   - whitespace stripped (single-line JSON)
// Output target ~150-200KB raw, ~50-70KB gzipped. Lazy-loaded via fetch
// when the user enables rivers, so it never blocks the first paint.
//
// Re-run if you want to refresh from upstream:
//   node scripts/simplify-rivers.js
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = resolve(__dirname, "..", "public", "data", "world-rivers.json");
const outputPath = inputPath;

const round2 = (n) => Math.round(n * 100) / 100;

const roundCoords = (coords) => {
  if (typeof coords[0] === "number") return [round2(coords[0]), round2(coords[1])];
  return coords.map(roundCoords);
};

const raw = JSON.parse(readFileSync(inputPath, "utf8"));
const slim = {
  type: "FeatureCollection",
  // Filter out features with null geometry — some Natural Earth entries are
  // metadata-only and shouldn't appear in the rendered output.
  features: raw.features
    .filter((feature) => feature.geometry?.type && feature.geometry.coordinates)
    .map((feature) => ({
      type: "Feature",
      properties: {
        name: feature.properties?.name || null,
        featurecla: feature.properties?.featurecla || null,
        scalerank: feature.properties?.scalerank ?? null,
      },
      geometry: {
        type: feature.geometry.type,
        coordinates: roundCoords(feature.geometry.coordinates),
      },
    })),
};

writeFileSync(outputPath, JSON.stringify(slim), "utf8");
const sizeKb = Math.round(JSON.stringify(slim).length / 1024);
console.log(`✓ Slimmed ${raw.features.length} river features → ${outputPath} (${sizeKb} KB)`);
