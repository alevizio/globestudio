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
  const spaRewrite = toRegExp(
    vercelConfig.rewrites.find(({ destination }) => destination === "/index.html").source,
  );

  it("serves the SPA shell for app routes", () => {
    for (const path of ["/", "/looks/halftone", "/compare/cobe", "/gallery", "/embed"]) {
      expect(spaRewrite.test(path), path).toBe(true);
    }
  });

  it("lets missing chunks, data files and API routes 404 instead of returning index.html", () => {
    // A tab opened before a deploy asks for chunk hashes that no longer
    // exist; an HTML 200 there breaks the lazy import instead of letting
    // the vite:preloadError reload recover.
    for (const path of ["/assets/index-deadbeef.js", "/data/world-cities.json", "/api/subscribe"]) {
      expect(spaRewrite.test(path), path).toBe(false);
    }
  });

  it("caches content-hashed assets for a year", () => {
    expect(headersFor("/assets/index-deadbeef.js")).toContainEqual({
      key: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    });
  });
});
