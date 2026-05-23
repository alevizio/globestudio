// Share-link encoding / decoding for the current canvas configuration.
//
// The export-modal's "Copy share link" button used to just copy
// window.location.href, which only captured the preset (via /looks/:id)
// — any user customizations (color tweaks, density changes, shader
// fiddling) were lost on receive. This module bridges that gap: it
// serializes the full config into a URL-safe string the app can decode
// on the other end via importConfig().
//
// The encoding pipeline:
//   1. JSON.stringify(config) — same shape importConfig already accepts.
//   2. encodeURIComponent — URL-safe escaping. Cheap, no btoa Unicode
//      headache, lets the underlying JSON stay grep-able if a curious
//      user inspects the URL.
//
// Trade-off: encodeURIComponent inflates ~20% over raw JSON (mostly
// escaping curly braces, quotes, colons). Base64 is similar. Compression
// (LZ-string) could halve URL length but adds 3kb of runtime weight —
// not worth it for a v1 share feature where typical configs land at
// 800-1500 chars. Most chat/social platforms handle that fine.

const PARAM_KEY = "c";
const VERSION = 1;

// Build a sharable URL from the current config + origin. If `pathname`
// is omitted, we land at "/" so the embed doesn't accidentally inherit
// a /looks/:id route (which would import the preset's defaults on top
// of the user's customizations and clobber them).
export const buildShareUrl = (config, origin, pathname = "/") => {
  const payload = { v: VERSION, ...config };
  const json = JSON.stringify(payload);
  const encoded = encodeURIComponent(json);
  const base = (origin || "").replace(/\/+$/, "");
  return `${base}${pathname}?${PARAM_KEY}=${encoded}`;
};

// Decode the share config from a window.location.search string. Returns
// null if no config is present or the payload is malformed (importConfig
// is null-safe on its end too — defensive double-guard).
export const parseShareConfig = (search) => {
  if (typeof search !== "string" || !search) return null;
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const raw = params.get(PARAM_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!parsed || typeof parsed !== "object") return null;
    // Strip the version marker before handing off to importConfig — it
    // doesn't know about `v` and would warn on the unknown key.
    const { v: _v, ...config } = parsed;
    return config;
  } catch (_err) {
    return null;
  }
};

// After applying a share config, strip ?c=… from the URL so subsequent
// edits don't accumulate a stale config in the history. Uses
// replaceState so the user's history isn't polluted with the
// "decoded" step.
export const clearShareConfigFromUrl = () => {
  if (typeof window === "undefined" || typeof window.history === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM_KEY)) return;
  url.searchParams.delete(PARAM_KEY);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
};
