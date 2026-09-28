import { lookPresets } from "../data/look-presets.js";

// Which page a path renders. App.jsx switches on the result, and the route
// parity test checks it against the sitemap and the prerendered files, so a
// page added to one of them but not the others fails CI instead of shipping
// as a 404 (or as an indexable copy of the home page).
//
// Look ids are checked against lookPresets: /looks/nope is a 404, not the
// editor with no look applied. Compare slugs are checked by ComparePage, so
// the comparison copy stays in its lazy chunk.

// The pre-launch teaser's secret path to the studio (see App.jsx). It is not
// a page of its own: App.jsx swaps it for "/" on load. Prerender writes it a
// copy of the app shell so it keeps working without a catch-all rewrite.
export const APP_UNLOCK_PATH = "/studio-d74dea52";

// Pages at /<name>. Exported so the route parity test can check that each
// one has a prerendered file.
export const PAGES = new Set(["brand", "docs", "changelog", "integrations", "examples", "gallery", "privacy"]);

// Strip an optional trailing `/index.html`, then a trailing slash, so static
// hosts that serve the SPA at the literal file path (Lighthouse CI's local
// server, file:// previews) resolve like the clean URL.
export const normalizePath = (pathname) =>
  pathname.replace(/\/index\.html$/, "").replace(/\/$/, "") || "/";

export const matchRoute = (pathname) => {
  const path = normalizePath(pathname);
  if (path === "/") return { page: "home" };
  if (path === "/embed") return { page: "embed" };
  const page = path.slice(1);
  if (PAGES.has(page)) return { page };
  const compare = path.match(/^\/compare\/([\w-]+)$/);
  if (compare) return { page: "compare", slug: compare[1] };
  const look = path.match(/^\/looks\/([\w-]+)$/);
  if (look && lookPresets.some((preset) => preset.id === look[1])) {
    return { page: "look", id: look[1] };
  }
  return { page: "not-found" };
};
