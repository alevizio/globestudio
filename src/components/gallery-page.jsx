import { lookPresets } from "../data/look-presets.js";
import { TakeoverFooter } from "./takeover-footer.jsx";
import "./gallery-page.css";

// Static gallery of every built-in look. Uses the pre-rendered /looks/{id}.webp
// thumbnails (NOT live globe iframes) so the grid stays light and never trips
// the browser's WebGL-context cap. Each card links to /looks/{id}, which opens
// that look in the editor. A community-submitted section can layer on later
// via the existing look-preset schema (PR-curated, no accounts).

// The widest grid (1200 px, 240 px minimum per card) fits four cards a row.
// That first row loads eagerly: lazy images wait for layout, and the first
// card is the page's largest paint.
const EAGER_CARDS = 4;

export const GalleryPage = () => (
  <main className="gallery-page">
    <header className="gallery-header">
      <a className="gallery-back" href="/">← Globestudio</a>
      <h1 className="gallery-title">Looks gallery</h1>
      <p className="gallery-sub">
        Every built-in look. Open one to customize it in the editor and export PNG, SVG, WebM, MP4, GIF, JSON or an embed.
      </p>
    </header>
    <ul className="gallery-grid">
      {lookPresets.map((preset, index) => (
        <li key={preset.id} className="gallery-card">
          <a className="gallery-card-link" href={`/looks/${preset.id}`}>
            <span className="gallery-card-frame">
              <img
                className="gallery-card-thumb"
                src={`/looks/${preset.id}.webp`}
                alt={`${preset.name} look`}
                loading={index < EAGER_CARDS ? "eager" : "lazy"}
                width={600}
                height={315}
                onError={(event) => {
                  event.currentTarget.closest(".gallery-card").style.display = "none";
                }}
              />
            </span>
            <span className="gallery-card-name">{preset.name}</span>
          </a>
        </li>
      ))}
    </ul>
    <TakeoverFooter />
  </main>
);
