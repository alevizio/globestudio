// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sitemapEntries } from "../scripts/generate-sitemap.js";
import { notFoundHtml, pageRoutes, shellRoutes } from "../scripts/prerender.js";
import { comparisonSlugs } from "./data/comparisons.js";
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
