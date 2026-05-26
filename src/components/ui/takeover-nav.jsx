import { useEffect, useState } from "react";
import {
  Clipboard,
  DottedGlobe,
  Download,
  EyeOff,
  Github,
  Info,
  Moon,
  Sun,
} from "../icons.jsx";
import { usePersistedState } from "../../hooks/use-persisted-state.js";

// Persistent top nav for all takeover pages (/docs, /brand, /changelog,
// /privacy, /404). Mirrors the takeover-footer links but at the top of
// the page so visitors can hop between subpages without scrolling.
// The active-page indicator reads the current pathname at mount; SPA
// routing replaces the page entirely so we don't need to subscribe to
// history changes here — a fresh mount picks up the new pathname.

// Pixelarticons (MIT) — pixel icons paired with each nav label so the
// nav reads as part of the rest of the app's pixel-art vocabulary
// instead of a plain text row.
const LINKS = [
  { href: "/docs", label: "Docs", Icon: Info },
  { href: "/changelog", label: "Changelog", Icon: Clipboard },
  { href: "/brand", label: "Press kit", Icon: Download },
  { href: "/privacy", label: "Privacy", Icon: EyeOff },
];

export const TakeoverNav = () => {
  const [active, setActive] = useState("");
  // The brand mark inside the page-header is large + obvious. We hide
  // the nav's duplicate while it's on-screen, then cross-fade it in once
  // the user scrolls past it. Sentinel is any element with the shared
  // `.takeover-page-brand` class (added to every page-header link).
  const [showBrand, setShowBrand] = useState(false);
  // Shares the same `globestudio:uiTheme` key as the canvas app's
  // theme toggle, so switching themes inside /docs persists back to
  // the canvas when the user navigates home.
  const [uiTheme, setUiTheme] = usePersistedState("uiTheme", "dark");

  useEffect(() => {
    setActive(window.location.pathname);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", uiTheme);
  }, [uiTheme]);
  useEffect(() => {
    const sentinel = document.querySelector(".takeover-page-brand");
    if (!sentinel) {
      // Pages without a header brand (e.g., short layouts) always show
      // the nav logo so the nav doesn't look orphaned on the left.
      setShowBrand(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setShowBrand(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className={`takeover-nav${showBrand ? " has-brand" : ""}`}
      aria-label="Subpages"
    >
      <div className="takeover-nav-inner">
        <a
          className="takeover-nav-brand"
          href="/"
          aria-label="Globestudio home"
          aria-hidden={!showBrand}
          tabIndex={showBrand ? 0 : -1}
        >
          <DottedGlobe size={28} />
        </a>
        <div className="takeover-nav-links">
          {LINKS.map((link) => {
            const isActive =
              active === link.href || active.startsWith(`${link.href}/`);
            const Icon = link.Icon;
            return (
              <a
                key={link.href}
                href={link.href}
                className={`takeover-nav-link${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={12} aria-hidden="true" />
                <span>{link.label}</span>
              </a>
            );
          })}
          <a
            href="https://github.com/alevizio/globestudio"
            target="_blank"
            rel="noreferrer noopener"
            className="takeover-nav-link"
          >
            <Github size={12} />
            <span>GitHub</span>
          </a>
          <button
            type="button"
            className="takeover-nav-theme"
            onClick={() =>
              setUiTheme((c) => (c === "dark" ? "light" : "dark"))
            }
            aria-label={`Switch to ${uiTheme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${uiTheme === "dark" ? "light" : "dark"} mode`}
          >
            {uiTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>
    </nav>
  );
};
