import { useEffect } from "react";
import { DottedGlobe } from "./icons.jsx";

// Catch-all 404 page. The SPA serves index.html for every route
// (vercel.json rewrite), so any unmatched path hits this component
// instead of the main app. Tells search engines the URL is gone via
// the noindex meta tag, and offers users a path back to known
// surfaces.
export const NotFoundPage = () => {
  useEffect(() => {
    document.title = "Not found — Globestudio";
    const head = document.head;
    const setMeta = (selector, attrs) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        head.appendChild(el);
      } else {
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      }
    };
    setMeta('meta[name="robots"][data-not-found]', {
      name: "robots",
      content: "noindex,follow",
      "data-not-found": "true",
    });
    return () => {
      const tag = document.querySelector('meta[name="robots"][data-not-found]');
      if (tag) tag.remove();
    };
  }, []);

  return (
    <main className="not-found-page">
      <div className="not-found-mark" aria-hidden="true">
        <DottedGlobe size={96} />
      </div>
      <h1 className="not-found-title">Page not found</h1>
      <p className="not-found-lede">
        That URL isn't part of Globestudio. Try one of these instead:
      </p>
      <div className="not-found-links">
        <a className="not-found-link" href="/">
          ← Home
        </a>
        <a className="not-found-link" href="/docs">
          Docs
        </a>
        <a className="not-found-link" href="/brand">
          Press kit
        </a>
        <a className="not-found-link" href="/looks/halftone">
          Try a preset
        </a>
      </div>
    </main>
  );
};
