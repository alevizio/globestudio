import { useEffect } from "react";
import { useBodyScrollable } from "../hooks/use-body-scrollable.js";
import { PagePager } from "./ui/page-pager.jsx";
import { DottedGlobe } from "./icons.jsx";
import { TakeoverNav } from "./ui/takeover-nav.jsx";
import { SectionHeading } from "./ui/section-heading.jsx";
import { CodeBlock } from "./ui/code-block.jsx";
import { OnThisPage } from "./ui/on-this-page.jsx";

// /integrations — one card per place you can paste a Globestudio
// embed. Replaces the old "you'll need to read the markdown on GitHub"
// fallback by showing the actual snippet inline + a deep link to the
// full recipe (when one exists). New tools can be added by appending
// to the INTEGRATIONS array below.

// ---- Brand logos. Each is the canonical mark for its tool, inlined
// as SVG so the page renders offline (no third-party CDN). All
// expose `currentColor` so the logo inherits the section's text
// color, keeping the integrations page on a single visual key.
// Trademarks belong to their owners; these are nominative-fair-use
// marks pointing visitors to the upstream products.

const WebflowLogo = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 10s-1.376 3.606 -1.5 4c-.046 -.4 -1.5 -8 -1.5 -8c-2.627 0 -3.766 1.562 -4.5 3.5c0 0 -1.843 4.593 -2 5c-.013 -.368 -.5 -4.5 -.5 -4.5c-.15 -2.371 -2.211 -3.98 -4 -3.98l2 12.98c2.745 -.013 4.72 -1.562 5.5 -3.5c0 0 1.44 -4.3 1.5 -4.5c.013 .18 1 8 1 8c2.758 0 4.694 -1.626 5.5 -3.5l3.5 -9.5c-2.732 0 -4.253 2.055 -5 4" />
  </svg>
);

const FramerLogo = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 256 256"
    fill="currentColor"
  >
    <path d="M200,112H149l56.27,50A8,8,0,0,1,200,176H136v64a8,8,0,0,1-13.66,5.66l-72-72A8,8,0,0,1,48,168V104a8,8,0,0,1,8-8h51L50.69,46A8,8,0,0,1,56,32H200a8,8,0,0,1,8,8v64A8,8,0,0,1,200,112Z" />
  </svg>
);

const FigmaLogo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    {/* Figma's five-section mark coloured with the official brand
        palette: orange (top-left), red (top-right), purple (middle-
        left), cyan (middle-right), green (bottom-left). */}
    {/* Top-left: orange */}
    <path
      fill="#F24E1E"
      d="M8.75 1H12v6.5H8.75a3.25 3.25 0 1 1 0 -6.5Z"
    />
    {/* Top-right: red/pink */}
    <path
      fill="#FF7262"
      d="M13 8V1h3.5a3.5 3.5 0 1 1 0 7H13Z"
    />
    {/* Middle-right: cyan */}
    <path
      fill="#1ABCFE"
      d="M19.5 12a3.25 3.25 0 1 1 -6.5 0 3.25 3.25 0 0 1 6.5 0Z"
    />
    {/* Middle-left: purple */}
    <path
      fill="#A259FF"
      d="M12 8.75H8.75a3.25 3.25 0 0 0 0 6.5H12v-6.5Z"
    />
    {/* Bottom-left: green */}
    <path
      fill="#0ACF83"
      d="M12 16.5v3.25a3.25 3.25 0 1 1 -3.25 -3.25H12Z"
    />
  </svg>
);

const NotionLogo = ({ size = 28 }) => (
  // Canonical Notion mark from Wikimedia Commons (PD/trademark).
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path
      fill="#fff"
      d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z"
    />
    <path
      fill="#000"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z"
    />
  </svg>
);

const WordPressLogo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.136 6.235A9.736 9.736 0 0 1 12 2.25a9.717 9.717 0 0 1 6.696 2.663c-0.397 0.04 -0.752 0.157 -1.056 0.352a2.13 2.13 0 0 0 -0.797 0.936c-0.308 0.689 -0.267 1.486 -0.043 2.069 0.199 0.515 0.403 0.894 0.593 1.211 0.076 0.128 0.14 0.232 0.2 0.327 0.099 0.159 0.18 0.288 0.261 0.446 0.207 0.394 0.385 0.905 0.396 2.126l-1.265 3.793 -2.93 -8.423h0.445a0.75 0.75 0 0 0 0 -1.5h-1.489l-0.011 0h-2.5l-0.011 0H9.5a0.75 0.75 0 0 0 0 1.5h0.482l1.386 3.652 -1.766 5.058 -3.04 -8.71H7a0.75 0.75 0 0 0 0 -1.5H5.648a0.75 0.75 0 0 0 -0.148 -0.015H4.136ZM2.788 8.8A9.736 9.736 0 0 0 2.25 12a9.746 9.746 0 0 0 4.914 8.468L2.788 8.798ZM9.46 21.416a9.75 9.75 0 0 0 2.539 0.334 9.74 9.74 0 0 0 3.102 -0.504l-2.907 -7.663 -2.734 7.833Zm7.748 -1.173A9.743 9.743 0 0 0 21.75 12a9.727 9.727 0 0 0 -0.636 -3.47L17.21 20.242ZM12 0.75C5.787 0.75 0.75 5.787 0.75 12S5.787 23.25 12 23.25 23.25 18.213 23.25 12 18.213 0.75 12 0.75Z"
    />
  </svg>
);

const HtmlLogo = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 4l-2 14.5l-6 2l-6 -2l-2 -14.5l16 0" />
    <path d="M15.5 8h-7l.5 4h6l-.5 3.5l-2.5 .75l-2.5 -.75l-.1 -.5" />
  </svg>
);

const ReactLogo = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <ellipse cx="12" cy="12" rx="10" ry="4" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-60 12 12)" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
  </svg>
);

// Stylized MCP "ribbon" — three nested rings suggesting protocol layers.
// Renders inside the dark integrations-section-logo chip with white stroke.
const McpLogo = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 18 L9 12 L3 6" />
    <path d="M21 18 L15 12 L21 6" />
    <line x1="11" y1="18" x2="13" y2="6" />
  </svg>
);

// Each card is now self-sufficient: brand logo, one-line blurb, the
// exact snippet to paste with a copy button. The "Full recipe → GitHub"
// link used to live here as a fallback when the page was just a stub,
// but the snippet IS the recipe — sending designers off to read a raw
// .md on github.com was strictly worse UX. If a platform-native CTA
// fits (an install link for a published Figma plugin, an npm install
// line, a wordpress.org plugin slug), add it via `cta: { href, label }`
// per entry; otherwise the card is complete.
const INTEGRATIONS = [
  {
    id: "mcp",
    name: "Claude / MCP",
    Logo: McpLogo,
    bg: "#1e1e22",
    fg: "#ffffff",
    blurb:
      "Add Globestudio as a Model Context Protocol tool in Claude Code, Claude Desktop, Cursor, Cody — any MCP client. Then ask in chat: \"make me a halftone globe of Japan with cyan dots\" and Claude builds the share URL for you.",
    snippet: `claude mcp add globestudio -- npx -y @globestudio/mcp`,
    cta: { href: "https://www.npmjs.com/package/@globestudio/mcp", label: "View on npm" },
  },
  {
    id: "webflow",
    name: "Webflow",
    Logo: WebflowLogo,
    bg: "#146EF5",
    fg: "#ffffff",
    blurb:
      "Drop an Embed element, paste the iframe snippet, publish. The globe renders inside any responsive container.",
    snippet: `<iframe
  src="https://globestudio.app/embed?look=halftone"
  width="100%"
  height="480"
  style="border:0"
  loading="lazy"
  title="Globestudio dotted globe"
></iframe>`,
  },
  {
    id: "framer",
    name: "Framer",
    Logo: FramerLogo,
    bg: "#0055FF",
    fg: "#ffffff",
    blurb:
      "Add an Embed component, paste the iframe URL, pick auto-resize. Works in Free + Pro projects, no plugin install.",
    snippet: `https://globestudio.app/embed?look=aurora`,
  },
  {
    id: "figma",
    name: "Figma",
    Logo: FigmaLogo,
    bg: "#0a0a0a",
    fg: "#ffffff",
    blurb:
      "The Globestudio plugin is live on Figma Community. Install it and drop a dotted globe straight onto your canvas — pick any of 21 presets, customize, click Insert. Also works in FigJam via the embed URL.",
    snippet: `https://globestudio.app/embed?look=risograph`,
    cta: {
      href: "https://www.figma.com/community/plugin/1641603648370488902/globestudio",
      label: "Install plugin",
    },
  },
  {
    id: "notion",
    name: "Notion",
    Logo: NotionLogo,
    bg: "#ffffff",
    fg: "#0a0a0a",
    blurb:
      "Type /embed, paste the URL, choose Display as embed. The globe scales to the column width.",
    snippet: `https://globestudio.app/embed?look=iridescent`,
  },
  {
    id: "wordpress",
    name: "WordPress",
    Logo: WordPressLogo,
    bg: "#21759B",
    fg: "#ffffff",
    blurb:
      "Custom HTML block, paste the iframe. Works on the block editor (Gutenberg) and Classic too.",
    snippet: `<iframe
  src="https://globestudio.app/embed?look=newsprint"
  width="100%"
  height="480"
  style="border:0"
  loading="lazy"
></iframe>`,
  },
  {
    id: "html",
    name: "Vanilla JS / Script tag",
    Logo: HtmlLogo,
    bg: "#E34F26",
    fg: "#ffffff",
    blurb:
      "Drop a div + the one-line script-tag loader. Reads data-look / data-config from the div, no install.",
    snippet: `<div data-globestudio data-look="bayer" style="height:480px"></div>
<script src="https://globestudio.app/embed.js" async></script>`,
  },
  {
    id: "react",
    name: "React / Next.js",
    Logo: ReactLogo,
    bg: "#20232A",
    fg: "#61DAFB",
    blurb:
      "One-line install. TypeScript autocomplete on every preset. SSR-friendly out of the box — works in React, Next.js, Remix, Astro.",
    snippet: `npm install @globestudio/react

// Then:
import { Globe } from "@globestudio/react";

<Globe look="halftone" width={640} height={480} />`,
    cta: { href: "https://www.npmjs.com/package/@globestudio/react", label: "View on npm" },
  },
];

export const IntegrationsPage = () => {
  useBodyScrollable();
  useEffect(() => {
    document.title = "Integrations — Globestudio";
    const setMeta = (selector, content) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute("content", content);
    };
    setMeta(
      'meta[name="description"]',
      "Drop Globestudio into Webflow, Framer, Figma, Notion, WordPress, plain HTML, or React — copy-paste snippets, no install.",
    );
  }, []);

  return (
    <>
      <TakeoverNav />
      <main className="integrations-page">
        <header className="integrations-page-header">
          <a
            className="integrations-page-brand takeover-page-brand"
            href="/"
            aria-label="Globestudio home"
          >
            <DottedGlobe size={56} />
          </a>
          <h1 className="integrations-page-title">Integrations</h1>
          <p className="integrations-page-lede">
            Every Globestudio embed is a single URL — paste it into any
            tool that takes an iframe. Below are the copy-paste snippets
            for the eight surfaces we hear about most, plus the MCP
            server so AI assistants can build globes for you in chat.
          </p>
        </header>

        {INTEGRATIONS.map((tool) => (
          <section key={tool.id} className="integrations-section">
            <div className="integrations-section-header">
              <span
                className="integrations-section-logo"
                aria-hidden="true"
                style={{ background: tool.bg, color: tool.fg }}
              >
                <tool.Logo size={24} />
              </span>
              <SectionHeading
                id={tool.id}
                className="integrations-section-title"
              >
                {tool.name}
              </SectionHeading>
            </div>
            <p>{tool.blurb}</p>
            <CodeBlock
              language={tool.snippet.startsWith("<") ? "html" : "url"}
            >
              {tool.snippet}
            </CodeBlock>
            {tool.cta && (
              <p className="integrations-recipe">
                <a
                  href={tool.cta.href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {tool.cta.label} →
                </a>
              </p>
            )}
          </section>
        ))}

        <OnThisPage
          sections={INTEGRATIONS.map((t) => ({
            id: t.id,
            label: t.name,
          }))}
        />

        <PagePager />
      </main>
    </>
  );
};
