#!/usr/bin/env node
// Build-time RSS generator for /changelog. Reads the curated ENTRIES
// array from src/components/changelog-page.jsx and emits an RSS 2.0
// feed at public/changelog.xml so designer audiences can subscribe
// in their reader of choice (Feedly, NetNewsWire, Inoreader,
// Reeder, etc.) and get pinged on every wave of work.
//
// Per docs/research/2026-05-post-launch-retention.md, this is the
// foundation for the "one write, three channels" pattern — the RSS
// feed can be cross-posted to X and posted-to-Mastodon via tools
// like RSS.app or n8n, so a single changelog edit triggers a release
// announcement everywhere.
//
// The script is deliberately a simple parse of the JS source — no
// need to spin up a full module loader. ENTRIES is a top-level
// const and the parse is regex-based to keep this fast.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const SITE = "https://globestudio.app";

// Pull ENTRIES out of changelog-page.jsx via dynamic import so we
// stay in sync without re-parsing.
const { entries } = await loadEntries();

const escape = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const isoDate = (dateLabel) => {
  // "May 2026" → first of that month in RFC 822 format.
  const months = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  };
  const m = dateLabel.match(/^(\w+)\s+(\d{4})$/);
  if (!m) return new Date().toUTCString();
  const month = months[m[1]] ?? "01";
  return new Date(`${m[2]}-${month}-01T12:00:00Z`).toUTCString();
};

const items = entries
  .map((entry) => {
    const pubDate = isoDate(entry.date);
    const guid = `${SITE}/changelog#${encodeURIComponent(entry.label.toLowerCase().replace(/\s+/g, "-"))}`;
    const description = `<ul>\n${entry.items.map((line) => `  <li>${escape(line)}</li>`).join("\n")}\n</ul>`;
    return `    <item>
      <title>${escape(entry.label)}</title>
      <link>${SITE}/changelog</link>
      <guid isPermaLink="false">${escape(guid)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${description}]]></description>
    </item>`;
  })
  .join("\n");
const lastBuildDate = entries[0]?.date ? isoDate(entries[0].date) : new Date(0).toUTCString();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Globestudio changelog</title>
    <link>${SITE}/changelog</link>
    <atom:link href="${SITE}/changelog.xml" rel="self" type="application/rss+xml" />
    <description>Recent shipped work in Globestudio — new presets, polish, infrastructure, and first-visit experience.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`;

const outPath = resolve(root, "public/changelog.xml");
writeFileSync(outPath, xml);
console.log(`✓ Generated changelog.xml (${entries.length} entries) → public/changelog.xml`);

// Inline parser for the ENTRIES array in changelog-page.jsx. We do
// this rather than running the JSX through a bundler because the
// build step shouldn't pull in React just to read a const array.
async function loadEntries() {
  const src = readFileSync(resolve(root, "src/components/changelog-page.jsx"), "utf8");
  const match = src.match(/const ENTRIES = (\[[\s\S]*?\n\]);/);
  if (!match) throw new Error("Could not find ENTRIES array in changelog-page.jsx");
  // The ENTRIES literal is plain object syntax — safe to evaluate
  // because the source is local + checked in.
  // eslint-disable-next-line no-new-func
  const entries = Function(`"use strict"; return (${match[1]});`)();
  return { entries };
}
