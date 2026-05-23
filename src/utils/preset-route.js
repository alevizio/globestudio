import { getPresetSeo } from "../data/preset-seo.js";

// Side-effects fired when a preset becomes the "current" view: rewrite the
// URL to /looks/:id, update document.title + meta tags + canonical link,
// and (re)inject the BreadcrumbList JSON-LD. All purely DOM-mutating,
// no React state — extracted from applyLook so the React side
// (the 30 setters that re-apply preset settings) doesn't have to live
// next to the SEO plumbing.
//
// Per SEO playbook (docs/research/2026-05-seo-playbook.md):
//   - Per-preset metaDescription drives the SERP snippet (Finding 3).
//   - Canonical URL strips query params so locale variants don't
//     trigger duplicate-content penalties (Phase 5a).
//   - BreadcrumbList helps Google + AI Overview understand the route
//     hierarchy (Finding 1).
//   - Per-preset og:image hits the 1200×630 card under /og/{id}.png.

const setMeta = (selector, content) => {
  const el = document.querySelector(selector);
  if (el) el.setAttribute("content", content);
};

const updateBreadcrumbLd = (preset, absoluteUrl) => {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://globestudio.app/" },
      { "@type": "ListItem", position: 2, name: "Looks", item: "https://globestudio.app/#looks-list" },
      { "@type": "ListItem", position: 3, name: preset.name, item: absoluteUrl },
    ],
  };
  let script = document.getElementById("breadcrumb-ld");
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "breadcrumb-ld";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(breadcrumb);
};

export const updatePresetRoute = (preset) => {
  if (typeof window === "undefined" || !window.history?.pushState) return;

  const url = `/looks/${preset.id}`;
  if (window.location.pathname !== url) {
    window.history.pushState({ lookId: preset.id }, "", url);
  }

  const title = `${preset.name} — Globestudio dotted globe`;
  const seo = getPresetSeo(preset.id);
  const description = seo?.metaDescription
    || `${preset.blurb}. Generate dotted maps and animated 3D globes with the ${preset.name} preset. Export as PNG, SVG, or WebM.`;
  const absoluteUrl = `https://globestudio.app/looks/${preset.id}`;
  const previewImage = `https://globestudio.app/og/${preset.id}.png`;

  document.title = title;
  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[property="og:url"]', absoluteUrl);
  setMeta('meta[property="og:image"]', previewImage);
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:description"]', description);
  setMeta('meta[name="twitter:image"]', previewImage);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute("href", absoluteUrl);

  updateBreadcrumbLd(preset, absoluteUrl);
};
