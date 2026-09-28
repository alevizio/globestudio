// Prerender per-route static HTML for SEO + social/AI cards.
//
// The app is a client-rendered SPA, so every route otherwise ships the same
// generic <head> (social scrapers + AI crawlers don't run JS, so they'd see
// identical title/description/og:image everywhere). This clones the built
// dist/index.html into a per-route file with route-specific <head> meta
// injected, so /looks/:id, /compare/:slug, /gallery, and the static pages
// (/docs, /integrations, /examples, /brand, /changelog, /privacy) get unique,
// rich cards — and, critically, self-referencing canonicals.
//
// These files ARE the routes: vercel.json has no catch-all rewrite, so a path
// with no file here gets dist/404.html (written below) with a real 404
// status instead of a 200 copy of the home page. The two pages the router
// renders client-side only, /embed and the teaser unlock path, get an
// untouched copy of the app shell. The SPA still boots from each file and
// renders the live app on top. src/site-routes.test.js keeps this list, the
// sitemap and the router (src/utils/route-match.js) in step.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lookPresets } from "../src/data/look-presets.js";
import { comparisons } from "../src/data/comparisons.js";
import { getPresetSeo } from "../src/data/preset-seo.js";
import { PRODUCT_CARD_ALT, lookCardAlt, shareCardUrl } from "../src/data/share-cards.js";
import { APP_UNLOCK_PATH } from "../src/utils/route-match.js";

const dir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(dir, "../dist");
const SITE = "https://globestudio.app";

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

const buildHead = (html, { title, description, url, image, imageAlt }) => {
  let misses = 0;
  const apply = (re, rep) => {
    const [next, hit] = swap(html, re, rep);
    html = next;
    if (!hit) misses += 1;
  };
  // Inject the value between the captured prefix/suffix via a replacer
  // FUNCTION, never a "$1…$2" string: swap() wraps every replacement in a
  // function (to track hits), and a function's return value is taken
  // literally — so "$1…$2" strings were landing in the HTML as literal text,
  // destroying every swapped tag (canonical, og:*, twitter:*, description).
  // Naive $-expansion isn't safe either: real copy contains "$250".
  const inject = (re, value) => apply(re, (_, p1, p2) => `${p1}${value}${p2}`);
  apply(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  inject(/(<meta\s+name="description"\s+content=")[^"]*(")/, esc(description));
  inject(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, esc(title));
  inject(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, esc(description));
  inject(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, url);
  inject(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, esc(title));
  inject(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, esc(description));
  inject(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, url);
  if (image) {
    inject(/(<meta\s+property="og:image"\s+content=")[^"]*(")/, image);
    inject(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/, image);
  }
  // Alt text follows the image: set whenever the image is. Routes that keep
  // the template's image (gallery, static pages, every teaser-mode fallback)
  // keep its alt too, which the teaser build swaps along with the image.
  if (imageAlt) {
    inject(/(<meta\s+property="og:image:alt"\s+content=")[^"]*(")/, esc(imageAlt));
    inject(/(<meta\s+name="twitter:image:alt"\s+content=")[^"]*(")/, esc(imageAlt));
  }
  return [html, misses];
};

// Pre-launch teaser mode: every route renders the same coming-soon page, and
// these prerendered routes (looks/compare/gallery) self-canonical — so without
// this they'd be ~24 indexable duplicates of the teaser. Only "/" is indexable
// during pre-launch, so noindex them here (not in the shared index.html, which
// keeps the homepage crawlable). Reverts once VITE_TEASER=0 (1 = teaser).
const TEASER = process.env.VITE_TEASER === "1";

// Every prerendered page, as { route, ...head meta }. `route` is the dist
// folder, so the URL path without its leading slash. `cardExists` says
// whether dist/og/<id>.png was built, so a look without a card keeps the
// template's default og:image.
export const pageRoutes = ({ teaser = TEASER, cardExists = () => true } = {}) => {
  const routes = [];

  for (const preset of lookPresets) {
    const id = preset.id;
    const name = preset.name || id;
    const image = cardExists(id) ? shareCardUrl(id) : null;
    routes.push({
      route: `looks/${id}`,
      title: `${name}: dotted map & 3D globe look · Globestudio`,
      // The hand-written per-look copy that preset-route.js sets after load,
      // so crawlers and unfurlers that don't run JS get the same snippet.
      description:
        getPresetSeo(id)?.metaDescription ??
        `Generate a dotted map or animated 3D globe in the ${name} look, then export PNG, SVG, WebM, MP4, GIF, JSON or an embed. Free and open source.`,
      url: `${SITE}/looks/${id}`,
      image,
      // og/default.png is the home product card, not a Default-look card, so
      // lookCardAlt describes it as such. Set even in teaser mode, where the
      // template alt describes the teaser card instead.
      imageAlt: image ? lookCardAlt(preset) : null,
    });
  }

  // Compare pages are product-vs-product, so the default product card (the
  // dotted globe) is the honest share image — every per-look card carries
  // look-specific copy + a /looks/:id URL, which would mislead on /compare.
  // Set explicitly (not via template fallback) so the card survives template
  // drift; in teaser mode the template already swapped in og/teaser.png
  // (teaserNoindexPlugin), so leave the fallback to keep that card.
  const productCard = teaser ? null : shareCardUrl("default");

  for (const c of Object.values(comparisons)) {
    routes.push({
      route: `compare/${c.slug}`,
      title: c.title,
      description: c.metaDescription,
      url: `${SITE}/compare/${c.slug}`,
      image: productCard,
      imageAlt: productCard ? PRODUCT_CARD_ALT : null,
    });
  }

  routes.push({
    route: "gallery",
    title: "Looks gallery: dotted map & 3D globe styles · Globestudio",
    description: `Browse all ${lookPresets.length} Globestudio looks. Open one to make a dotted map or animated 3D globe, then export PNG, SVG, WebM, MP4, GIF, JSON or an embed. Free, open source.`,
    url: `${SITE}/gallery`,
    image: null,
  });

  // Static pages. These are all in the sitemap, but without a prerendered file
  // they serve the shared index.html — whose canonical points at the homepage —
  // so search engines treated all six as duplicates of "/" and skipped them.
  // Self-canonicals (plus each page's real title/description, mirrored from the
  // client-side meta in src/components/*-page.jsx) make them indexable.
  const staticRoutes = [
    {
      route: "docs",
      title: "Docs · Globestudio",
      description:
        "Globestudio documentation: embed snippet, shareable config URLs, keyboard shortcuts, preset catalog, JSON schema.",
    },
    {
      route: "integrations",
      title: "Integrations · Globestudio",
      description:
        "Drop Globestudio into Webflow, Framer, Figma, Notion, WordPress, plain HTML, or React. Copy-paste snippets, no install.",
    },
    {
      route: "examples",
      title: "Examples · Globestudio",
      description:
        "Globestudio in product marketing: four full-screen hero showcases, from Stripe and Vercel style heroes to a retro game screen and a newspaper front page.",
    },
    {
      route: "brand",
      title: "Brand · Globestudio",
      description:
        "Globestudio press kit: logo, OG cards, color palette, taglines. Free to use for editorial coverage.",
    },
    {
      route: "changelog",
      title: "Changelog · Globestudio",
      description:
        "Recent shipped work in Globestudio: new presets, polish, infrastructure, and first-visit experience.",
    },
    {
      route: "privacy",
      title: "Privacy · Globestudio",
      description:
        "What Globestudio does and doesn't collect. Cookieless analytics, no fingerprinting, no third-party advertisers.",
    },
  ];

  for (const { route, title, description } of staticRoutes) {
    routes.push({ route, title, description, url: `${SITE}/${route}`, image: null });
  }

  return routes;
};

// Pages the router renders client-side only. They get the app shell as is:
// /embed keeps the exact bytes an embed iframe loaded before, and the unlock
// path is swapped for "/" by App.jsx on load.
export const shellRoutes = ["embed", APP_UNLOCK_PATH.slice(1)];

const NOINDEX = '    <meta name="robots" content="noindex, nofollow" />\n  </head>';

const writeFile = (routePath, html) => {
  const outDir = resolve(distDir, routePath);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "index.html"), html);
};

// Vercel serves dist/404.html, with a 404 status, for every path that has no
// file. The SPA boots on it and renders NotFoundPage for the requested URL.
// No canonical or og:url: a not-found page has no URL of its own.
export const notFoundHtml = (template) =>
  template
    .replace(/<title>[^<]*<\/title>/, "<title>Not found · Globestudio</title>")
    .replace(/\s*<link\s+rel="canonical"[^>]*>/, "")
    .replace(/\s*<meta\s+property="og:url"[^>]*>/, "")
    .replace("</head>", '    <meta name="robots" content="noindex" />\n  </head>');

const main = () => {
  let template;
  try {
    template = readFileSync(resolve(distDir, "index.html"), "utf8");
  } catch {
    console.error("prerender: dist/index.html not found — run after `vite build`.");
    process.exit(0);
  }

  let totalMisses = 0;
  const routes = pageRoutes({
    cardExists: (id) => existsSync(resolve(distDir, "og", `${id}.png`)),
  });
  for (const meta of routes) {
    let [html, misses] = buildHead(template, meta);
    if (TEASER) html = html.replace("</head>", NOINDEX);
    writeFile(meta.route, html);
    totalMisses += misses;
  }

  for (const route of shellRoutes) writeFile(route, template);
  writeFileSync(resolve(distDir, "404.html"), notFoundHtml(template));

  if (totalMisses > 0) {
    console.warn(
      `⚠ prerender: ${totalMisses} <head> tag(s) didn't match the template — those routes kept default meta. Check index.html tag formatting.`,
    );
  }
  console.log(
    `✓ Prerendered ${routes.length} routes with per-route meta → dist/{looks,compare,gallery,static pages}/, plus ${shellRoutes.length} app shells and 404.html`,
  );
};

// Run only as a script (the postbuild step); the parity test imports the
// route list without writing anything.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
