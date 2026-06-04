// Prerender per-route static HTML for SEO + social/AI cards.
//
// The app is a client-rendered SPA, so every route otherwise ships the same
// generic <head> (social scrapers + AI crawlers don't run JS, so they'd see
// identical title/description/og:image everywhere). This clones the built
// dist/index.html into a per-route file with route-specific <head> meta
// injected, so /looks/:id, /compare/:slug, and /gallery get unique, rich cards.
//
// PURELY ADDITIVE: Vercel applies vercel.json `rewrites` only as a fallback
// after the filesystem, so these static files are served for their routes; if
// they weren't, the SPA fallback (current behavior) kicks in — no regression.
// The SPA still boots from each file and renders the live app on top.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lookPresets } from "../src/data/look-presets.js";
import { comparisons } from "../src/data/comparisons.js";

const dir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(dir, "../dist");
const SITE = "https://globestudio.app";

let template;
try {
  template = readFileSync(resolve(distDir, "index.html"), "utf8");
} catch {
  console.error("prerender: dist/index.html not found — run after `vite build`.");
  process.exit(0);
}

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Replace a single-valued <head> tag's content; `\s` spans the multiline
// formatting in index.html. Returns [html, didReplace] so we can warn if the
// template format drifts (a miss degrades to the default meta — never breaks).
const swap = (html, regex, replacement) => {
  let hit = false;
  const next = html.replace(regex, (...args) => {
    hit = true;
    return typeof replacement === "function" ? replacement(...args) : replacement;
  });
  return [next, hit];
};

const buildHead = (html, { title, description, url, image }) => {
  let misses = 0;
  const apply = (re, rep) => {
    const [next, hit] = swap(html, re, rep);
    html = next;
    if (!hit) misses += 1;
  };
  apply(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  apply(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${esc(description)}$2`);
  apply(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${esc(title)}$2`);
  apply(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${esc(description)}$2`);
  apply(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${url}$2`);
  apply(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${esc(title)}$2`);
  apply(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1${url}$2`);
  if (image) {
    apply(/(<meta\s+property="og:image"\s+content=")[^"]*(")/, `$1${image}$2`);
    apply(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/, `$1${image}$2`);
  }
  return [html, misses];
};

// Pre-launch teaser mode: every route renders the same coming-soon page, and
// these prerendered routes (looks/compare/gallery) self-canonical — so without
// this they'd be ~24 indexable duplicates of the teaser. Only "/" is indexable
// during pre-launch, so noindex them here (not in the shared index.html, which
// keeps the homepage crawlable). Auto-reverts when VITE_TEASER is unset.
const TEASER = process.env.VITE_TEASER === "1";

const writeRoute = (routePath, meta) => {
  let [html, misses] = buildHead(template, meta);
  if (TEASER) {
    html = html.replace(
      "</head>",
      '    <meta name="robots" content="noindex, nofollow" />\n  </head>',
    );
  }
  const outDir = resolve(distDir, routePath);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "index.html"), html);
  return misses;
};

let totalMisses = 0;
let count = 0;

for (const preset of lookPresets) {
  const id = preset.id;
  const name = preset.name || id;
  const image = existsSync(resolve(distDir, "og", `${id}.png`))
    ? `${SITE}/og/${id}.png`
    : null; // fall back to the default og:image already in the template
  totalMisses += writeRoute(`looks/${id}`, {
    title: `${name} — dotted map & 3D globe look · Globestudio`,
    description: `Generate a dotted map or animated 3D globe in the ${name} look, then export PNG, SVG, WebM, MP4, or GIF. Free and open source.`,
    url: `${SITE}/looks/${id}`,
    image,
  });
  count += 1;
}

for (const c of Object.values(comparisons)) {
  totalMisses += writeRoute(`compare/${c.slug}`, {
    title: c.title,
    description: c.metaDescription,
    url: `${SITE}/compare/${c.slug}`,
    image: null,
  });
  count += 1;
}

totalMisses += writeRoute("gallery", {
  title: "Looks gallery — dotted map & 3D globe styles · Globestudio",
  description:
    "Browse every built-in Globestudio look. Open one to generate a dotted map or animated 3D globe and export PNG, SVG, WebM, MP4, or GIF. Free, open source.",
  url: `${SITE}/gallery`,
  image: null,
});
count += 1;

if (totalMisses > 0) {
  console.warn(
    `⚠ prerender: ${totalMisses} <head> tag(s) didn't match the template — those routes kept default meta. Check index.html tag formatting.`,
  );
}
console.log(`✓ Prerendered ${count} routes with per-route meta → dist/{looks,compare,gallery}/`);
