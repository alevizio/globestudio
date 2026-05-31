#!/usr/bin/env node
// Auto-generates public/sitemap.xml from the current look presets so the file
// stays in sync with src/data/look-presets.js. Wired into the prebuild step
// (see package.json) so every build refreshes the sitemap.
//
// Why this exists: the hand-maintained sitemap.xml drifted out of sync with
// the preset list during the shader-rename pass (sitemap referenced
// /looks/print, /looks/topographic, /looks/particles, /looks/ascii — none of
// which exist anymore). Search engines were getting served 404 URLs.
// Generating from source means it can never drift again.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { lookPresets } from "../src/data/look-presets.js";
import { comparisonSlugs } from "../src/data/comparisons.js";

const SITE_URL = "https://globestudio.app";

const buildSitemap = () => {
  const entries = [
    {
      loc: `${SITE_URL}/`,
      changefreq: "weekly",
      priority: "1.0",
    },
    {
      loc: `${SITE_URL}/docs`,
      changefreq: "monthly",
      priority: "0.7",
    },
    {
      loc: `${SITE_URL}/integrations`,
      changefreq: "monthly",
      priority: "0.7",
    },
    {
      loc: `${SITE_URL}/examples`,
      changefreq: "monthly",
      priority: "0.7",
    },
    {
      loc: `${SITE_URL}/gallery`,
      changefreq: "weekly",
      priority: "0.7",
    },
    ...comparisonSlugs.map((slug) => ({
      loc: `${SITE_URL}/compare/${slug}`,
      changefreq: "monthly",
      priority: "0.7",
    })),
    {
      loc: `${SITE_URL}/brand`,
      changefreq: "monthly",
      priority: "0.5",
    },
    {
      loc: `${SITE_URL}/changelog`,
      changefreq: "weekly",
      priority: "0.6",
    },
    {
      loc: `${SITE_URL}/privacy`,
      changefreq: "yearly",
      priority: "0.3",
    },
    ...lookPresets.map((preset) => ({
      loc: `${SITE_URL}/looks/${preset.id}`,
      changefreq: "monthly",
      priority: "0.8",
    })),
  ];

  const urlBlocks = entries
    .map(
      (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join("\n");

  return {
    count: entries.length,
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlBlocks}
</urlset>
`,
  };
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, "..", "public", "sitemap.xml");
const sitemap = buildSitemap();
writeFileSync(outputPath, sitemap.xml, "utf8");

console.log(`✓ Generated sitemap with ${sitemap.count} URLs → ${outputPath}`);
