// @vitest-environment node
import { describe, expect, it } from "vitest";
import { pageRoutes } from "../scripts/prerender.js";
import { lookPresets } from "./data/look-presets.js";
import { getPresetSeo } from "./data/preset-seo.js";

const routes = pageRoutes();
const byRoute = Object.fromEntries(routes.map((route) => [route.route, route]));

describe("prerendered heads", () => {
  it("give each look page its hand-written description, as after load", () => {
    for (const { id } of lookPresets) {
      expect(byRoute[`looks/${id}`].description, id).toBe(getPresetSeo(id).metaDescription);
    }
  });
});
