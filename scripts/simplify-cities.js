#!/usr/bin/env node
// One-shot script. Takes the raw Natural Earth 1:50m populated_places_simple
// GeoJSON (~1MB) and produces a slim version with just the fields the texture
// renderer reads: name + pop_max + scalerank + coordinates. Coordinates round
// to 3 decimal places (~110m precision at the equator — overkill for the
// designer-tool render scale but keeps the file small).
//
// Target output ~80-100KB raw, ~30KB gzipped. Lazy-loaded on first toggle.
//
// Re-run if you want to refresh from upstream:
//   node scripts/simplify-cities.js
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = resolve(__dirname, "..", "public", "data", "world-cities.json");

const round3 = (n) => Math.round(n * 1000) / 1000;

const raw = JSON.parse(readFileSync(filePath, "utf8"));
const slim = {
  type: "FeatureCollection",
  features: raw.features
    .filter((f) => f.geometry?.coordinates && (f.properties?.pop_max ?? 0) > 0)
    .map((f) => ({
      type: "Feature",
      properties: {
        name: f.properties.name || null,
        pop_max: f.properties.pop_max,
        scalerank: f.properties.scalerank ?? null,
      },
      geometry: {
        type: "Point",
        coordinates: [round3(f.geometry.coordinates[0]), round3(f.geometry.coordinates[1])],
      },
    })),
};

writeFileSync(filePath, JSON.stringify(slim), "utf8");
const sizeKb = Math.round(JSON.stringify(slim).length / 1024);
console.log(`✓ Slimmed ${raw.features.length} → ${slim.features.length} city features (${sizeKb} KB)`);
