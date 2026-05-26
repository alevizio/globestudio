import { useEffect, useState } from "react";
import { DottedGlobe, Github, Sun, Moon } from "../icons.jsx";
import { usePersistedState } from "../../hooks/use-persisted-state.js";
import { invertGradient, invertHex } from "../../utils/color.js";

// Storage keys whose values are colors that need to invert when the
// user flips the theme. Mirrors the canvas-app's toggleTheme inversion
// list so toggling theme from a takeover page leaves the canvas in a
// consistent state when the user navigates back.
const COLOR_KEYS = [
  "globestudio:dotColor",
  "globestudio:worldFill",
  "globestudio:worldStroke",
  "globestudio:background",
];
const GRADIENT_KEYS = [
  "globestudio:dotGradient",
  "globestudio:worldFillGradient",
  "globestudio:worldStrokeGradient",
];

const invertPersistedColors = () => {
  if (typeof window === "undefined") return;
  for (const key of COLOR_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const value = JSON.parse(raw);
      if (typeof value === "string") {
        window.localStorage.setItem(key, JSON.stringify(invertHex(value)));
      }
    } catch {
      // ignore — malformed values stay as-is
    }
  }
  for (const key of GRADIENT_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const value = JSON.parse(raw);
      const inverted = invertGradient(value);
      if (inverted) {
        window.localStorage.setItem(key, JSON.stringify(inverted));
      }
    } catch {
      // ignore
    }
  }
};

// Persistent top nav for all takeover pages (/docs, /brand, /changelog,
// /privacy, /404). Mirrors the takeover-footer links but at the top of
// the page so visitors can hop between subpages without scrolling.
// The active-page indicator reads the current pathname at mount; SPA
// routing replaces the page entirely so we don't need to subscribe to
// history changes here — a fresh mount picks up the new pathname.

const LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/changelog", label: "Changelog" },
  { href: "/brand", label: "Press kit" },
  { href: "/privacy", label: "Privacy" },
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
            return (
              <a
                key={link.href}
                href={link.href}
                className={`takeover-nav-link${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
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
            onClick={() => {
              // Match the canvas-app's toggleTheme behaviour: flip the
              // theme AND invert the persisted canvas colors so when
              // the user navigates back to the canvas, the bg / dot /
              // stroke / fill colors are already adapted to the new
              // theme. Without this, a light-theme toggle from /docs
              // would leave the canvas painting its old dark colors
              // on the cream bg.
              invertPersistedColors();
              setUiTheme((c) => (c === "dark" ? "light" : "dark"));
            }}
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
