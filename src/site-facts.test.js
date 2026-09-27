import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { injectSiteFacts } from "../scripts/site-facts.js";
import { lookPresets } from "./data/look-presets.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(repoRoot, path), "utf8");

// index.html as the build serves it: the site-facts Vite plugin runs
// injectSiteFacts over the source file.
const html = injectSiteFacts(read("index.html"));
const jsonLd = JSON.parse(
  html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1],
);
const graphNode = (type) => jsonLd["@graph"].find((node) => node["@type"] === type);
const metaContent = (attr, name) =>
  html.match(new RegExp(`<meta\\s+${attr}="${name}"\\s+content="([^"]*)"`))[1];
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
