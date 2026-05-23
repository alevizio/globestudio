import { useEffect } from "react";
import { DottedGlobe, Github, Twitter } from "./icons.jsx";

// Press kit / brand assets for journalists + bloggers covering the
// launch. Static page, no canvas — separate from the main app shell
// so the busy globe doesn't compete with the asset list. Rendered
// when the URL pathname starts with /brand. SPA routing: handled by
// the conditional render in App.jsx; vercel.json rewrites every
// route to index.html so the SPA picks up the path on first paint.

// Colors mirror the design tokens used in the app. Keep this list in
// sync with --bg / --text / --accent / --muted in styles.css if those
// shift.
const PALETTE = [
  { name: "Canvas", value: "#0b0b0c", role: "Default dark canvas" },
  { name: "Text", value: "#f6f2ea", role: "Default ink / accent" },
  { name: "Risograph pink", value: "#ff3c94", role: "Risograph ink layer" },
  { name: "Aurora cyan", value: "#3df4ff", role: "Toon dots, Aurora bands" },
  { name: "Halftone print", value: "#0a0a0c", role: "Halftone background" },
];

const OG_PRESETS = [
  "default",
  "halftone",
  "risograph",
  "aurora",
  "bloom",
  "iridescent",
];

export const BrandPage = () => {
  useEffect(() => {
    document.title = "Brand — Globestudio";
    const setMeta = (selector, content) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute("content", content);
    };
    setMeta(
      'meta[name="description"]',
      "Globestudio press kit — logo, OG cards, color palette, taglines. Free to use for editorial coverage.",
    );
  }, []);

  return (
    <main className="brand-page">
      <header className="brand-page-header">
        <a className="brand-page-back" href="/">
          ← Back to Globestudio
        </a>
        <h1 className="brand-page-title">Press kit</h1>
        <p className="brand-page-lede">
          Everything you need to cover Globestudio. Free to use for editorial
          and review coverage; commercial use governed by{" "}
          <a href="https://github.com/alevizio/globestudio/blob/main/LICENSE" target="_blank" rel="noreferrer noopener">
            the MIT license
          </a>
          .
        </p>
      </header>

      <section className="brand-section">
        <h2 className="brand-section-title">Logo</h2>
        <div className="brand-logo-row">
          <div className="brand-logo-card">
            <DottedGlobe size={112} />
            <a className="brand-link" href="/favicon.svg" download>
              Download SVG
            </a>
          </div>
          <div className="brand-logo-card brand-logo-card--light">
            <DottedGlobe size={112} />
            <span className="brand-card-caption">On light background</span>
          </div>
        </div>
        <p className="brand-caption">
          The DottedGlobe mark works at any size down to 16 px. No background
          fill required — it's a stroke-only icon that reads the current text
          color.
        </p>
      </section>

      <section className="brand-section">
        <h2 className="brand-section-title">Open Graph cards</h2>
        <p className="brand-caption">
          Pre-baked 1200×630 share cards for every preset. Use these directly
          in articles, social posts, or thumbnail grids.
        </p>
        <div className="brand-og-grid">
          {OG_PRESETS.map((id) => (
            <a
              key={id}
              className="brand-og-tile"
              href={`/og/${id}.png`}
              download
            >
              <img
                src={`/og/${id}.png`}
                alt={`${id} OG card`}
                loading="lazy"
                width="1200"
                height="630"
              />
              <span className="brand-og-label">{id}</span>
            </a>
          ))}
        </div>
        <p className="brand-caption">
          All 19 preset cards live under{" "}
          <code>https://globestudio.app/og/{`{preset-id}.png`}</code> — request
          any one directly.
        </p>
      </section>

      <section className="brand-section">
        <h2 className="brand-section-title">Palette</h2>
        <div className="brand-palette-grid">
          {PALETTE.map((swatch) => (
            <div key={swatch.value} className="brand-palette-tile">
              <span
                className="brand-palette-swatch"
                style={{ background: swatch.value }}
                aria-hidden="true"
              />
              <div className="brand-palette-meta">
                <strong>{swatch.name}</strong>
                <code>{swatch.value}</code>
                <span>{swatch.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="brand-section">
        <h2 className="brand-section-title">Taglines</h2>
        <ul className="brand-taglines">
          <li>"Designer-first dotted maps and animated 3D globes."</li>
          <li>"19 shader looks. 5 projections. One free web tool."</li>
          <li>
            "Pick any country. Customize. Export as PNG, SVG, WebM, or shareable
            JSON."
          </li>
          <li>"Open source, MIT licensed, runs entirely in your browser."</li>
        </ul>
      </section>

      <section className="brand-section">
        <h2 className="brand-section-title">Contact</h2>
        <div className="brand-section-links">
          <a
            className="brand-link"
            href="https://github.com/alevizio/globestudio"
            target="_blank"
            rel="noreferrer noopener"
          >
            <Github size={14} />
            <span>GitHub repo</span>
          </a>
          <a
            className="brand-link"
            href="https://x.com/alevizio"
            target="_blank"
            rel="noreferrer noopener"
          >
            <Twitter size={14} />
            <span>@alevizio</span>
          </a>
          <a className="brand-link" href="https://alevizio.com" target="_blank" rel="noreferrer noopener">
            <span aria-hidden="true">→</span>
            <span>alevizio.com</span>
          </a>
        </div>
      </section>
    </main>
  );
};
