import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { injectSiteFacts } from "../scripts/site-facts.js";
import { lookPresets } from "./data/look-presets.js";
import { PRODUCT_CARD_ALT, TEASER_CARD_ALT, shareCardUrl, swapInTeaserCard } from "./data/share-cards.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(repoRoot, path), "utf8");

// index.html as the build serves it: the site-facts Vite plugin runs
// injectSiteFacts over the source file.
const html = injectSiteFacts(read("index.html"));
const jsonLd = JSON.parse(
  html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1],
);
const graphNode = (type) => jsonLd["@graph"].find((node) => node["@type"] === type);
const metaIn = (source, attr, name) =>
  source.match(new RegExp(`<meta\\s+${attr}="${name}"\\s+content="([^"]*)"`))[1];
const metaContent = (attr, name) => metaIn(html, attr, name);
const noscriptText = html.match(/<noscript>([\s\S]*?)<\/noscript>/)[1].replace(/\s+/g, " ");
const manifest = JSON.parse(read("public/manifest.webmanifest"));

// The one set of product facts every public surface states.
const FORMATS = ["PNG", "SVG", "WebM", "MP4", "GIF", "JSON", "embed"];
const LOOKS = `${lookPresets.length} looks`;

describe("index.html site facts", () => {
  it("fills every placeholder", () => {
    expect(html).not.toMatch(/__GS_/);
  });

  it("lists every look in the JSON-LD ItemList", () => {
    const list = graphNode("ItemList");
    // schema.org only defines the ItemListOrderType URLs, not bare words.
    expect(list.itemListOrder).toBe("https://schema.org/ItemListUnordered");
    expect(list.numberOfItems).toBe(lookPresets.length);
    expect(list.itemListElement).toEqual(
      lookPresets.map((preset, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `https://globestudio.app/looks/${preset.id}`,
        name: preset.name,
      })),
    );
  });

  it("keeps the meta description short enough for a search snippet", () => {
    expect(metaContent("name", "description").length).toBeLessThanOrEqual(155);
  });

  it.each([
    ["meta description", () => metaContent("name", "description")],
    ["twitter:description", () => metaContent("name", "twitter:description")],
    ["noscript", () => noscriptText],
    ["manifest", () => manifest.description],
  ])("%s names every export format and the look count", (_, text) => {
    for (const fact of [...FORMATS, LOOKS]) expect(text()).toContain(fact);
  });

  it("drops the stale claims", () => {
    const app = graphNode("SoftwareApplication");
    expect(app.featureList).toContain(`${lookPresets.length} named looks with shareable URLs`);
    for (const text of [html, JSON.stringify(manifest)]) {
      expect(text).not.toMatch(/10\+ named presets|on the roadmap|PNG, SVG, or (animated )?WebM|PNG \/ SVG \/ WebM exports/);
    }
  });
});

describe.each(["public/llms.txt", "public/llms-full.txt"])("%s", (path) => {
  // Unwrap the blockquote lines so a phrase can span a line break.
  const text = read(path).replace(/\n>?\s*/g, " ");

  it("states the look count and scopes the projections claim", () => {
    // "looks", not "shader looks": Default has no shader effect.
    expect(text).toContain(`${lookPresets.length} looks`);
    expect(text).not.toMatch(/shader looks/);
    expect(text).toContain("5 flat projections for solid maps (dotted maps use Mercator)");
    expect(text).not.toMatch(/5 projections/);
  });

  it("uses no em dashes as punctuation", () => {
    expect(text).not.toContain("—");
  });

  it("names every export format", () => {
    for (const format of ["PNG", "SVG", "WebM", "MP4", "GIF", "JSON"]) expect(text).toContain(format);
  });

  it("points React users at the npm package", () => {
    expect(text).toContain("npm i @globestudio/react");
  });
});

describe("share cards", () => {
  // Width and height sit in the PNG IHDR chunk, right after the signature.
  const dimensions = (png) => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });

  // WhatsApp and some other unfurlers are reported to drop og:images over
  // ~300 KB. og/default.png doubles as the Default look's card.
  it.each(lookPresets.map((preset) => preset.id))("og/%s.png is 1200x630 and under 300 KB", (id) => {
    const png = readFileSync(resolve(repoRoot, "public/og", `${id}.png`));
    expect(dimensions(png)).toEqual({ width: 1200, height: 630 });
    expect(png.length).toBeLessThan(300_000);
  });

  it("points the home card at the cache-busted URL", () => {
    const card = "https://globestudio.app/og/default.png?v=2";
    // prerender.js and the client meta rewrites build card URLs from the
    // same OG_VERSION, so index.html must match it.
    expect(shareCardUrl("default")).toBe(card);
    expect(metaContent("property", "og:image")).toBe(card);
    expect(metaContent("name", "twitter:image")).toBe(card);
    expect(graphNode("SoftwareApplication").image).toBe(card);
  });

  it("describes the product card in both alt tags", () => {
    expect(metaContent("property", "og:image:alt")).toBe(PRODUCT_CARD_ALT);
    expect(metaContent("name", "twitter:image:alt")).toBe(PRODUCT_CARD_ALT);
  });

  it("swaps the alt text along with the image in teaser builds", () => {
    const teaser = swapInTeaserCard(html);
    const card = "https://globestudio.app/og/teaser.png?v=2";
    expect(metaIn(teaser, "property", "og:image")).toBe(card);
    expect(metaIn(teaser, "name", "twitter:image")).toBe(card);
    expect(metaIn(teaser, "property", "og:image:alt")).toBe(TEASER_CARD_ALT);
    expect(metaIn(teaser, "name", "twitter:image:alt")).toBe(TEASER_CARD_ALT);
    expect(teaser).not.toContain("og/default.png");
    expect(teaser).not.toContain(PRODUCT_CARD_ALT);
  });
});

describe("icons", () => {
  // Crawlers, link unfurlers and iOS request these paths even when no tag
  // links them; without the files those requests 404.
  it("ships favicon.ico and a 180px apple-touch-icon, and links both", () => {
    const ico = readFileSync(resolve(repoRoot, "public/favicon.ico"));
    expect(ico.readUInt16LE(2)).toBe(1); // ICO resource type
    const touch = readFileSync(resolve(repoRoot, "public/apple-touch-icon.png"));
    expect([touch.readUInt32BE(16), touch.readUInt32BE(20)]).toEqual([180, 180]);
    expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="32x32" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
  });
});
