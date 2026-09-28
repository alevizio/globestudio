// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pageRoutes } from "../scripts/prerender.js";
import { lookPresets } from "./data/look-presets.js";
import { getPresetSeo } from "./data/preset-seo.js";

const routes = pageRoutes();
const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const homeTitle = indexHtml.match(/<title>([^<]*)<\/title>/)[1];
const byRoute = Object.fromEntries(routes.map((route) => [route.route, route]));

describe("prerendered heads", () => {
  it("give each look page its hand-written description, as after load", () => {
    for (const { id } of lookPresets) {
      expect(byRoute[`looks/${id}`].description, id).toBe(getPresetSeo(id).metaDescription);
    }
  });

  it("keep every title within the 60 characters a results page shows", () => {
    for (const { route, title } of [{ route: "/", title: homeTitle }, ...routes]) {
      expect(title.length, route).toBeLessThanOrEqual(60);
    }
  });
});
