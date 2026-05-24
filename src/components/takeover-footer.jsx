import { DottedGlobe, Github } from "./icons.jsx";

// Shared footer rendered at the bottom of every takeover page (/docs,
// /brand, /changelog, /404). Keeps the chrome consistent so visitors
// always have an exit path back to the canvas app + source.
export const TakeoverFooter = () => (
  <footer className="takeover-footer">
    <a className="takeover-footer-brand" href="/" aria-label="Globestudio home">
      <DottedGlobe size={20} />
      <span>Globestudio</span>
    </a>
    <nav className="takeover-footer-links" aria-label="Site links">
      <a href="/docs">Docs</a>
      <a href="/changelog">Changelog</a>
      <a href="/brand">Press kit</a>
      <a
        href="https://github.com/alevizio/globestudio"
        target="_blank"
        rel="noreferrer noopener"
      >
        <Github size={12} />
        <span>GitHub</span>
      </a>
      <a href="/privacy">Privacy</a>
      <a
        href="https://github.com/alevizio/globestudio/blob/main/LICENSE"
        target="_blank"
        rel="noreferrer noopener"
      >
        MIT
      </a>
    </nav>
  </footer>
);
