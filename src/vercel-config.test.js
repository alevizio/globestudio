import { describe, expect, it } from "vitest";
import vercelConfig from "../vercel.json";

// vercel.json `source` values are path-to-regexp strings. The ones used here
// are plain regex groups, so anchoring them matches the same paths.
const toRegExp = (source) => new RegExp(`^${source}$`);

const headersFor = (path) =>
  vercelConfig.headers
    .filter(({ source }) => toRegExp(source).test(path))
    .flatMap(({ headers }) => headers);

describe("vercel.json", () => {
  const rewrites = (vercelConfig.rewrites ?? []).map(({ source }) => toRegExp(source));

  it("has no catch-all rewrite, so unknown paths get 404.html with a 404 status", () => {
    // Every page is a prerendered file (site-routes.test.js checks that), so
    // a rewrite to index.html would only turn missing URLs into 200 copies of
    // the home page. A tab opened before a deploy also asks for chunk hashes
    // that no longer exist; an HTML 200 there breaks the lazy import instead
    // of letting the vite:preloadError reload recover.
    for (const path of [
      "/nope",
      "/looks/nope",
      "/compare/nope",
      "/assets/index-deadbeef.js",
      "/data/world-cities.json",
      "/api/subscribe",
    ]) {
      expect(rewrites.some((source) => source.test(path)), path).toBe(false);
    }
  });

  it("redirects trailing-slash URLs to the canonical slashless form", () => {
    // Every canonical and sitemap URL has no trailing slash; without this
    // /docs/ and /looks/halftone/ answer 200 as duplicates.
    expect(vercelConfig.trailingSlash).toBe(false);
  });

  it("caches content-hashed assets for a year", () => {
    expect(headersFor("/assets/index-deadbeef.js")).toContainEqual({
      key: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    });
  });

  it("keeps /embed out of the index for crawlers that don't run JS", () => {
    // embed-view.jsx adds a robots meta only after hydration, and the raw
    // HTML canonicals to "/", so the header is the only signal non-JS
    // crawlers see.
    expect(headersFor("/embed")).toContainEqual({ key: "X-Robots-Tag", value: "noindex" });
    expect(headersFor("/looks/halftone")).not.toContainEqual(
      expect.objectContaining({ key: "X-Robots-Tag" }),
    );
  });
});
