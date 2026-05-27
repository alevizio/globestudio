import { useEffect } from "react";
import { useBodyScrollable } from "../hooks/use-body-scrollable.js";
import { PagePager } from "./ui/page-pager.jsx";
import { DottedGlobe } from "./icons.jsx";
import { TakeoverNav } from "./ui/takeover-nav.jsx";
import { CodeBlock } from "./ui/code-block.jsx";
import { SectionHeading } from "./ui/section-heading.jsx";
import { OnThisPage } from "./ui/on-this-page.jsx";

// Showcase page demonstrating real-world layouts built on top of the
// /embed iframe. Each example renders a live preview using the same
// embed URL pattern the user would paste into their own site, then
// shows the HTML snippet underneath so they can copy it as-is.
//
// Why this exists: docs/integrations/* explains *how* to drop the
// embed into different tools — but designers asking "what could I
// actually build with this?" want concrete patterns, not platform
// instructions. This page is the answer.

const HERO_SNIPPET = `<section class="hero">
  <iframe
    class="hero-bg"
    src="https://globestudio.app/embed?look=aurora"
    title="Aurora globe"
    loading="lazy"
  ></iframe>
  <div class="hero-content">
    <h1>Reach every market</h1>
    <p>Designer-first dotted maps and animated 3D globes.</p>
    <a class="hero-cta" href="/signup">Start free →</a>
  </div>
</section>

<style>
  .hero { position: relative; height: 520px; overflow: hidden; border-radius: 16px; background: #0b0b0c; }
  .hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  .hero-content { position: relative; z-index: 1; padding: 64px; color: #f6f2ea; max-width: 520px; }
  .hero-cta { display: inline-block; margin-top: 16px; padding: 12px 20px; background: #3df4ff; color: #0b0b0c; text-decoration: none; border-radius: 6px; font-weight: 600; }
</style>`;

const CARD_SNIPPET = `<article class="globe-card">
  <iframe
    src="https://globestudio.app/embed?look=halftone"
    title="Halftone globe"
    loading="lazy"
  ></iframe>
  <div class="globe-card-body">
    <h3>Worldwide coverage</h3>
    <p>180+ countries, 24/7 monitoring.</p>
  </div>
</article>

<style>
  .globe-card { display: grid; grid-template-rows: 200px auto; border: 1px solid #2a2a2c; border-radius: 12px; overflow: hidden; background: #131316; color: #f6f2ea; }
  .globe-card iframe { width: 100%; height: 100%; border: 0; display: block; }
  .globe-card-body { padding: 20px; }
  .globe-card h3 { margin: 0 0 6px; font-size: 18px; }
  .globe-card p { margin: 0; color: #a8a39b; }
</style>`;

const STAT_SNIPPET = `<div class="stat-tile">
  <iframe
    src="https://globestudio.app/embed?look=newsprint"
    title="Newsprint globe"
    loading="lazy"
  ></iframe>
  <div class="stat-meta">
    <strong>4.2M</strong>
    <span>data points worldwide</span>
  </div>
</div>

<style>
  .stat-tile { display: flex; align-items: center; gap: 24px; padding: 24px; background: #f6f2ea; border-radius: 12px; }
  .stat-tile iframe { width: 140px; height: 140px; border: 0; flex-shrink: 0; }
  .stat-meta strong { display: block; font-size: 42px; font-weight: 700; color: #0b0b0c; }
  .stat-meta span { color: #555; }
</style>`;

const SPLIT_SNIPPET = `<section class="split">
  <div class="split-copy">
    <h2>Built for global teams</h2>
    <p>Time zones, languages, currencies — all handled.</p>
    <ul>
      <li>180+ countries</li>
      <li>40 currencies</li>
      <li>24/7 support</li>
    </ul>
  </div>
  <iframe
    class="split-globe"
    src="https://globestudio.app/embed?look=risograph"
    title="Risograph globe"
    loading="lazy"
  ></iframe>
</section>

<style>
  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; padding: 64px; }
  .split-copy h2 { font-size: 36px; margin: 0 0 16px; }
  .split-globe { width: 100%; aspect-ratio: 1; border: 0; border-radius: 16px; }
  @media (max-width: 720px) { .split { grid-template-columns: 1fr; } }
</style>`;

const FOOTER_SNIPPET = `<footer class="ambient-footer">
  <iframe
    src="https://globestudio.app/embed?look=topographic"
    title="Topographic globe"
    loading="lazy"
  ></iframe>
  <div class="ambient-footer-content">
    <p>© 2026 Acme Inc. — operating in 64 countries.</p>
  </div>
</footer>

<style>
  .ambient-footer { position: relative; height: 220px; overflow: hidden; background: #0b0b0c; }
  .ambient-footer iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; opacity: 0.55; }
  .ambient-footer-content { position: relative; z-index: 1; padding: 80px 48px; color: #f6f2ea; text-align: center; }
</style>`;

const TOC = [
  { id: "hero", label: "Hero section" },
  { id: "card", label: "Card component" },
  { id: "stat", label: "Stat tile" },
  { id: "split", label: "Split layout" },
  { id: "footer", label: "Ambient footer" },
];

// Single source of truth for the live previews — keeps the iframe
// renderings consistent with the snippets above. If a snippet changes,
// update the matching preview look so they stay in sync.
const EMBED = (look) => `https://globestudio.app/embed?look=${look}`;

export const ExamplesPage = () => {
  useBodyScrollable();
  useEffect(() => {
    document.title = "Examples — Globestudio";
    const setMeta = (selector, content) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute("content", content);
    };
    setMeta(
      'meta[name="description"]',
      "Real-world examples of using Globestudio in hero sections, card components, stat tiles, split layouts, and ambient footers. Copy-paste HTML.",
    );
  }, []);

  return (
    <>
      <TakeoverNav />
      <main className="examples-page docs-page">
        <header className="docs-page-header">
          <a
            className="docs-page-brand takeover-page-brand"
            href="/"
            aria-label="Globestudio home"
          >
            <DottedGlobe size={56} />
          </a>
          <h1 className="docs-page-title">Examples</h1>
          <p className="docs-page-lede">
            Real-world layouts built on the <code>/embed</code> iframe. Each
            preview below is a live globe — copy the HTML to drop the same
            pattern into your site.
          </p>
        </header>

        <div className="docs-page-content">
          <section className="docs-section">
            <SectionHeading id="hero" className="docs-section-title">
              Hero section
            </SectionHeading>
            <p>
              Full-width landing hero. The globe sits as a background layer
              with headline + CTA composited on top — works for SaaS, fintech,
              and any product with a global story.
            </p>
            <div className="example-preview example-preview--hero">
              <iframe
                className="example-preview-bg"
                src={EMBED("aurora")}
                title="Aurora globe preview"
                loading="lazy"
              />
              <div className="example-preview-content">
                <h2>Reach every market</h2>
                <p>Designer-first dotted maps and animated 3D globes.</p>
                <span className="example-preview-cta">Start free →</span>
              </div>
            </div>
            <CodeBlock language="html">{HERO_SNIPPET}</CodeBlock>
          </section>

          <section className="docs-section">
            <SectionHeading id="card" className="docs-section-title">
              Card component
            </SectionHeading>
            <p>
              Product card with the globe as the visual element on top. Great
              for feature grids on marketing pages or dashboards.
            </p>
            <div className="example-preview example-preview--card">
              <iframe
                src={EMBED("halftone")}
                title="Halftone globe preview"
                loading="lazy"
              />
              <div className="example-preview-card-body">
                <strong>Worldwide coverage</strong>
                <span>180+ countries, 24/7 monitoring.</span>
              </div>
            </div>
            <CodeBlock language="html">{CARD_SNIPPET}</CodeBlock>
          </section>

          <section className="docs-section">
            <SectionHeading id="stat" className="docs-section-title">
              Stat tile
            </SectionHeading>
            <p>
              Small metric block with the globe as a supporting illustration.
              Pairs the kind of data point you'd put on an analytics page or a
              press release.
            </p>
            <div className="example-preview example-preview--stat">
              <iframe
                src={EMBED("newsprint")}
                title="Newsprint globe preview"
                loading="lazy"
              />
              <div className="example-preview-stat-meta">
                <strong>4.2M</strong>
                <span>data points worldwide</span>
              </div>
            </div>
            <CodeBlock language="html">{STAT_SNIPPET}</CodeBlock>
          </section>

          <section className="docs-section">
            <SectionHeading id="split" className="docs-section-title">
              Split layout
            </SectionHeading>
            <p>
              Classic two-column section — copy on one side, globe on the
              other. Stacks to a single column on narrow viewports.
            </p>
            <div className="example-preview example-preview--split">
              <div className="example-preview-split-copy">
                <h2>Built for global teams</h2>
                <p>Time zones, languages, currencies — all handled.</p>
                <ul>
                  <li>180+ countries</li>
                  <li>40 currencies</li>
                  <li>24/7 support</li>
                </ul>
              </div>
              <iframe
                className="example-preview-split-globe"
                src={EMBED("risograph")}
                title="Risograph globe preview"
                loading="lazy"
              />
            </div>
            <CodeBlock language="html">{SPLIT_SNIPPET}</CodeBlock>
          </section>

          <section className="docs-section">
            <SectionHeading id="footer" className="docs-section-title">
              Ambient footer
            </SectionHeading>
            <p>
              Subtle globe as a backdrop for the page footer. Reduced opacity
              keeps the text readable while the motion still ties the bottom
              of the page back to the product's global identity.
            </p>
            <div className="example-preview example-preview--footer">
              <iframe
                src={EMBED("topographic")}
                title="Topographic globe preview"
                loading="lazy"
              />
              <div className="example-preview-footer-content">
                <p>© 2026 Acme Inc. — operating in 64 countries.</p>
              </div>
            </div>
            <CodeBlock language="html">{FOOTER_SNIPPET}</CodeBlock>
          </section>
        </div>

        <OnThisPage sections={TOC} />

        <PagePager />
      </main>
    </>
  );
};
