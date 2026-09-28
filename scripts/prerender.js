// Prerender per-route static HTML for SEO + social/AI cards.
//
// The app is a client-rendered SPA, so every route otherwise ships the same
// generic <head> (social scrapers + AI crawlers don't run JS, so they'd see
// identical title/description/og:image everywhere). This clones the built
// dist/index.html into a per-route file with route-specific <head> meta
// injected, so /looks/:id, /compare/:slug, /gallery, and the static pages
// (/docs, /integrations, /examples, /brand, /changelog, /privacy) get unique,
// rich cards — and, critically, self-referencing canonicals. Each file's
// <div id="root"> also gets the page's content as static HTML
// (scripts/static-bodies.jsx), hidden for visitors with JS and replaced by
// React on mount, so crawlers that don't run JS read more than a noscript
// blurb.
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
import { breadcrumbLd, lookBreadcrumb } from "../src/utils/preset-route.js";
import { APP_UNLOCK_PATH } from "../src/utils/route-match.js";

const dir = dirname(fileURLToPath(import.meta.url));
// PRERENDER_DIST_DIR lets the build test prerender a throwaway build.
const distDir = resolve(process.env.PRERENDER_DIST_DIR ?? resolve(dir, "../dist"));
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
      // The same list preset-route.js writes on client navigation.
      breadcrumb: lookBreadcrumb(preset),
    });
  }

  // Home > this page, for every page that isn't a look.
  const crumbs = (name, url) =>
    breadcrumbLd([
      { name: "Home", item: `${SITE}/` },
      { name, item: url },
    ]);

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
      // Rendered visibly by ComparePage, so it's marked up here, in the
      // static head, where crawlers that don't run JS see it too.
      faq: c.faq,
      breadcrumb: crumbs(`Globestudio vs ${c.competitor}`, `${SITE}/compare/${c.slug}`),
    });
  }

  routes.push({
    route: "gallery",
    title: "Looks gallery: dotted map & 3D globe styles · Globestudio",
    description: `Browse all ${lookPresets.length} Globestudio looks. Open one to make a dotted map or animated 3D globe, then export PNG, SVG, WebM, MP4, GIF, JSON or an embed. Free, open source.`,
    url: `${SITE}/gallery`,
    image: null,
    // The gallery lists every look, so it keeps the home ItemList of looks.
    itemList: true,
    breadcrumb: crumbs("Looks", `${SITE}/gallery`),
  });

  // Static pages. These are all in the sitemap, but without a prerendered file
  // they serve the shared index.html — whose canonical points at the homepage —
  // so search engines treated all six as duplicates of "/" and skipped them.
  // Self-canonicals (plus each page's real title/description, mirrored from the
  // client-side meta in src/components/*-page.jsx) make them indexable.
  const staticRoutes = [
    {
      route: "docs",
      crumb: "Docs",
      title: "Docs · Globestudio",
      description:
        "Globestudio documentation: embed snippet, shareable config URLs, keyboard shortcuts, preset catalog, JSON schema.",
    },
    {
      route: "integrations",
      crumb: "Integrations",
      title: "Integrations · Globestudio",
      description:
        "Add Globestudio to Webflow, Framer, Figma, Notion, WordPress, plain HTML, React or an MCP client like Claude. Copy-paste setup for each.",
    },
    {
      route: "examples",
      crumb: "Examples",
      title: "Examples · Globestudio",
      description:
        "Globestudio in product marketing: four full-screen hero showcases, from Stripe and Vercel style heroes to a retro game screen and a newspaper front page.",
    },
    {
      route: "brand",
      crumb: "Press kit",
      title: "Brand · Globestudio",
      description:
        "Globestudio press kit: logo, OG cards, color palette, taglines. Free to use for editorial coverage.",
    },
    {
      route: "changelog",
      crumb: "Changelog",
      title: "Changelog · Globestudio",
      description:
        "Recent shipped work in Globestudio: new presets, polish, infrastructure, and first-visit experience.",
    },
    {
      route: "privacy",
      crumb: "Privacy",
      title: "Privacy · Globestudio",
      description:
        "What Globestudio does and doesn't collect. Cookieless analytics, no fingerprinting, no third-party advertisers.",
    },
  ];

  for (const { route, crumb, title, description } of staticRoutes) {
    const url = `${SITE}/${route}`;
    routes.push({ route, title, description, url, image: null, breadcrumb: crumbs(crumb, url) });
  }

  return routes;
};

// Pages the router renders client-side only. They get the app shell as is:
// /embed keeps the exact bytes an embed iframe loaded before, and the unlock
// path is swapped for "/" by App.jsx on load.
export const shellRoutes = ["embed", APP_UNLOCK_PATH.slice(1)];

const NOINDEX = '    <meta name="robots" content="noindex, nofollow" />\n  </head>';

// Rewrites the template's JSON-LD @graph for one page. The site-wide nodes
// (WebSite, SoftwareApplication, SoftwareSourceCode, Person) stay on every
// page. The ItemList of looks describes the home page's content, so only the
// gallery, which shows the same list, keeps it. Compare pages add a FAQPage
// for the FAQ they render.
const LD_JSON = /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/;

const editGraph = (html, { url, itemList, faq }) =>
  html.replace(LD_JSON, (_, open, json, close) => {
    const data = JSON.parse(json);
    const graph = data["@graph"].filter((node) => itemList || node["@type"] !== "ItemList");
    if (faq) {
      graph.push({
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: faq.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      });
    }
    const out = JSON.stringify({ ...data, "@graph": graph }).replace(/<\//g, "<\\/");
    return `${open}${out}${close}`;
  });

// One page's HTML from the built template. Returns [html, misses], where
// misses counts head tags the template didn't have.
export const renderPage = (template, meta, { teaser = TEASER } = {}) => {
  let [html, misses] = buildHead(template, meta);
  html = editGraph(html, meta);
  // Its own script with the id preset-route.js looks for, so client
  // navigation between looks updates this one instead of adding a second.
  const breadcrumb = JSON.stringify(meta.breadcrumb).replace(/<\//g, "<\\/");
  html = html.replace(
    "</head>",
    `    <script type="application/ld+json" id="breadcrumb-ld">${breadcrumb}</script>\n  </head>`,
  );
  if (teaser) html = html.replace("</head>", NOINDEX);
  return [html, misses];
};

// The static body is for crawlers and visitors without JS. With JS, a head
// script flags <html data-js> before the body parses, so the block never
// paints, and React's first render replaces everything in #root: no flash,
// no layout shift. Without JS the canvas app's scroll lock is lifted so the
// text can be read. The noscript notice stays, minus the old blurb's H1.
const STATIC_HEAD = `    <script>document.documentElement.setAttribute("data-js", "")</script>
    <style>
      html[data-js] #gs-static { display: none; }
      html:not([data-js]) body { overflow: auto; }
      #gs-static { max-width: 760px; margin: 0 auto; padding: 32px 20px; font: 16px/1.6 system-ui, -apple-system, sans-serif; }
      #gs-static a { color: inherit; }
      #gs-static .preset-detail { margin-top: 0; }
    </style>
  </head>`;

const NOSCRIPT_NOTICE =
  '<noscript><p>JavaScript is required to render the interactive globe and map. Please enable JavaScript and reload, or visit <a href="https://github.com/alevizio/globestudio">the GitHub repo</a> for source, screenshots, and contribution docs.</p></noscript>';

const ROOT = /<div id="root">[\s\S]*?<\/noscript>\s*<\/div>/;

export const injectStaticBody = (html, body) => {
  if (html.includes('id="gs-static"')) {
    throw new Error("prerender: dist/index.html already has a static body. Run `vite build` first.");
  }
  if (!ROOT.test(html)) throw new Error("prerender: no <div id=\"root\"> with a noscript in the template.");
  return html
    .replace(ROOT, () => `<div id="root"><div id="gs-static">${body}${NOSCRIPT_NOTICE}</div></div>`)
    .replace("</head>", STATIC_HEAD);
};

// The home JSON-LD's featureList: the home static body lists it.
const homeFacts = (template) =>
  JSON.parse(template.match(LD_JSON)[2])["@graph"].find((node) => node["@type"] === "SoftwareApplication")
    ?.featureList ?? [];

// Loads scripts/static-bodies.jsx through Vite, which compiles the JSX and
// the components' CSS imports, and returns its renderStaticBody.
const loadStaticBodies = async () => {
  const { createServer } = await import("vite");
  const server = await createServer({
    root: resolve(dir, ".."),
    appType: "custom",
    logLevel: "error",
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    const { renderStaticBody } = await server.ssrLoadModule("/scripts/static-bodies.jsx");
    return { renderStaticBody, close: () => server.close() };
  } catch (error) {
    await server.close();
    throw error;
  }
};

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

const main = async () => {
  let template;
  try {
    template = readFileSync(resolve(distDir, "index.html"), "utf8");
  } catch {
    console.error("prerender: dist/index.html not found — run after `vite build`.");
    process.exit(0);
  }

  // Teaser builds render the waitlist on every route, so there is no page
  // content to prerender: they keep the template body as it was.
  const bodies = TEASER ? null : await loadStaticBodies();
  const withBody = (html, route, options) =>
    bodies ? injectStaticBody(html, bodies.renderStaticBody(route, options)) : html;

  let totalMisses = 0;
  const routes = pageRoutes({
    cardExists: (id) => existsSync(resolve(distDir, "og", `${id}.png`)),
  });
  try {
    for (const meta of routes) {
      const [html, misses] = renderPage(template, meta);
      writeFile(meta.route, withBody(html, meta.route));
      totalMisses += misses;
    }

    // The shells keep the template exactly as built.
    for (const route of shellRoutes) writeFile(route, template);
    writeFileSync(resolve(distDir, "404.html"), withBody(notFoundHtml(template), "404"));
    writeFileSync(
      resolve(distDir, "index.html"),
      withBody(template, "", { facts: homeFacts(template) }),
    );
  } finally {
    await bodies?.close();
  }

  if (totalMisses > 0) {
    console.warn(
      `⚠ prerender: ${totalMisses} <head> tag(s) didn't match the template — those routes kept default meta. Check index.html tag formatting.`,
    );
  }
  console.log(
    `✓ Prerendered ${routes.length} routes with per-route meta${bodies ? " and static bodies" : ""} → dist/{looks,compare,gallery,static pages}/, plus ${shellRoutes.length} app shells and 404.html`,
  );
};

// Run only as a script (the postbuild step); the parity test imports the
// route list without writing anything.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
