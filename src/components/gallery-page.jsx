import { lookPresets } from "../data/look-presets.js";
import "./gallery-page.css";

// Static gallery of every built-in look. Uses the pre-rendered /looks/{id}.png
// thumbnails (NOT live globe iframes) so the grid stays light and never trips
// the browser's WebGL-context cap. Each card links to /looks/{id}, which opens
// that look in the editor. A community-submitted section can layer on later
// via the existing look-preset schema (PR-curated, no accounts).
export const GalleryPage = () => (
  <main className="gallery-page">
    <header className="gallery-header">
      <a className="gallery-back" href="/">← Globestudio</a>
      <h1 className="gallery-title">Looks gallery</h1>
      <p className="gallery-sub">
        Every built-in look. Open one to customize it in the editor and export PNG, SVG, GIF, or an embed.
      </p>
    </header>
    <ul className="gallery-grid">
      {lookPresets.map((preset) => (
        <li key={preset.id} className="gallery-card">
          <a className="gallery-card-link" href={`/looks/${preset.id}`}>
            <span className="gallery-card-frame">
              <img
                className="gallery-card-thumb"
                src={`/looks/${preset.id}.png`}
                alt={`${preset.name} look`}
                loading="lazy"
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
  </main>
);
