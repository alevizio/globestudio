import { useEffect } from "react";
import { useBodyScrollable } from "../hooks/use-body-scrollable.js";
import { PagePager } from "./ui/page-pager.jsx";
import { DottedGlobe, Github, Plus } from "./icons.jsx";
import { TakeoverNav } from "./ui/takeover-nav.jsx";
import { SectionHeading } from "./ui/section-heading.jsx";

// Hand-curated changelog surface. The full CHANGELOG.md lives at the
// repo root and is the authoritative record; this page is a
// designer-readable summary of recent shipped work, with the heaviest
// emphasis on what visitors arriving from launch posts care about.
//
// Update when you ship anything user-facing. The full long-form
// CHANGELOG stays the source of truth — this is the marketing-side
// view.

const ENTRIES = [
  {
    label: "Launch hardening",
    date: "June 2026",
    items: [
      "Shader-on-background composite actually paints — it sampled transparent black in every \"Skip\" state",
      "PNG export matches the canvas — solid background composited in, aspect/size honored via center-crop",
      "Share links round-trip exactly — view mode, projection, rivers, and cities travel with the URL",
      "Embed params clamp to studio ranges (a stray density crashed the embed) + ?background= works",
      "MCP share/embed URLs decode correctly — a contract test runs every URL through the app's own parser",
      "Mobile: looks bar shows in the collapsed-sheet peek, no more iOS focus auto-zoom",
      "Off-screen shader backdrops pause; animated chrome respects prefers-reduced-motion",
    ],
  },
  {
    label: "Search engines & AI assistants",
    date: "June 2026",
    items: [
      "Comparison pages — /compare/cobe and /compare/geolayers, honest decision aids with FAQ JSON-LD",
      "Per-route <head> prerendering — looks, compare, and gallery get real titles + cards without JS",
      "robots.txt welcomes AI crawlers; llms.txt + llms-full.txt describe the product for assistants",
      "Sitemap auto-generated from the preset list so it can never drift again",
    ],
  },
  {
    label: "Globestudio everywhere",
    date: "May 2026",
    items: [
      "@globestudio/mcp on npm — MCP server so AI assistants can generate globes, share URLs, and embed snippets",
      "@globestudio/react — drop-in <Globe /> component for React apps, zero deps, SSR-friendly",
      "@globestudio/element — framework-free web component",
      "embed.js — one script tag + a div embeds a globe in Webflow, Squarespace, or plain HTML",
      "WordPress plugin — Gutenberg block + [globestudio] shortcode, wordpress.org submission prepped",
      "Figma plugin live in the Community — insert globes as editable vectors",
      "/integrations — copy-paste recipes for every platform",
    ],
  },
  {
    label: "21 looks + motion exports",
    date: "May 2026",
    items: [
      "Two new presets — Vapor (synthwave) and Topographic (contour rings) — the catalog hits 21 looks",
      "Animated GIF and MP4 export join WebM",
      "/gallery — a static index of every built-in look",
      "/examples — six full-screen brand showcases with copy-paste HTML",
    ],
  },
  {
    label: "Wave 2 polish",
    date: "May 2026",
    items: [
      "Cmd+K command palette with fuzzy search across every preset + action",
      "Two new presets — Toon (cel-shaded) and Threshold (two-tone binary)",
      "Looks bar — active-chip sheen sweep, hover lift, branded tooltips",
      "Modal frosted-glass treatment scoped to the card",
      "Ambient mode — collapse the panel and the whole canvas goes full-bleed",
      "Brand-icon ripple acknowledgement when a preset lands",
      "Preset crossfade — canvas opacity dips during the swap",
      "Globe canvas blur-fade entrance on first paint",
      "Color picker thumb alignment + bar height matched to thumb",
      "/docs and /brand routes branded with the DottedGlobe mark",
      "/404 takeover for unknown routes",
    ],
  },
  {
    label: "Infrastructure",
    date: "May 2026",
    items: [
      "Public JSON Schema for community preset PRs + CI validation",
      "Per-chunk bundle-size budgets enforced on every PR",
      "Lighthouse CI gate (LCP, CLS, performance score, a11y)",
      "App.jsx refactored — 1545 → 1290 lines, six hooks extracted",
      "Smoke test guards against TDZ-style first-render crashes",
      "NOTICE.md + correct Pixelarticons MIT attribution",
      "Lazy chunk prefetch on first user interaction",
    ],
  },
  {
    label: "First-visit experience",
    date: "May 2026",
    items: [
      "Onboarding hint pill — \"Press S to shuffle · [ ] to cycle\"",
      "Coordinated entrance: globe canvas blooms in, panel slides in 120 ms later",
      "First-visit choreography respects prefers-reduced-motion",
    ],
  },
];

export const ChangelogPage = () => {
  useBodyScrollable();
  useEffect(() => {
    document.title = "Changelog — Globestudio";
    const setMeta = (selector, content) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute("content", content);
    };
    setMeta(
      'meta[name="description"]',
      "Recent shipped work in Globestudio — new presets, polish, infrastructure, and first-visit experience.",
    );
  }, []);

  return (
    <>
      <TakeoverNav />
      <main className="changelog-page">
        <header className="changelog-page-header">
        <a className="changelog-page-brand takeover-page-brand" href="/" aria-label="Globestudio home">
          <DottedGlobe size={56} />
        </a>
        <h1 className="changelog-page-title">Changelog</h1>
        <p className="changelog-page-lede">
          What's shipped recently.{" "}
          <a href="/changelog.xml">RSS feed</a>
          {" "}for your reader of choice. The full long-form changelog with
          every commit category lives in{" "}
          <a
            href="https://github.com/alevizio/globestudio/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noreferrer noopener"
          >
            CHANGELOG.md
          </a>
          .
        </p>
      </header>

      {ENTRIES.map((entry) => {
        const slug = entry.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return (
          <section key={entry.label} className="changelog-section">
            <div className="changelog-section-meta">
              <SectionHeading id={slug} className="changelog-section-title">
                {entry.label}
              </SectionHeading>
              <span className="changelog-section-date">{entry.date}</span>
            </div>
            <ul className="changelog-list">
              {entry.items.map((line) => (
                <li key={line}>
                  <Plus size={12} aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="changelog-section" >
        <div className="changelog-section-meta">
          <SectionHeading id="source" className="changelog-section-title">
            Source
          </SectionHeading>
        </div>
        <p>
          The full version-controlled record lives on GitHub.
        </p>
        <div className="docs-section-links">
          <a
            className="docs-link"
            href="https://github.com/alevizio/globestudio/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noreferrer noopener"
          >
            <Github size={14} />
            <span>CHANGELOG.md on GitHub</span>
          </a>
          <a
            className="docs-link"
            href="https://github.com/alevizio/globestudio/commits/main"
            target="_blank"
            rel="noreferrer noopener"
          >
<span aria-hidden="true">→</span>
            <span>Commit history</span>
          </a>
        </div>
      </section>

        <PagePager />
      </main>
    </>
  );
};
