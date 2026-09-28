import { describe, expect, it } from "vitest";
import { lookPresets } from "../data/look-presets.js";
import { matchRoute } from "./route-match.js";

describe("matchRoute", () => {
  it("serves every look id as a look page", () => {
    for (const { id } of lookPresets) {
      expect(matchRoute(`/looks/${id}`), id).toEqual({ page: "look", id });
    }
  });

  it("sends unknown look ids to the 404 page", () => {
    // /looks/print was in an old sitemap; vercel.json sends it to Halftone.
    for (const path of ["/looks/nope", "/looks/print", "/looks/Halftone", "/looks/Particles", "/looks/constructor", "/looks"]) {
      expect(matchRoute(path).page, path).toBe("not-found");
    }
  });

  it("sends the retired Particles and ASCII looks to the gallery", () => {
    // Both were in an old sitemap; vercel.json 308s them to the same place.
    for (const path of ["/looks/particles", "/looks/ascii", "/looks/ascii/"]) {
      expect(matchRoute(path), path).toEqual({ page: "redirect", to: "/gallery" });
    }
  });

  it("maps the static pages, compare pages, home and embed", () => {
    expect(matchRoute("/")).toEqual({ page: "home" });
    expect(matchRoute("/embed")).toEqual({ page: "embed" });
    expect(matchRoute("/docs")).toEqual({ page: "docs" });
    expect(matchRoute("/gallery")).toEqual({ page: "gallery" });
    expect(matchRoute("/compare/cobe")).toEqual({ page: "compare", slug: "cobe" });
  });

  it("sends unknown compare slugs to the 404 page", () => {
    expect(matchRoute("/compare/nope").page).toBe("not-found");
  });

  it("reads a trailing slash or /index.html like the clean URL", () => {
    expect(matchRoute("/index.html")).toEqual({ page: "home" });
    expect(matchRoute("/docs/")).toEqual({ page: "docs" });
    expect(matchRoute("/looks/halftone/index.html")).toEqual({ page: "look", id: "halftone" });
  });

  it("sends anything else to the 404 page", () => {
    for (const path of ["/nope", "/Docs", "/compare", "/app", "/embed/looks/halftone"]) {
      expect(matchRoute(path).page, path).toBe("not-found");
    }
  });
});
