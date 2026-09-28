// Static HTML for each prerendered page's <div id="root">, so crawlers and
// unfurlers that don't run JS (GPTBot, ClaudeBot, PerplexityBot, social
// cards, Bing's first pass) read the page's real content instead of one
// shared noscript blurb. scripts/prerender.js loads this through Vite (the
// components import CSS) and writes the result into each file.
//
// Where a page is a self-contained component (compare, docs, integrations,
// examples, brand, changelog, privacy, 404), this renders that component,
// so the static text is exactly what React shows after load. Home, looks
// and the gallery are built from the same data the app renders: the canvas
// app itself can't render outside a browser.
//
// For visitors with JS the block is hidden from the first paint (a head
// script flags <html data-js>) and React replaces it on mount, so nothing
// shifts and no icon, image or iframe in it loads twice.

import { renderToStaticMarkup } from "react-dom/server";
import { lookPresets } from "../src/data/look-presets.js";
import { pageHeading } from "../src/data/preset-seo.js";
import { BrandPage } from "../src/components/brand-page.jsx";
import { ChangelogPage } from "../src/components/changelog-page.jsx";
import { ComparePage } from "../src/components/compare-page.jsx";
import { DocsPage } from "../src/components/docs-page.jsx";
import { ExamplesPage } from "../src/components/examples-page.jsx";
import { IntegrationsPage } from "../src/components/integrations-page.jsx";
import { NotFoundPage } from "../src/components/not-found-page.jsx";
import { PresetDetail } from "../src/components/preset-detail.jsx";
import { PrivacyPage } from "../src/components/privacy-page.jsx";
import { TakeoverFooter } from "../src/components/takeover-footer.jsx";

const LookLinks = () => (
  <ul>
    {lookPresets.map((preset) => (
      <li key={preset.id}>
        <a href={`/looks/${preset.id}`}>{preset.name}</a>: {preset.blurb}
      </li>
    ))}
  </ul>
);

// `facts` is the SoftwareApplication featureList from the home JSON-LD, so
// the page and its structured data list the same features.
const HomeBody = ({ facts }) => (
  <main>
    <h1>{pageHeading()}</h1>
    <p>
      Open-source dotted maps and animated 3D globes for designers, animators, and creative
      developers. Pick any country or the whole world, choose from {lookPresets.length} looks,
      customize dot shapes and gradients, apply shader effects (bloom, chromatic, glitch, CRT,
      halftone, more), and export PNG, SVG, WebM, MP4, GIF, a JSON config, or an embed. Built with
      React and Three.js. MIT licensed.
    </p>
    {facts.length > 0 && (
      <>
        <h2>Features</h2>
        <ul>
          {facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </>
    )}
    <h2>Looks</h2>
    <LookLinks />
    <TakeoverFooter />
  </main>
);

const LookBody = ({ preset }) => (
  <main>
    <h1>{pageHeading(preset)}</h1>
    <PresetDetail preset={preset} />
    <TakeoverFooter />
  </main>
);

// GalleryPage shows thumbnails; the static list carries each look's blurb
// in their place.
const GalleryBody = () => (
  <main>
    <h1>Looks gallery</h1>
    <p>
      Every built-in look. Open one to customize it in the editor and export PNG, SVG, WebM, MP4,
      GIF, JSON or an embed.
    </p>
    <LookLinks />
    <TakeoverFooter />
  </main>
);

const PAGES = {
  docs: DocsPage,
  integrations: IntegrationsPage,
  examples: ExamplesPage,
  brand: BrandPage,
  changelog: ChangelogPage,
  privacy: PrivacyPage,
};

const pageFor = (route, { facts = [] } = {}) => {
  if (route === "") return <HomeBody facts={facts} />;
  if (route === "404") return <NotFoundPage />;
  if (route === "gallery") return <GalleryBody />;
  const [section, id] = route.split("/");
  if (section === "looks") return <LookBody preset={lookPresets.find((preset) => preset.id === id)} />;
  if (section === "compare") return <ComparePage slug={id} />;
  const Page = PAGES[route];
  if (!Page) throw new Error(`static-bodies: no static body for "${route}"`);
  return <Page />;
};

// Elements that do nothing without JS (buttons), or would load for nothing
// while the block is hidden (images, iframes, video, canvas). Icons are
// inline SVG and decorative.
const DROP = [
  /<svg\b[\s\S]*?<\/svg>/g,
  /<button\b[\s\S]*?<\/button>/g,
  /<(iframe|video|canvas|script|style)\b[\s\S]*?<\/\1>/g,
  /<img\b[^>]*>/g,
];

// The static HTML for a page, by its dist folder ("" is home, "404" is
// dist/404.html).
export const renderStaticBody = (route, options) =>
  DROP.reduce((html, pattern) => html.replace(pattern, ""), renderToStaticMarkup(pageFor(route, options)));
