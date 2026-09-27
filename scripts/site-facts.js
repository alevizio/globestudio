// Fills the product facts in index.html from the code that defines them, so
// the home <head> can't drift from what ships: every __GS_LOOK_COUNT__ becomes
// lookPresets.length, and the JSON-LD ItemList lists every look. Runs as the
// site-facts plugin in vite.config.js (dev and build); prerender.js then
// clones the filled dist/index.html for every route.
//
// Placeholders are quoted where JSON expects a number or an array, so the
// source index.html stays valid JSON-LD before the swap too.

import { lookPresets } from "../src/data/look-presets.js";

const SITE = "https://globestudio.app";

export const injectSiteFacts = (html) => {
  const count = String(lookPresets.length);
  const items = lookPresets.map((preset, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${SITE}/looks/${preset.id}`,
    name: preset.name,
  }));
  return html
    .replace('"__GS_LOOKS_ITEMLIST__"', JSON.stringify(items))
    .replaceAll('"__GS_LOOK_COUNT__"', count)
    .replaceAll("__GS_LOOK_COUNT__", count);
};
