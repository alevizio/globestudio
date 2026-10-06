import { useEffect } from "react";
import { useBodyScrollable } from "../hooks/use-body-scrollable.js";
import { PagePager } from "./ui/page-pager.jsx";
import { DottedGlobe, Github, Plus } from "./icons.jsx";
import { TakeoverNav } from "./ui/takeover-nav.jsx";
import { SectionHeading } from "./ui/section-heading.jsx";

// Privacy policy page. Single takeover page documenting the analytics
// stack (Vercel Web Analytics + Speed Insights), what data is +
// isn't collected, hosting logs, the MCP server, and how to opt out.
// Linked from the About overlay, the takeover footer and /terms. Contact
// is GitHub issues only, with no email address. The wording was drafted
// in the analytics research report and intentionally avoids policy
// lawyer-speak.

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
    document.title = "Privacy · Globestudio";
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
    <>
      <TakeoverNav />
      <main className="privacy-page">
        <header className="privacy-page-header">
        <a className="privacy-page-brand takeover-page-brand" href="/" aria-label="Globestudio home">
          <DottedGlobe size={56} />
        </a>
        <h1 className="privacy-page-title">Privacy</h1>
        <p className="privacy-page-lede">
          Globestudio is free, open source, and built so you never need
          an account. Here's what we do and don't collect.
        </p>
      </header>

      <section className="privacy-section" >
        <SectionHeading id="what-we-collect" className="privacy-section-title">
          What we collect
        </SectionHeading>
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
          <li><Plus size={12} aria-hidden="true" /><span><code>preset_applied</code>: which preset was selected</span></li>
          <li><Plus size={12} aria-hidden="true" /><span><code>export_completed</code>: the format you saved (PNG, SVG, WebM, MP4 or GIF), the look, and the PNG scale or video length</span></li>
          <li><Plus size={12} aria-hidden="true" /><span><code>share_clicked</code>: which share button you used (Copy share link, an embed code, Open in CodePen or Copy for AI), never the link itself or the design</span></li>
          <li><Plus size={12} aria-hidden="true" /><span><code>client_error</code>: which part of the app broke and a short error message, so we can fix it</span></li>
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
          fast. Unless you opt out (see below), both load on every
          globestudio.app page except the <code>/embed</code> view, so a
          globe embedded on another site or in the Figma plugin loads
          neither.
        </p>
      </section>

      <section className="privacy-section" >
        <SectionHeading id="waitlist" className="privacy-section-title">
          Launch waitlist
        </SectionHeading>
        <p>
          Before launch this site was a waitlist. If you joined it, we
          stored your email address and signup time in private Vercel Blob
          storage and sent one launch email from Alejandro's Gmail. We never
          shared or sold the list, and we deleted it on 5 October 2026. The
          waitlist page also counted <code>waitlist_signup</code> and{" "}
          <code>waitlist_duplicate</code> events, without the address.
        </p>
      </section>

      <section className="privacy-section" >
        <SectionHeading
          id="what-we-dont-collect"
          className="privacy-section-title"
        >
          What we don't collect
        </SectionHeading>
        <ul className="privacy-list">
          <li><Plus size={12} aria-hidden="true" /><span>No cookies</span></li>
          <li><Plus size={12} aria-hidden="true" /><span>No fingerprinting</span></li>
          <li><Plus size={12} aria-hidden="true" /><span>No personal data in analytics: a visit is counted by a hash of the request, which Vercel discards after 24 hours</span></li>
          <li><Plus size={12} aria-hidden="true" /><span>No third-party advertisers</span></li>
          <li><Plus size={12} aria-hidden="true" /><span>No session replay</span></li>
          <li><Plus size={12} aria-hidden="true" /><span>No cross-site tracking</span></li>
        </ul>
      </section>

      <section className="privacy-section" >
        <SectionHeading id="fonts" className="privacy-section-title">
          Fonts and avatar
        </SectionHeading>
        <p>
          Pages load fonts from Google Fonts and jsDelivr, and the About
          dialog loads a GitHub avatar. Like any web request, those
          services see your IP address and browser. They never see what
          you make.
        </p>
      </section>

      <section className="privacy-section" >
        <SectionHeading id="hosting" className="privacy-section-title">
          Hosting
        </SectionHeading>
        <p>
          Vercel hosts globestudio.app. Like any web host, it sees the IP
          address and browser of each request. It keeps a request log for up
          to 30 days, with the time, IP address, browser, region and status
          of each request and the link asked for, which for a share link
          includes its design. The log is there so the site can run and we
          can fix problems.
        </p>
      </section>

      <section className="privacy-section" >
        <SectionHeading id="ai-tools" className="privacy-section-title">
          AI tools and the MCP server
        </SectionHeading>
        <p>
          The MCP server at <code>globestudio.app/mcp</code> lets an AI tool
          such as Claude, ChatGPT, Codex or Cursor make globes for you, and
          the Globestudio plugins connect to it. A tool call sends the server
          only what that tool needs, such as a look, a style word, colors, a
          region, data points or a Globestudio link you pasted. The server
          answers from that and its built-in list of looks. It has no
          accounts, sets no cookies, stores nothing, calls no other service
          and never sees the rest of your conversation.
        </p>
        <p>
          Its requests are in Vercel's request log, above, without the tool's
          arguments. The IP address there is often your AI tool's server, not
          your own device. The agent skill runs inside your AI tool and sends
          nothing on its own. The links it writes open globestudio.app, where
          the rest of this page applies. Your AI tool's own privacy policy
          covers your chat.
        </p>
      </section>

      <section className="privacy-section" >
        <SectionHeading id="opt-out" className="privacy-section-title">
          How to opt out
        </SectionHeading>
        <p>
          Three ways, each independently sufficient:
        </p>
        <ul className="privacy-list">
          <li>
            <Plus size={12} aria-hidden="true" />
            <span>
              <strong>Browser-level (already respected)</strong>: enable
              Do-Not-Track or Global Privacy Control in your browser. We
              check both on every page load and don't load analytics if
              either is on.
            </span>
          </li>
          <li>
            <Plus size={12} aria-hidden="true" />
            <span>
              <strong>localStorage toggle</strong>: click the button
              below, or paste{" "}
              <code>localStorage.setItem('gs_optout', 'true')</code> into
              DevTools.
            </span>
          </li>
          <li>
            <Plus size={12} aria-hidden="true" />
            <span>
              <strong>Network blocker</strong>: block requests to{" "}
              <code>/_vercel/insights/</code> in your adblocker.
            </span>
          </li>
        </ul>
        <div className="privacy-optout">
          <button
            type="button"
            className="privacy-optout-button"
            onClick={() => setOptOut(!optedOut)}
          >
            {optedOut ? "Analytics is OFF. Turn back on" : "Turn analytics OFF for this browser"}
          </button>
          <p className="privacy-optout-note">
            {optedOut
              ? "Analytics will not load on any Globestudio page until you turn it back on."
              : "Your choice persists across visits via localStorage."}
          </p>
        </div>
      </section>

      <section className="privacy-section" >
        <SectionHeading id="contact" className="privacy-section-title">
          Contact
        </SectionHeading>
        <p>
          Questions about this page or your data: open an issue at{" "}
          <a
            href="https://github.com/alevizio/globestudio/issues"
            target="_blank"
            rel="noreferrer noopener"
          >
            github.com/alevizio/globestudio/issues
          </a>
          . Issues are public, so leave out anything private. The rules for
          using Globestudio are in the <a href="/terms">terms of use</a>.
        </p>
      </section>

      <section className="privacy-section" >
        <SectionHeading id="source" className="privacy-section-title">
          Source
        </SectionHeading>
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
          . The analytics gating logic lives in{" "}
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

        <PagePager />
      </main>
    </>
  );
};
