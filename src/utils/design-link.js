import { lookPresets } from "../data/look-presets.js";
import { matchRoute } from "./route-match.js";
import { normalizeConfig, parseShareConfig } from "./share-config.js";

// The hosts that serve Globestudio: the site and its www name, the
// vercel.app alias that vercel.json sends to the site, and Vercel's preview
// deploys (globestudio-git-<branch>-<team>.vercel.app). Only the address is
// read, never fetched, and its config goes through normalizeConfig like any
// ?c= link, so a look-alike host could carry nothing a real link can't.
const SITE_HOST = /^(?:www\.)?globestudio\.app$|^globestudio(?:-[a-z0-9-]+)?\.vercel\.app$/;

const clamp = (text, min, max) => {
  const number = Number(text);
  return text && Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : undefined;
};

// The design in an embed link's own params, as embed-view.jsx parseParams
// reads them, with its ranges, and as the MCP's read_share_url does. The
// docs' embed examples and the MCP's embed links set the region, density
// and colors this way. Display options (theme, static, source) are left out.
const readEmbedParams = (params) => {
  const get = (key) => params.get(key) || undefined;
  const hex = (key) => get(key) && `#${get(key).replace(/^#/, "")}`;
  const flag = (key) => (params.has(key) ? ["1", "true"].includes(params.get(key)) : undefined);
  const size = (key, min, max) => (Number(get(key)) > 0 ? clamp(get(key), min, max) : undefined);
  const clear = get("background") === "transparent";
  return {
    selection: get("selection"),
    renderMode: get("renderMode"),
    density: size("density", 1, 90),
    dotSize: size("dotSize", 0.1, 25),
    dotColor: hex("dotColor"),
    worldFill: hex("worldFill"),
    background: clear ? undefined : hex("background"),
    // A color in the address keeps the page opaque, as in the embed.
    transparent: clear || (flag("transparent") ?? (get("background") ? false : undefined)),
    tiltX: clamp(get("tiltX"), -45, 45),
    tiltY: clamp(get("tiltY"), -45, 45),
    globeSettings: params.has("autoSpin") ? { autoSpin: flag("autoSpin") } : undefined,
    viewMode: get("view") && (get("view") === "flat" ? "flat" : "globe"),
  };
};

// Reads pasted text as a Globestudio link and returns the design it opens:
// { look, config }, where look is the preset the link opens on (from
// /looks/:id, or /embed?look=) and config its ?c= design (on an embed link,
// over the embed's own params), normalized over that look the way the
// studio reads it on load (useShareConfigImport).
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
  if (route.page !== "embed") {
    const config = ["home", "look"].includes(route.page) ? parseShareConfig(url.search, look?.settings) : null;
    return { look, config };
  }
  // The embed layers ?c= over its own params, except the view, which the
  // param sets.
  const params = readEmbedParams(url.searchParams);
  const shared = parseShareConfig(url.search, {}) ?? {};
  const config = normalizeConfig(
    {
      ...params,
      ...shared,
      globeSettings: shared.globeSettings ? { ...params.globeSettings, ...shared.globeSettings } : params.globeSettings,
      viewMode: params.viewMode ?? shared.viewMode,
    },
    look?.settings,
  );
  return { look, config };
};
