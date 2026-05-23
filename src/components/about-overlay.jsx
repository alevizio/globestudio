import { useRef } from "react";
import { useModalA11y } from "../hooks/use-modal-a11y.js";
import { DottedGlobe, Github, Twitter, X } from "./icons.jsx";

// About modal — opens from the panel header's info icon. Two short
// sections: the project, then the maker. Tight copy by design — the
// app itself is the demo; this is a thumbnail-sized "what + who" so
// curious visitors have a path to the source and to me.

export const AboutOverlay = ({ open, onClose }) => {
  const dialogRef = useRef(null);
  useModalA11y({
    open,
    onClose,
    containerRef: dialogRef,
    backdropSelector: ".about-overlay-backdrop",
  });

  if (!open) return null;

  return (
    <div className="about-overlay-backdrop" role="presentation" onClick={onClose}>
      <div
        className="about-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="about-overlay-header">
          <h2 id="about-title" className="about-overlay-title">
            About
          </h2>
          <button
            type="button"
            className="about-overlay-close"
            onClick={onClose}
            aria-label="Close about"
          >
            <X size={16} />
          </button>
        </div>

        <div className="about-overlay-body">
          <div className="about-logo" aria-hidden="true">
            <DottedGlobe size={56} />
          </div>

          <section className="about-section">
            <h3 className="about-section-title">Globestudio</h3>
            <p className="about-section-text">
              Designer-first dotted maps and animated 3D globes. 17 shader
              looks, 5 projections, custom GeoJSON, embed anywhere.
            </p>
            <p className="about-section-text">
              Built with React + Three.js. Open source, MIT licensed.
            </p>
            <div className="about-section-links">
              <a
                className="about-link"
                href="https://github.com/alevizio/globestudio"
                target="_blank"
                rel="noreferrer noopener"
              >
                <Github size={14} />
                <span>View source</span>
              </a>
            </div>
          </section>

          <section className="about-section">
            <div className="about-maker">
              {/* GitHub serves the user's avatar at <username>.png — redirects
                  to the actual avatar CDN URL. Stays fresh if Alejandro
                  updates his GitHub avatar; the ?s=120 param requests a
                  120px square so the browser doesn't download the full
                  500px+ original. */}
              <img
                className="about-avatar"
                src="https://github.com/alevizio.png?size=120"
                alt="Alejandro"
                width="48"
                height="48"
                loading="lazy"
              />
              <div className="about-maker-text">
                <h3 className="about-section-title">Hi, I’m Alejandro</h3>
                <p className="about-section-text">
                  Product designer who codes. I make tools for designers and
                  creative developers — Globestudio is the one I reach for
                  most.
                </p>
              </div>
            </div>
            <div className="about-section-links">
              <a
                className="about-link"
                href="https://alevizio.com"
                target="_blank"
                rel="noreferrer noopener"
              >
                <span aria-hidden="true">→</span>
                <span>alevizio.com</span>
              </a>
              <a
                className="about-link"
                href="https://github.com/alevizio"
                target="_blank"
                rel="noreferrer noopener"
              >
                <Github size={14} />
                <span>GitHub</span>
              </a>
              <a
                className="about-link"
                href="https://x.com/alevizio"
                target="_blank"
                rel="noreferrer noopener"
              >
                <Twitter size={14} />
                <span>@alevizio</span>
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
