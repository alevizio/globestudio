import { describe, expect, it } from "vitest";
import vercelConfig from "../vercel.json";
import { RETIRED_LOOKS } from "./utils/route-match.js";

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

  it("sends the retired Print look to Halftone, which replaced it", () => {
    expect(vercelConfig.redirects).toContainEqual({
      source: "/looks/print",
      destination: "/looks/halftone",
      permanent: true,
    });
  });

  it("sends the retired Particles and ASCII looks to the gallery, like the router", () => {
    // Neither has a replacement look, so the gallery of current ones is the
    // closest page. The router mirrors these (RETIRED_LOOKS) for hosts
    // without vercel.json; other unknown look ids stay a 404.
    expect(Object.keys(RETIRED_LOOKS).sort()).toEqual(["ascii", "particles"]);
    for (const [id, destination] of Object.entries(RETIRED_LOOKS)) {
      expect(vercelConfig.redirects).toContainEqual({
        source: `/looks/${id}`,
        destination,
        permanent: true,
      });
    }
    const pathRedirects = vercelConfig.redirects
      .filter(({ has }) => !has)
      .map(({ source }) => toRegExp(source));
    expect(pathRedirects.some((source) => source.test("/looks/nope"))).toBe(false);
  });

  it("sends the production vercel.app alias to the apex domain", () => {
    // Vercel adds noindex to preview URLs but not to this alias, so without
    // the redirect it serves a full, indexable copy of the site. Preview
    // hosts (globestudio-git-*.vercel.app) don't match the host condition.
    // "/:path(.*)", not "/:path*": Vercel compiles "/:path*" to
    // ^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?$, which doesn't match "/", so the
    // alias's home page would stay a 200 copy of the site.
    expect(vercelConfig.redirects).toContainEqual({
      source: "/:path(.*)",
      has: [{ type: "host", value: "globestudio.vercel.app" }],
      destination: "https://globestudio.app/:path",
      permanent: true,
    });
  });

  it("caches content-hashed assets for a year", () => {
    expect(headersFor("/assets/index-deadbeef.js")).toContainEqual({
      key: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    });
  });

  it("lets unhashed data files update within a day", () => {
    // /data/world-cities.json and world-rivers.json are fetched by fixed
    // URL, so "immutable" would pin a stale copy for a year.
    expect(headersFor("/data/world-cities.json")).toContainEqual({
      key: "Cache-Control",
      value: "public, max-age=86400, stale-while-revalidate=604800",
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
