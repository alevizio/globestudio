// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pageRoutes, renderPage } from "../scripts/prerender.js";
import { comparisons } from "./data/comparisons.js";
import { lookBreadcrumb } from "./utils/preset-route.js";
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

  it("keep every description within the 160 characters a results page shows", () => {
    for (const { route, description } of routes) {
      expect(description.length, route).toBeLessThanOrEqual(160);
    }
  });
});

const graphOf = (html) =>
  JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
const typesOf = (html) => graphOf(html).map((node) => node["@type"]);

describe("prerendered JSON-LD", () => {
  it("marks up no FAQ on the home page, whose Q&As aren't on the page", () => {
    expect(typesOf(indexHtml)).not.toContain("FAQPage");
    expect(typesOf(indexHtml)).toContain("ItemList");
  });

  it("keeps the looks ItemList only where the looks are listed", () => {
    for (const meta of routes) {
      const [html] = renderPage(indexHtml, meta, { teaser: false });
      expect(typesOf(html).includes("ItemList"), meta.route).toBe(meta.route === "gallery");
    }
  });

  it("gives each compare page one FAQPage with the Q&As it shows", () => {
    for (const c of Object.values(comparisons)) {
      const [html] = renderPage(indexHtml, byRoute[`compare/${c.slug}`], { teaser: false });
      const faqs = graphOf(html).filter((node) => node["@type"] === "FAQPage");
      expect(faqs).toHaveLength(1);
      expect(faqs[0].mainEntity.map((q) => q.name)).toEqual(c.faq.map((f) => f.q));
    }
    const [docs] = renderPage(indexHtml, byRoute.docs, { teaser: false });
    expect(typesOf(docs)).not.toContain("FAQPage");
  });
});

const breadcrumbOf = (html) =>
  JSON.parse(html.match(/<script type="application\/ld\+json" id="breadcrumb-ld">([\s\S]*?)<\/script>/)[1]);

describe("prerendered breadcrumbs", () => {
  it("give every subpage a BreadcrumbList that ends at the page itself", () => {
    for (const meta of routes) {
      const [html] = renderPage(indexHtml, meta, { teaser: false });
      expect(html.match(/id="breadcrumb-ld"/g), meta.route).toHaveLength(1);
      const items = breadcrumbOf(html).itemListElement;
      expect(items[0].item, meta.route).toBe("https://globestudio.app/");
      expect(items.at(-1).item, meta.route).toBe(meta.url);
    }
  });

  it("put looks under the gallery, as client navigation does", () => {
    for (const preset of lookPresets) {
      const [html] = renderPage(indexHtml, byRoute[`looks/${preset.id}`], { teaser: false });
      expect(breadcrumbOf(html)).toEqual(lookBreadcrumb(preset));
      expect(breadcrumbOf(html).itemListElement[1].item).toBe("https://globestudio.app/gallery");
    }
  });
});
