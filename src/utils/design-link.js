import { lookPresets } from "../data/look-presets.js";
import { matchRoute } from "./route-match.js";
import { parseShareConfig } from "./share-config.js";

// The hosts that serve Globestudio: the site and its www name, the
// vercel.app alias that vercel.json sends to the site, and Vercel's preview
// deploys (globestudio-git-<branch>-<team>.vercel.app). Only the address is
// read, never fetched, and its config goes through normalizeConfig like any
// ?c= link, so a look-alike host could carry nothing a real link can't.
const SITE_HOST = /^(?:www\.)?globestudio\.app$|^globestudio(?:-[a-z0-9-]+)?\.vercel\.app$/;

// Reads pasted text as a Globestudio link and returns the design it opens:
// { look, config }, where look is the preset the link opens on (from
// /looks/:id, or /embed?look=) and config its ?c= design, normalized over
// that look the way the studio reads it on load (useShareConfigImport).
// Either can be missing; both are for a link of ours with no design in it,
// like the home page. Returns null for anything else: other hosts, other
// schemes, text that isn't one address. `ownHost` (the page's own host)
// counts too, so a link copied from a local or preview build opens there.
export const readDesignLink = (text, ownHost) => {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  let url;
  try {
    // Chat apps sometimes show a link without its scheme.
    url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!SITE_HOST.test(url.hostname) && url.host !== ownHost) return null;
  const route = matchRoute(url.pathname);
  const lookId = route.page === "look" ? route.id : route.page === "embed" ? url.searchParams.get("look") : null;
  const look = lookPresets.find((preset) => preset.id === lookId);
  const config = ["home", "look", "embed"].includes(route.page) ? parseShareConfig(url.search, look?.settings) : null;
  return { look, config };
};
