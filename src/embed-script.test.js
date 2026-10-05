import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { buildShareUrl, parseShareConfig } from "./utils/share-config.js";

// public/embed.js, the one-line script loader, run on a page as a site runs
// it: a div with data-* attributes, then the script.
const SOURCE = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../public/embed.js"), "utf8");
const SITE = "https://globestudio.app";

const embedSrc = (attributes) => {
  const div = document.createElement("div");
  div.setAttribute("data-globestudio", "");
  for (const [name, value] of Object.entries(attributes)) div.setAttribute(`data-${name}`, value);
  document.body.append(div);
  const script = document.createElement("script");
  script.textContent = SOURCE;
  document.body.append(script);
  return div.querySelector("iframe").src;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("embed.js data-config", () => {
  // "&" and "%" in a value, so a token cut at the wrong place shows.
  const DESIGN = { selection: "country:JPN", density: 62, asciiSymbol: "&%?#" };
  const SHARE_URL = buildShareUrl(DESIGN, SITE);
  // The token as it reads in the link, still URL encoded.
  const TOKEN = SHARE_URL.split("?c=")[1].split("&")[0];
  const DECODED = parseShareConfig(new URL(SHARE_URL).search);
  const configOf = (value) => parseShareConfig(new URL(embedSrc({ config: value })).search);

  it("opens the design from the token alone, or with ?c= or c= before it", () => {
    expect(DECODED).toMatchObject(DESIGN);
    for (const value of [TOKEN, `?c=${TOKEN}`, `c=${TOKEN}`, `${SITE}/?c=${TOKEN}`]) {
      expect(configOf(value), value).toEqual(DECODED);
    }
  });

  it("opens the design from a whole share link with more after the token", () => {
    // Links the MCP server built ended in &app=1, the old teaser bypass.
    for (const value of [
      `${SITE}/looks/halftone?c=${TOKEN}&app=1`,
      `?c=${TOKEN}&app=1`,
      `c=${TOKEN}&app=1`,
      `${SITE}/?c=${TOKEN}&utm_source=newsletter#top`,
      `${SITE}/embed?look=halftone&c=${TOKEN}&theme=light`,
    ]) {
      expect(configOf(value), value).toEqual(DECODED);
    }
  });

  it("passes a JSON config through as written, even one holding a ? and c=", () => {
    const svgSource = `<?xml version="1.0"?><svg viewBox="0 0 10 10"><image href="https://example.com/a.png?w=1&c=2"/></svg>`;
    const json = JSON.stringify({ v: 2, shape: "Custom", customShape: { name: "Pin", type: "image/svg+xml", dataUrl: "data:image/svg+xml,x", svgSource } });
    expect(new URL(embedSrc({ config: json })).searchParams.get("c")).toBe(json);
    expect(configOf(json)).toEqual(parseShareConfig(`?c=${encodeURIComponent(json)}`));
    expect(configOf(json).customShape.svgSource).toBe(svgSource);
  });

  it("keeps the other attributes the loader sends", () => {
    const url = new URL(embedSrc({ look: "aurora", config: `${SITE}/?c=${TOKEN}&app=1` }));
    expect(url.origin + url.pathname).toBe(`${SITE}/embed`);
    expect(url.searchParams.get("look")).toBe("aurora");
    expect(url.searchParams.get("source")).toBe("script-embed");
    expect(url.searchParams.has("app")).toBe(false);
  });
});
