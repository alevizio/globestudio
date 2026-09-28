import { useEffect } from "react";
import { useBodyScrollable } from "../hooks/use-body-scrollable.js";
import { TakeoverFooter } from "./takeover-footer.jsx";
import { DottedGlobe } from "./icons.jsx";

// Catch-all 404 page. Vercel answers any path without a prerendered
// file with dist/404.html and a 404 status; the SPA boots there and
// src/utils/route-match.js sends the path here. Unknown look ids and
// compare slugs land here too. The noindex meta repeats the one in
// 404.html for client-rendered cases, and the links offer a path back
// to known surfaces.
export const NotFoundPage = () => {
  useBodyScrollable();
  useEffect(() => {
    document.title = "Not found · Globestudio";
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
      <TakeoverFooter />
    </main>
  );
};
