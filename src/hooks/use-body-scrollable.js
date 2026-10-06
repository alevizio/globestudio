import { useEffect } from "react";

// The main canvas app needs body { overflow: hidden } so the page
// doesn't scroll behind the fixed-positioned panel + globe canvas.
// Static takeover pages (/docs, /brand, /404) need the opposite —
// they're tall content pages and the user expects ordinary window
// scroll. This hook adds a body class that unlocks scrolling for the
// lifetime of the page, then cleans up on unmount.
//
// It also opens a link to a section (/docs#agent-skill, /privacy#ai-tools)
// at that section. The browser's own jump to the #id runs while the body
// is still locked and the prerendered copy of the page is hidden, so it
// lands at the top; once the page has rendered, the heading is there.
export const useBodyScrollable = () => {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.add("is-body-scrollable");
    let id = "";
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      // A malformed #fragment names no section.
    }
    const section = id ? document.getElementById(id) : null;
    // jsdom (the unit tests) has no scrollIntoView.
    if (section && typeof section.scrollIntoView === "function") section.scrollIntoView();
    return () => {
      document.body.classList.remove("is-body-scrollable");
    };
  }, []);
};
