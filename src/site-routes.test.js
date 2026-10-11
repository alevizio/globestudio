// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSitemap, sitemapEntries } from "../scripts/generate-sitemap.js";
import { notFoundHtml, pageRoutes, shellRoutes } from "../scripts/prerender.js";
import { comparisonSlugs } from "./data/comparisons.js";
import { lookPresets } from "./data/look-presets.js";
import { APP_UNLOCK_PATH, PAGES, matchRoute } from "./utils/route-match.js";

// vercel.json has no catch-all rewrite, so a page only exists on Vercel if
// prerender.js writes a file for it. These keep the three route lists (the
// sitemap, the prerendered files and the router) from drifting: a page in
// the router but not prerendered is a 404 in production, and a prerendered
// page the router doesn't know renders NotFoundPage over a 200.

const SITE = "https://globestudio.app";
const sitemapPaths = sitemapEntries().map(({ loc }) => loc.slice(SITE.length)).sort();
// dist/index.html is "/" itself, so it isn't in the route list.
const prerenderedPaths = ["/", ...pageRoutes().map(({ route }) => `/${route}`)].sort();
const shellPaths = shellRoutes.map((route) => `/${route}`);

describe("site routes", () => {
  it("prerenders exactly the pages in the sitemap", () => {
    expect(prerenderedPaths).toEqual(sitemapPaths);
  });

  it("routes every sitemap page to a real page", () => {
    for (const path of sitemapPaths) {
      const route = matchRoute(path);
      expect(route.page, path).not.toBe("not-found");
      if (route.page === "compare") expect(comparisonSlugs, path).toContain(route.slug);
    }
  });

  it("gives every page the router serves a file", () => {
    for (const page of PAGES) expect(prerenderedPaths, page).toContain(`/${page}`);
    for (const slug of comparisonSlugs) {
      expect(prerenderedPaths).toContain(`/compare/${slug}`);
      expect(matchRoute(`/compare/${slug}`), slug).toEqual({ page: "compare", slug });
    }
    // The client-only routes get the app shell instead.
    expect(matchRoute("/embed").page).toBe("embed");
    expect(shellPaths).toEqual(["/embed", APP_UNLOCK_PATH]);
  });

  it("writes a noindexed 404 page with no canonical", () => {
    const html = notFoundHtml(readFileSync(new URL("../index.html", import.meta.url), "utf8"));
    expect(html).toContain("<title>Not found · Globestudio</title>");
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).not.toMatch(/rel="canonical"/);
    expect(html).not.toMatch(/property="og:url"/);
  });
});

describe("sitemap dates", () => {
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const lastmod = Object.fromEntries(sitemapEntries().map((entry) => [entry.loc.slice(SITE.length), entry.lastmod]));
  // "2026-10-05" the way the pages write it: "5 October 2026".
  const inWords = (day) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  it("gives every page a real day that isn't in the future", () => {
    // Today where the day starts first (UTC+14), so a page dated today
    // passes in every time zone.
    const today = new Date(Date.now() + 14 * 60 * 60 * 1000).toJSON().slice(0, 10);
    for (const [path, day] of Object.entries(lastmod)) {
      expect(day, path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // A day that doesn't exist, like 2026-02-30, rolls over to another.
      expect(new Date(`${day}T00:00:00Z`).toJSON()?.slice(0, 10), path).toBe(day);
      expect(day <= today, `${path} is dated ${day}`).toBe(true);
    }
  });

  it("dates the studio pages by the release package.json names", () => {
    const { version } = JSON.parse(read("package.json"));
    const released = read("CHANGELOG.md").match(new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\] - (\\S+)$`, "m"))[1];
    for (const path of ["/", "/gallery", ...lookPresets.map((preset) => `/looks/${preset.id}`)]) {
      expect(lastmod[path], path).toBe(released);
    }
  });

  it("dates /changelog by its newest entry and /terms by its Last updated line", () => {
    expect(read("src/components/changelog-page.jsx").match(/date: "([^"]+)"/)[1]).toBe(inWords(lastmod["/changelog"]));
    expect(read("src/components/terms-page.jsx").replace(/\s+/g, " ")).toContain(`Last updated ${inWords(lastmod["/terms"])}.`);
  });

  it("writes each page's date into sitemap.xml", () => {
    const { xml, count } = buildSitemap();
    const written = [...xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)];
    expect(written).toHaveLength(count);
    for (const [, loc, day] of written) expect(day, loc).toBe(lastmod[loc.slice(SITE.length)]);
  });
});
