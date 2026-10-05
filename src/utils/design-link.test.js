import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { lookPresets } from "../data/look-presets.js";
import { lookFromPath } from "../hooks/use-route-look.js";
import { readDesignLink } from "./design-link.js";
import { buildShareUrl, normalizeConfig, parseShareConfig } from "./share-config.js";

const SITE = "https://globestudio.app";
const halftone = lookPresets.find((preset) => preset.id === "halftone");
const aurora = lookPresets.find((preset) => preset.id === "aurora");
const design = { selection: "country:FRA", density: 70, dotColor: "#ff0044" };
// A link the way the studio's Share tab makes one.
const shared = buildShareUrl(design, SITE);
const token = new URL(shared).searchParams.get("c");

describe("readDesignLink", () => {
  it("reads a studio share link", () => {
    const link = readDesignLink(shared);
    expect(link.look).toBeUndefined();
    expect(link.config).toMatchObject(design);
  });

  it("ignores &app=1 and any other params", () => {
    for (const extra of ["&app=1", "&plugin=figma&app=1", "&utm_source=slack#top"]) {
      expect(readDesignLink(`${shared}${extra}`)?.config, extra).toMatchObject(design);
    }
    expect(readDesignLink(`${SITE}/?app=1&c=${encodeURIComponent(token)}`)?.config).toMatchObject(design);
  });

  it("reads a look link, with and without a design", () => {
    expect(readDesignLink(`${SITE}/looks/halftone`)).toEqual({ look: halftone, config: null });
    expect(readDesignLink(`${SITE}/looks/halftone/`)?.look).toBe(halftone);
    const link = readDesignLink(`${SITE}/looks/halftone?c=${encodeURIComponent(token)}`);
    expect(link.look).toBe(halftone);
    expect(link.config).toMatchObject(design);
  });

  it("fills a partial design from the look it opens on, as opening the link does", () => {
    const partial = encodeURIComponent(JSON.stringify({ shaderSettings: { intensity: 20 } }));
    const link = readDesignLink(`${SITE}/looks/halftone?c=${partial}`);
    expect(link.config.shaderSettings).toEqual({ ...halftone.settings.shaderSettings, intensity: 20 });
    expect(link.config).toEqual(parseShareConfig(`?c=${partial}`, halftone.settings));
  });

  it("reads an embed link's look and design", () => {
    const link = readDesignLink(`${SITE}/embed?look=aurora&c=${encodeURIComponent(token)}&theme=light`);
    expect(link.look).toBe(aurora);
    expect(link.config).toMatchObject(design);
    expect(readDesignLink(`${SITE}/embed?look=aurora`)).toEqual({ look: aurora, config: null });
    expect(readDesignLink(`${SITE}/embed?c=${encodeURIComponent(token)}`)?.config).toMatchObject(design);
  });

  it("reads the design an embed link keeps in its own params, under ?c=", () => {
    // The embed example in the docs (public/llms.txt).
    expect(readDesignLink(`${SITE}/embed?look=halftone&density=50&selection=continent:Europe&autoSpin=1`)).toEqual({
      look: halftone,
      config: normalizeConfig({ selection: "continent:Europe", density: 50, globeSettings: { autoSpin: true } }, halftone.settings),
    });
    // An embed link the MCP server writes: params for the region, colors and
    // view, and ?c= for the rest.
    const mcp = readDesignLink(
      `${SITE}/embed?look=aurora&selection=country%3AJPN&dotColor=ff0044&background=101010&view=flat&c=${encodeURIComponent(JSON.stringify({ v: 2, shape: "Ring" }))}`,
    );
    expect(mcp.look).toBe(aurora);
    expect(mcp.config).toMatchObject({ selection: "country:JPN", dotColor: "#ff0044", background: "#101010", transparent: false, viewMode: "flat", shape: "Ring" });
    // ?c= wins over a param, and the view param over ?c=, as in the embed.
    const both = readDesignLink(
      `${SITE}/embed?selection=country:FRA&view=globe&c=${encodeURIComponent(JSON.stringify({ selection: "country:JPN", viewMode: "flat" }))}`,
    );
    expect(both.config).toMatchObject({ selection: "country:JPN", viewMode: "globe" });
  });

  it("keeps embed params to the embed's ranges and leaves its display options out", () => {
    expect(readDesignLink(`${SITE}/embed?look=halftone&density=500&dotSize=-3&tiltX=90&tiltY=x&background=transparent`).config).toEqual(
      normalizeConfig({ density: 90, tiltX: 45, transparent: true }, halftone.settings),
    );
    expect(readDesignLink(`${SITE}/embed?look=halftone&theme=light&static=1&source=react&motion=10`)).toEqual({ look: halftone, config: null });
    expect(readDesignLink(`${SITE}/embed?selection=nowhere&renderMode=lasers&dotColor=zz`)).toEqual({ look: undefined, config: null });
  });

  it("accepts the www, vercel.app and preview hosts", () => {
    for (const host of [
      "www.globestudio.app",
      "globestudio.vercel.app",
      "globestudio-git-feat-paste-alevizio.vercel.app",
      "globestudio-4f2a9c1d-alevizio.vercel.app",
    ]) {
      expect(readDesignLink(`https://${host}/looks/halftone`)?.look, host).toBe(halftone);
    }
  });

  it("accepts a link with surrounding space, over http, or without its scheme", () => {
    expect(readDesignLink(`  ${shared}\n`)?.config).toMatchObject(design);
    expect(readDesignLink(`http://globestudio.app/looks/halftone`)?.look).toBe(halftone);
    expect(readDesignLink(`globestudio.app/looks/halftone`)?.look).toBe(halftone);
    expect(readDesignLink(`HTTPS://GLOBESTUDIO.APP/looks/halftone`)?.look).toBe(halftone);
  });

  it("accepts the page's own host, for local and preview builds", () => {
    expect(readDesignLink("http://127.0.0.1:5202/looks/halftone", "127.0.0.1:5202")?.look).toBe(halftone);
    expect(readDesignLink("http://127.0.0.1:5202/looks/halftone", "127.0.0.1:5173")).toBeNull();
  });

  it("finds no design in a link of ours that carries none", () => {
    for (const link of [
      SITE,
      `${SITE}/`,
      `${SITE}/?app=1`,
      `${SITE}/?c=not-json`,
      `${SITE}/?c=${encodeURIComponent("[1,2]")}`,
      `${SITE}/looks/nope`,
      `${SITE}/looks/nope?c=${encodeURIComponent(token)}`,
      `${SITE}/embed?look=nope`,
      `${SITE}/docs?c=${encodeURIComponent(token)}`,
      `${SITE}/gallery`,
    ]) {
      expect(readDesignLink(link), link).toEqual({ look: undefined, config: null });
    }
  });

  it("ignores other hosts", () => {
    for (const link of [
      `https://example.com/?c=${encodeURIComponent(token)}`,
      `https://globestudio.app.example.com/looks/halftone`,
      `https://notglobestudio.app/looks/halftone`,
      `https://evil.globestudio.app/looks/halftone`,
      `https://globestudio.app@example.com/looks/halftone`,
      `https://notglobestudio.vercel.app/looks/halftone`,
      `https://globestudio.vercel.app.example.com/looks/halftone`,
      `https://www.figma.com/community/plugin/1641603648370488902/globestudio`,
    ]) {
      expect(readDesignLink(link), link).toBeNull();
    }
  });

  it("ignores other schemes and text that isn't one link", () => {
    for (const text of [
      "",
      "   ",
      "hello",
      "Halftone",
      "javascript:alert(1)",
      "data:text/html,<p>globestudio.app</p>",
      "ftp://globestudio.app/looks/halftone",
      `see ${SITE}/looks/halftone`,
      JSON.stringify(design),
      "#ff0044",
    ]) {
      expect(readDesignLink(text), text).toBeNull();
    }
    for (const value of [undefined, null, 42, {}, ["https://globestudio.app/"]]) {
      expect(readDesignLink(value)).toBeNull();
    }
  });

  // Every link format the app has ever made reads as the studio reads it on
  // load: parseShareConfig over the look the path opens on.
  const fixtures = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/legacy-share-links.json");
  const { links } = JSON.parse(readFileSync(fixtures, "utf8"));
  it.each(links.filter(({ url }) => url.startsWith(SITE)).map(({ name, url }) => [name, url]))(
    "reads the %s link as the studio opens it",
    (_, url) => {
      const { pathname, search, searchParams } = new URL(url);
      const look = lookFromPath(pathname) ?? lookPresets.find((preset) => preset.id === searchParams.get("look"));
      expect(readDesignLink(url)).toEqual({ look, config: parseShareConfig(search, look?.settings) });
    },
  );
});
