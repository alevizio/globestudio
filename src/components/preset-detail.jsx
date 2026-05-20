import { getPresetSeo } from "../data/preset-seo.js";

// Visible long-form content rendered below the canvas when a preset is
// applied. Each /looks/:id URL now has 200+ words of designer-facing
// unique content, lifting every preset page above Google's "thin content"
// threshold and giving AI scrapers / Overview citations a real surface
// to read.
//
// Driven by docs/data/preset-seo.js — content is hand-written, not
// LLM-generated, to pass Google's "low-effort AI content" filters.
//
// Hidden when no preset is applied (homepage state) so the root doesn't
// inherit preset-specific copy.
export const PresetDetail = ({ preset }) => {
  if (!preset) return null;
  const seo = getPresetSeo(preset.id);
  if (!seo) return null;

  return (
    <section className="preset-detail" aria-labelledby={`preset-detail-${preset.id}`}>
      <header className="preset-detail-header">
        <h2 id={`preset-detail-${preset.id}`} className="preset-detail-title">
          {preset.name}
        </h2>
        <p className="preset-detail-blurb">{preset.blurb}</p>
      </header>
      <div className="preset-detail-body">
        <p className="preset-detail-description">{seo.longDescription}</p>
        {seo.useCases?.length > 0 && (
          <div className="preset-detail-use-cases">
            <h3 className="preset-detail-subtitle">When to use this</h3>
            <ul>
              {seo.useCases.map((useCase) => (
                <li key={useCase}>{useCase}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <footer className="preset-detail-footer">
        <a href="/" className="preset-detail-back">
          ← All looks
        </a>
        <span className="preset-detail-share">
          Direct link: <code>https://globestudio.app/looks/{preset.id}</code>
        </span>
      </footer>
    </section>
  );
};
