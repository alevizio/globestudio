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

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { lookPresets } from "../src/data/look-presets.js";
import { comparisonSlugs } from "../src/data/comparisons.js";

const SITE_URL = "https://globestudio.app";

const TEASER = process.env.VITE_TEASER === "1";

// Each page's <lastmod> comes from a date the repo already states, so the
// build needs no git history. A lookup that finds no date throws, so a
// reworded page fails the build instead of shipping a wrong date.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "5 October 2026" → "2026-10-05", the way the changelog and terms pages
// write a date. A month alone ("May 2026") is its first day.
const isoDay = (text) => {
  const [, day = "1", month, year] = text.match(/^(?:(\d{1,2})\s+)?(\w+)\s+(\d{4})$/) ?? [];
  const monthNumber = MONTHS.indexOf(month) + 1;
  if (!monthNumber) throw new Error(`generate-sitemap: can't read the date "${text}"`);
  return `${year}-${String(monthNumber).padStart(2, "0")}-${day.padStart(2, "0")}`;
};

// The newest date `pattern` captures in a repo file, as YYYY-MM-DD.
const newestDate = (path, pattern, toDay = (date) => date) => {
  const dates = [...readFileSync(resolve(ROOT, path), "utf8").matchAll(pattern)].map((match) => toDay(match[1]));
  if (dates.length === 0) throw new Error(`generate-sitemap: found no dates in ${path}`);
  return dates.sort().at(-1);
};

// The studio pages (/, /gallery and the looks) change with each release.
const RELEASED = newestDate("CHANGELOG.md", /^## \[[^\]]+\] - (\d{4}-\d{2}-\d{2})$/gm);
// /changelog changes with its newest entry, and /terms on the date it gives.
const CHANGELOG_UPDATED = newestDate("src/components/changelog-page.jsx", /\bdate: "([^"]+)"/g, isoDay);
const TERMS_UPDATED = newestDate("src/components/terms-page.jsx", /Last updated (\d{1,2}\s+\w+\s+\d{4})/g, isoDay);

// Every indexable URL. Exported for src/site-routes.test.js, which checks it
// against the prerendered files and the router. Pages that state no date of
// their own give the day they last changed what they say: bump it with the
// page.
export const sitemapEntries = () => [
  {
    loc: `${SITE_URL}/`,
    lastmod: RELEASED,
    changefreq: "weekly",
    priority: "1.0",
  },
  {
    loc: `${SITE_URL}/docs`,
    lastmod: "2026-10-06",
    changefreq: "monthly",
    priority: "0.7",
  },
  {
    loc: `${SITE_URL}/integrations`,
    lastmod: "2026-10-06",
    changefreq: "monthly",
    priority: "0.7",
  },
  {
    loc: `${SITE_URL}/examples`,
    lastmod: "2026-09-28",
    changefreq: "monthly",
    priority: "0.7",
  },
  {
    loc: `${SITE_URL}/gallery`,
    lastmod: RELEASED,
    changefreq: "weekly",
    priority: "0.7",
  },
  ...comparisonSlugs.map((slug) => ({
    loc: `${SITE_URL}/compare/${slug}`,
    lastmod: "2026-10-06",
    changefreq: "monthly",
    priority: "0.7",
  })),
  {
    loc: `${SITE_URL}/brand`,
    lastmod: "2026-10-06",
    changefreq: "monthly",
    priority: "0.5",
  },
  {
    loc: `${SITE_URL}/changelog`,
    lastmod: CHANGELOG_UPDATED,
    changefreq: "weekly",
    priority: "0.6",
  },
  {
    // The privacy page gives no Last updated date.
    loc: `${SITE_URL}/privacy`,
    lastmod: "2026-10-06",
    changefreq: "yearly",
    priority: "0.3",
  },
  {
    loc: `${SITE_URL}/terms`,
    lastmod: TERMS_UPDATED,
    changefreq: "yearly",
    priority: "0.3",
  },
  ...lookPresets.map((preset) => ({
    loc: `${SITE_URL}/looks/${preset.id}`,
    lastmod: RELEASED,
    changefreq: "monthly",
    priority: "0.8",
  })),
];

// Exported for src/site-routes.test.js too.
export const buildSitemap = () => {
  const allEntries = sitemapEntries();

  // Pre-launch teaser: only the homepage is indexable (the rest are noindexed
  // at prerender, or canonical to "/"), so ship a single-URL sitemap and don't
  // feed Search Console ~31 noindexed URLs. Reverts to the full list at launch.
  const entries = TEASER ? allEntries.slice(0, 1) : allEntries;

  const urlBlocks = entries
    .map(
      (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
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

// Run only as a script (the prebuild step), so importing the entries doesn't
// rewrite public/sitemap.xml.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outputPath = resolve(__dirname, "..", "public", "sitemap.xml");
  const sitemap = buildSitemap();
  writeFileSync(outputPath, sitemap.xml, "utf8");

  console.log(`✓ Generated sitemap with ${sitemap.count} URLs → ${outputPath}`);
}
