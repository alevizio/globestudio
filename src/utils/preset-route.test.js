import { beforeEach, describe, expect, it } from "vitest";
import { lookPresets } from "../data/look-presets.js";
import { PRODUCT_CARD_ALT } from "../data/share-cards.js";
import { updatePresetRoute } from "./preset-route.js";

// The share card tags a look route writes on client navigation must match
// what prerender.js writes for the same route: the ?v= cache-busted card and
// the alt that describes it.
const meta = (selector) => document.head.querySelector(selector).getAttribute("content");

describe("updatePresetRoute share card", () => {
  beforeEach(() => {
    document.head.innerHTML = `
      <meta property="og:image" content="https://globestudio.app/og/default.png?v=2" />
      <meta property="og:image:alt" content="${PRODUCT_CARD_ALT}" />
      <meta name="twitter:image" content="https://globestudio.app/og/default.png?v=2" />
      <meta name="twitter:image:alt" content="${PRODUCT_CARD_ALT}" />
    `;
  });

  it("points at the look's cache-busted card and describes it", () => {
    updatePresetRoute(lookPresets.find((preset) => preset.id === "halftone"));
    const card = "https://globestudio.app/og/halftone.png?v=2";
    const alt = "A dotted globe in the Globestudio Halftone look, captioned: Newspaper print, browser-rendered.";
    expect(meta('meta[property="og:image"]')).toBe(card);
    expect(meta('meta[name="twitter:image"]')).toBe(card);
    expect(meta('meta[property="og:image:alt"]')).toBe(alt);
    expect(meta('meta[name="twitter:image:alt"]')).toBe(alt);
  });

  it("keeps the product card alt on /looks/default", () => {
    updatePresetRoute(lookPresets.find((preset) => preset.id === "halftone"));
    updatePresetRoute(lookPresets.find((preset) => preset.id === "default"));
    expect(meta('meta[property="og:image"]')).toBe("https://globestudio.app/og/default.png?v=2");
    expect(meta('meta[property="og:image:alt"]')).toBe(PRODUCT_CARD_ALT);
    expect(meta('meta[name="twitter:image:alt"]')).toBe(PRODUCT_CARD_ALT);
  });
});
