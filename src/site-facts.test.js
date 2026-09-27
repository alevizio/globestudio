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
});
