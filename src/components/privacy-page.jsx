import { useEffect } from "react";
import { useBodyScrollable } from "../hooks/use-body-scrollable.js";
import { TakeoverFooter } from "./takeover-footer.jsx";
import { DottedGlobe, Github } from "./icons.jsx";

// Privacy policy page. Single takeover page documenting the analytics
// stack (Vercel Web Analytics + Speed Insights), what data is +
// isn't collected, and how to opt out. Linked from the About overlay
// and the takeover footer. The wording was drafted in the analytics
// research report and intentionally avoids policy lawyer-speak.

const OPT_OUT_KEY = "gs_optout";

const setOptOut = (next) => {
  if (typeof window === "undefined") return;
  try {
    if (next) window.localStorage.setItem(OPT_OUT_KEY, "true");
    else window.localStorage.removeItem(OPT_OUT_KEY);
  } catch {
    // localStorage blocked — ignore.
  }
  window.location.reload();
};

const getOptOut = () => {
  if (typeof window === "undefined") return false;
  if (window.navigator.doNotTrack === "1") return true;
  if (window.navigator.globalPrivacyControl === true) return true;
  try {
    return window.localStorage?.getItem(OPT_OUT_KEY) === "true";
  } catch {
    return true;
  }
};

export const PrivacyPage = () => {
  useBodyScrollable();
  useEffect(() => {
    document.title = "Privacy — Globestudio";
    const setMeta = (selector, content) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute("content", content);
    };
    setMeta(
      'meta[name="description"]',
      "What Globestudio does and doesn't collect. Cookieless analytics, no fingerprinting, no third-party advertisers.",
    );
  }, []);

  const optedOut = getOptOut();

  return (
    <main className="privacy-page">
      <header className="privacy-page-header">
        <a className="privacy-page-brand" href="/" aria-label="Globestudio home">
          <DottedGlobe size={40} />
        </a>
        <h1 className="privacy-page-title">Privacy</h1>
        <p className="privacy-page-lede">
          Globestudio is free, open source, and built so you never need
          an account. Here's what we do and don't collect.
        </p>
      </header>

      <section className="privacy-section">
        <h2 className="privacy-section-title">What we collect</h2>
        <p>
          We use{" "}
          <a
            href="https://vercel.com/docs/analytics"
            target="_blank"
            rel="noreferrer noopener"
          >
            Vercel Web Analytics
          </a>{" "}
          to count anonymous page views and a few product events:
        </p>
        <ul className="privacy-list">
          <li><code>preset_applied</code> — which preset was selected</li>
          <li><code>export_started</code> / <code>export_completed</code> — what format you exported (PNG, SVG, WebM)</li>
          <li><code>share_clicked</code> — that a share happened (not where)</li>
        </ul>
        <p>
          And{" "}
          <a
            href="https://vercel.com/docs/speed-insights"
            target="_blank"
            rel="noreferrer noopener"
          >
            Vercel Speed Insights
          </a>{" "}
          for Core Web Vitals (LCP, INP, CLS) so we can keep the canvas
          fast.
        </p>
      </section>

      <section className="privacy-section">
        <h2 className="privacy-section-title">What we don't collect</h2>
        <ul className="privacy-list">
          <li>No cookies</li>
          <li>No fingerprinting</li>
          <li>No personal data — your IP is hashed and discarded at Vercel's edge</li>
          <li>No third-party advertisers</li>
          <li>No session replay</li>
          <li>No cross-site tracking</li>
        </ul>
      </section>

      <section className="privacy-section">
        <h2 className="privacy-section-title">How to opt out</h2>
        <p>
          Three ways, each independently sufficient:
        </p>
        <ul className="privacy-list">
          <li>
            <strong>Browser-level (already respected)</strong> — enable
            Do-Not-Track or Global Privacy Control in your browser. We
            check both on every page load and don't load analytics if
            either is on.
          </li>
          <li>
            <strong>localStorage toggle</strong> — click the button
            below, or paste{" "}
            <code>localStorage.setItem('gs_optout', 'true')</code> into
            DevTools.
          </li>
          <li>
            <strong>Network blocker</strong> — block requests to{" "}
            <code>/_vercel/insights/</code> in your adblocker.
          </li>
        </ul>
        <div className="privacy-optout">
          <button
            type="button"
            className="privacy-optout-button"
            onClick={() => setOptOut(!optedOut)}
          >
            {optedOut ? "Analytics is OFF — turn back on" : "Turn analytics OFF for this browser"}
          </button>
          <p className="privacy-optout-note">
            {optedOut
              ? "Analytics will not load on any Globestudio page until you turn it back on."
              : "Your choice persists across visits via localStorage."}
          </p>
        </div>
      </section>

      <section className="privacy-section">
        <h2 className="privacy-section-title">Source</h2>
        <p>
          Globestudio is{" "}
          <a
            href="https://github.com/alevizio/globestudio/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer noopener"
          >
            MIT licensed
          </a>
          . You can audit every line that runs in your browser at{" "}
          <a
            href="https://github.com/alevizio/globestudio"
            target="_blank"
            rel="noreferrer noopener"
          >
            github.com/alevizio/globestudio
          </a>
          {" "}— the analytics gating logic lives in{" "}
          <code>src/components/analytics.jsx</code>.
        </p>
        <div className="docs-section-links">
          <a
            className="docs-link"
            href="https://github.com/alevizio/globestudio/blob/main/src/components/analytics.jsx"
            target="_blank"
            rel="noreferrer noopener"
          >
            <Github size={14} />
            <span>analytics.jsx on GitHub</span>
          </a>
        </div>
      </section>

      <TakeoverFooter />
    </main>
  );
};
