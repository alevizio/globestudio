import { useEffect, useRef, useState } from "react";
import "./examples-page.css";
import { useBodyScrollable } from "../hooks/use-body-scrollable.js";
import { PagePager } from "./ui/page-pager.jsx";
import { DottedGlobe } from "./icons.jsx";
import { TakeoverNav } from "./ui/takeover-nav.jsx";
import { FlowBackdrop } from "./ui/flow-backdrop.jsx";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion.js";
import { CodeBlock } from "./ui/code-block.jsx";
import { buildShareUrl } from "../utils/share-config.js";

// Per-company globe configs — palette-matched so the rendered globe
// reads as part of the brand instead of a default Globestudio mark.
// Each is fed through buildShareUrl(config, site, "/embed") to produce
// the canonical /embed?c=… URL the iframe loads.
// Each brand sets transparent: true so the embed paints with a fully
// see-through background (the WebGL canvas clears at alpha 0 and, with
// the .embed-view[data-transparent] CSS, every layer behind it —
// including the .globe-background mount div — is transparent too). The
// spinning globe + its in-scene atmosphere glow composite straight onto
// the brand page with no box and no clipping. dotColor + worldStroke +
// globeSettings.glowColor are the only colors the user sees; they carry
// the brand identity. worldFill tints the (mostly hidden) sphere body.
const BRAND_GLOBES = {
  // Light page (cream): deep-green dots + subtle green grid read on the
  // cream; glow off because the blue-tinted additive atmosphere washes
  // out over light. theme=light (see BRAND_THEME) flips the render palette.
  pachama: {
    selection: "world",
    transparent: true,
    dotColor: "#2F7D4F", // canopy green, dark enough to read on cream
    worldFill: "#0E3B2E",
    worldStroke: "#1f5240",
    dotsVisible: true,
    shape: "Circle",
    density: 38,
    globeSettings: { glow: false, grid: true, gridColor: "#1f5240", gridStrength: 22 },
  },
  // Light page (white): black dots + faint gray grid, the minimal Vercel
  // aesthetic. The conic rainbow ring behind the globe carries the colour.
  vercel: {
    selection: "world",
    transparent: true,
    dotColor: "#171717",
    worldFill: "#0A0A0A",
    worldStroke: "#262626",
    shape: "Circle",
    density: 42,
    globeSettings: { glow: false, grid: true, gridColor: "#171717", gridStrength: 14 },
  },
  profound: {
    selection: "world",
    transparent: true,
    dotColor: "#00B3A4",
    worldFill: "#0B1F4B",
    worldStroke: "#1A3070",
    shape: "Circle",
    density: 40,
    globeSettings: { glow: true, glowColor: "#00B3A4", glowStrength: 60 },
  },
  linear: {
    selection: "world",
    transparent: true,
    dotColor: "#7C89F0",
    worldFill: "#08090A",
    worldStroke: "#1a1a22",
    shape: "Circle",
    density: 42,
    globeSettings: { glow: true, glowColor: "#5E6AD2", glowStrength: 66 },
  },
  // Dark surface: the globe floats in a deep-navy (#0d253d) Stripe-
  // Dashboard card, so it stays dark-themed — bright Stripe-purple dots +
  // indigo glow on navy. Primary #533afd from awesome-design-md/stripe.
  stripe: {
    selection: "world",
    transparent: true,
    dotColor: "#8E89FF",
    worldFill: "#1c1e54",
    worldStroke: "#2e2b8c",
    shape: "Circle",
    density: 42,
    globeSettings: { glow: true, glowColor: "#533afd", glowStrength: 62 },
  },
  earthscale: {
    selection: "world",
    transparent: true,
    dotColor: "#d99c66",
    worldFill: "#1d1a16",
    worldStroke: "#3a3128",
    shape: "Circle",
    density: 38,
    globeSettings: { glow: true, glowColor: "#d99c66", glowStrength: 60 },
  },
};

// Background colors shown UNDER each transparent iframe — the iframe
// wrapper picks the bg from here so the globe color story is unified
// across showcase / card / stat surfaces for one brand.
// Background the card/stat-gallery globes sit on. Must match each brand's
// render theme (see BRAND_THEME): light brands get a light card so their
// graphite/coloured dots read; dark brands get their dark brand surface.
const BRAND_BG = {
  pachama:    "#F4F1EA",
  vercel:     "#FFFFFF",
  profound:   "#0B1F4B",
  linear:     "#08090A",
  stripe:     "#0d253d",
  earthscale: "#1d1a16",
};

// Render theme per brand, matched to the surface the globe actually sits
// on. Light surfaces (Pachama cream, Vercel white, Stripe white card) use
// theme=light so the globe's palette flips to graphite-on-cream and the
// dark-tuned blue glow doesn't wash out. Dark surfaces keep theme=dark so
// the cinematic atmosphere glow reads. Passed to /embed as ?theme=.
const BRAND_THEME = {
  pachama:    "light",
  vercel:     "light",
  stripe:     "dark",
  profound:   "dark",
  linear:     "dark",
  earthscale: "dark",
};

// /examples — full-screen showcase of how 6 real products could use
// Globestudio in their own marketing. Each section is styled in the
// company's actual palette + typography vibe and uses a live
// /embed iframe with a preset matched to their aesthetic.
//
// Order: Pachama (cream) → Vercel (black) → Profound (off-white) →
// Linear (near-black) → Stripe (off-white) → Earthscale (warm dark).
// Alternation creates visual rhythm as you scroll.
//
// Companies + briefs based on 2026 research of each landing page
// (palettes, headlines, voice). Copy is remixed — not scraped verbatim
// — to read as a natural Globestudio integration. Stats use real
// publicly-reported figures each company highlights on their own site.

const EMBED_BASE = "https://globestudio.app/embed";
const SITE = "https://globestudio.app";

// Construct a brand-tinted embed URL from a partial config (look +
// colors). Routes through the canonical share-URL encoder so any
// schema change in normalizeConfig propagates here automatically.
// Embed from the current origin so /examples shows the locally-running
// (or preview-deploy) globes, not always production. Falls back to the
// canonical site for any non-browser render path.
const embedOrigin = () => (typeof window !== "undefined" ? window.location.origin : SITE);
// opts: { theme, config } — lets a single placement (e.g. a bold hero
// centerpiece) override the brand's default globe config/theme without
// disturbing the card/stat-gallery instances that share the brand key.
const brandEmbedUrl = (look, brandKey, source, opts = {}) => {
  const config = { ...BRAND_GLOBES[brandKey], ...(opts.config || {}), ...(look ? { look } : {}) };
  const url = new URL(buildShareUrl(config, embedOrigin(), "/embed"));
  url.searchParams.set("theme", opts.theme || BRAND_THEME[brandKey] || "dark");
  if (source) url.searchParams.set("source", source);
  return url.toString();
};

const SHOWCASES = [
  { id: "stripe", name: "Stripe" },
  { id: "vercel", name: "Vercel" },
  { id: "gameover", name: "Game Over" },
  { id: "news", name: "Dispatch" },
  // Parked, NOT dead code: Pachama / Profound / Linear / Earthscale are
  // fully-built showcases kept hidden while the gallery focuses on Vercel
  // + Stripe. Intentional WIP — this set is being expanded over time;
  // un-comment an entry (and mount it in ShowcaseStack) to restore one.
  // { id: "pachama", name: "Pachama" },
  // { id: "profound", name: "Profound" },
  // { id: "linear", name: "Linear" },
  // { id: "earthscale", name: "Earthscale" },
];

// Tracks which showcase section is most visible so the chip nav can
// highlight it. Updates on scroll via IntersectionObserver.
const useActiveShowcase = (ids) => {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-15% 0px -35% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
};

const ShowcaseChipNav = ({ activeId }) => (
  <nav className="showcase-chip-nav" aria-label="Showcase examples">
    {SHOWCASES.map((s) => (
      <a
        key={s.id}
        href={`#${s.id}`}
        className={`showcase-chip ${activeId === s.id ? "is-active" : ""}`}
        aria-current={activeId === s.id ? "true" : undefined}
      >
        {s.name}
      </a>
    ))}
  </nav>
);

// Lazy-mount each embed iframe only when it's within 1.5 viewports of
// being visible. 6 simultaneous WebGL contexts on slow devices is
// painful; this keeps memory + GPU work bounded.
const LazyGlobe = ({ src, className, title, style }) => {
  const ref = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Mount the globe iframe only while near the viewport, and UNMOUNT
        // it once scrolled away. Each globe holds its own WebGL2 context and
        // browsers cap simultaneous contexts (~8-16); keeping every showcase
        // globe mounted exhausts that cap, so later globes fail
        // getContext("webgl2") and fall back to "WebGL 2 not supported".
        // Toggling both ways keeps live contexts down to what's on screen.
        setShouldLoad(entry.isIntersecting);
        if (!entry.isIntersecting) setLoaded(false);
      },
      // ~half a screen of lead-in so it's painted before it scrolls in,
      // without preloading several screens of globes at once.
      { rootMargin: "50% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={style}>
      {shouldLoad ? (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          // The iframe `load` event fires once the embed's HTML + scripts are
          // in; the WebGL globe paints its first frame a beat later. Wait out
          // that beat, then fade 0 → 1 so the globe arrives smoothly instead
          // of popping in.
          onLoad={() => {
            window.setTimeout(() => setLoaded(true), 420);
          }}
          // color-scheme: normal is load-bearing for transparency. The app
          // root is color-scheme: dark, and Chromium gives an iframe an
          // OPAQUE backdrop (a black/white box) whenever its embedder uses a
          // dark scheme — no matter that the embed's own document is fully
          // transparent. Setting the iframe element's own color-scheme breaks
          // that inheritance so the host page shows through the globe.
          style={{
            border: 0,
            width: "100%",
            height: "100%",
            display: "block",
            colorScheme: "normal",
            opacity: loaded ? 1 : 0,
            transition: "opacity 700ms ease",
          }}
        />
      ) : null}
    </div>
  );
};

// --- Brand marks (SVG) -----------------------------------------------------
// Editorial / nominative-fair-use — same precedent as /integrations page
// which uses Webflow, Framer, Figma, Notion, WordPress marks. Each is the
// minimum recognizable shape so the showcase reads as "obviously [brand]"
// without copying a full logo asset wholesale.

const VercelMark = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2L24 22H0L12 2Z" />
  </svg>
);

const LinearMark = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <linearGradient id="lg-linear" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#5E6AD2" />
        <stop offset="100%" stopColor="#9d8bff" />
      </linearGradient>
    </defs>
    <path
      fill="url(#lg-linear)"
      d="M1.22.27c-.27.49-.27 1.07-.27 2.23v95c0 1.16 0 1.74.27 2.23.22.42.57.78 1 1 .49.27 1.07.27 2.23.27h91.1c1.16 0 1.74 0 2.23-.27.42-.22.78-.58 1-1 .27-.49.27-1.07.27-2.23v-95c0-1.16 0-1.74-.27-2.23-.22-.42-.58-.78-1-1C97.29 0 96.71 0 95.55 0H4.45c-1.16 0-1.74 0-2.23.27-.42.22-.78.58-1 1z"
    />
  </svg>
);

const PachamaMark = ({ size = 18 }) => (
  <span
    style={{
      fontFamily: 'ui-serif, "Fraunces", Georgia, serif',
      fontWeight: 500,
      fontSize: size,
      letterSpacing: "-0.01em",
      lineHeight: 1,
      color: "currentColor",
    }}
  >
    pachama
  </span>
);

const ProfoundMark = ({ size = 18 }) => (
  <span
    style={{
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      fontWeight: 700,
      fontSize: size,
      letterSpacing: "-0.02em",
      lineHeight: 1,
      color: "currentColor",
    }}
  >
    Profound
  </span>
);

const EarthscaleMark = ({ size = 16 }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: 'ui-serif, "Fraunces", Georgia, serif',
      fontWeight: 500,
      fontSize: size,
      letterSpacing: "0",
      lineHeight: 1,
      color: "currentColor",
    }}
  >
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: "currentColor",
        opacity: 0.9,
      }}
    />
    earthscale
  </span>
);

// --- Faked company navbars -------------------------------------------------
// Each navbar is non-interactive (spans not links) — they're decorative
// chrome to make the hero feel like it's sitting on the real product page.

const CompanyNav = ({ brand, items, right, style }) => (
  <div className="showcase-nav" style={style}>
    <div className="showcase-nav-inner">
      <div className="showcase-nav-brand">{brand}</div>
      <div className="showcase-nav-items">
        {items.map((label) => (
          <span key={label} className="showcase-nav-item">
            {label}
          </span>
        ))}
      </div>
      <div className="showcase-nav-right">{right}</div>
      {/* Decorative mobile hamburger — on phones the cramped link row + CTAs
          collapse to this (non-interactive, like the rest of the mock nav). */}
      <span className="showcase-nav-burger" aria-hidden="true" />
    </div>
  </div>
);

// Monochrome customer-logo wall. Real product pages use these to
// signal traction without screaming. Rendered as styled wordmarks so
// we don't have to ship 6+ logo SVGs per showcase.
const LogoWall = ({ logos, color, label }) => (
  <div style={{ marginTop: 60, width: "100%", textAlign: "center" }}>
    {label && (
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color,
          opacity: 0.55,
          marginBottom: 18,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    )}
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 40,
        flexWrap: "wrap",
        opacity: 0.65,
      }}
    >
      {logos.map((l) => (
        <span
          key={l.name}
          style={{
            fontFamily: l.font || 'ui-sans-serif, system-ui, sans-serif',
            fontWeight: l.weight ?? 600,
            fontSize: l.size ?? 18,
            letterSpacing: l.tracking || "-0.01em",
            fontStyle: l.italic ? "italic" : "normal",
            color,
            whiteSpace: "nowrap",
          }}
        >
          {l.name}
        </span>
      ))}
    </div>
  </div>
);

// --- Per-company showcase sections -----------------------------------------

const PachamaShowcase = () => (
  <section
    id="pachama"
    className="showcase showcase--pachama"
    style={{
      background: "#F4F1EA",
      color: "#0E3B2E",
      // Pachama's actual display face is a punchy modern geometric sans
      // (Söhne/GT-style). Earlier draft used Georgia serif — wrong vibe.
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    }}
  >
    <CompanyNav
      brand={<PachamaMark size={20} />}
      items={["Projects", "Platform", "Resources", "About"]}
      right={
        <>
          <span className="showcase-nav-link" style={{ color: "#0E3B2E", opacity: 0.7 }}>Sign in</span>
          <span className="showcase-nav-cta" style={{ background: "#0E3B2E", color: "#F4F1EA" }}>
            Get in touch
          </span>
        </>
      }
      style={{ borderBottom: "1px solid rgba(14, 59, 46, 0.12)", color: "#0E3B2E" }}
    />
    <div className="showcase-inner showcase-inner--centered">
      <span className="showcase-eyebrow" style={{ color: "#0E3B2E", opacity: 0.6 }}>
        CARBON REMOVAL · NATURE
      </span>
      <h2 className="showcase-headline" style={{ color: "#0E3B2E" }}>
        Restore nature, <em style={{ color: "#F25C3B", fontStyle: "italic" }}>at scale.</em>
      </h2>
      <p className="showcase-subhead" style={{ color: "#0E3B2E", opacity: 0.75 }}>
        AI and satellite data monitoring 30 million+ tonnes of CO₂ across global forest projects — verified, transparent, real.
      </p>
      <div className="showcase-ctas">
        <span className="showcase-cta showcase-cta--primary" style={{ background: "#0E3B2E", color: "#F4F1EA" }}>
          Explore projects
        </span>
        <span className="showcase-cta showcase-cta--ghost" style={{ color: "#0E3B2E", borderColor: "#0E3B2E" }}>
          Get in touch
        </span>
      </div>
      <div style={{ position: "relative", width: "100%", maxWidth: 560, marginTop: 24, aspectRatio: "1 / 1" }}>
        <LazyGlobe
          src={brandEmbedUrl("default", "pachama", "examples-pachama")}
          title="Pachama-flavored globe"
          className="showcase-globe"
          style={{
            background: "transparent",
            aspectRatio: "1 / 1",
            width: "100%",
          }}
        />
        {/* Pachama project chips floating over the bottom-right of the
            globe — their signature "live projects" overlay pattern. */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {[
            { flag: "🇧🇷", name: "Jari Pará", type: "ARR · 12,400 ha", dot: "#F25C3B" },
            { flag: "🇨🇴", name: "Cauca Reserva", type: "Conservation · 8,200 ha", dot: "#B8E14C" },
            { flag: "🇰🇪", name: "Mau Forest", type: "Reforestation · 4,800 ha", dot: "#6A4BE0" },
          ].map((p) => (
            <div
              key={p.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                background: "rgba(244, 241, 234, 0.96)",
                color: "#0E3B2E",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span style={{ fontSize: 16 }}>{p.flag}</span>
              <span style={{ fontWeight: 700 }}>{p.name}</span>
              <span style={{ opacity: 0.55, fontSize: 11 }}>{p.type}</span>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: p.dot,
                  boxShadow: `0 0 0 3px ${p.dot}33`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="showcase-stats" style={{ marginTop: 56 }}>
        {[
          { v: "100M ha", l: "to restore by 2030" },
          { v: "30M+", l: "tonnes CO₂ managed" },
          { v: "70+", l: "scientists on staff" },
        ].map((s) => (
          <div key={s.l} className="showcase-stat">
            <strong style={{ color: "#0E3B2E" }}>{s.v}</strong>
            <span style={{ color: "#0E3B2E", opacity: 0.6 }}>{s.l}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Pixel-faithful recreation of vercel.com's hero (captured 2026-05):
// white canvas, faint blueprint grid, [Events] announcement pill, the
// "Build and deploy on the AI Cloud." headline in Geist 600 / -0.05em,
// and the warm→cool contour-mesh gradient band the brand renders behind
// its 3D mark — with our globe standing in for that centre object.
// Vercel globe: centered, big, cropped by the band. Tunable via ?tune.
const VERCEL_GLOBE_DEFAULTS = {
  tiltX: 29,
  tiltY: 0,
  spin: 40,
  width: 1600,
  x: 0,
  bottom: -760,
};
const VERCEL_TUNER_FIELDS = [
  { key: "tiltX", label: "Tilt ↑ (above)", min: -90, max: 90, step: 1 },
  { key: "tiltY", label: "Tilt → (turn)", min: -90, max: 90, step: 1 },
  { key: "spin", label: "Spin speed", min: 0, max: 100, step: 1 },
  { key: "width", label: "Size (px)", min: 400, max: 2400, step: 10 },
  { key: "x", label: "X offset (center)", min: -800, max: 800, step: 10 },
  { key: "bottom", label: "Y offset (bottom)", min: -1200, max: 400, step: 10 },
];

const VercelShowcase = () => {
  const { values, committed, set, reset } = useGlobeTuner(
    "globestudio:vercel-globe-tune",
    VERCEL_GLOBE_DEFAULTS,
  );
  return (
  <section
    id="vercel"
    className="showcase showcase--vercel"
    style={{
      background: "#000000",
      color: "#ededed",
      fontFamily: '"Geist", "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
      position: "relative",
      overflow: "hidden",
    }}
  >
    {/* Ambient animated gradient wash (unicorn-blinds) — soft, low-opacity,
        behind everything, for a gentle drifting colour across the whole hero. */}
    <div className="vercel-bg-wash" aria-hidden="true" />
    {/* Blueprint dot/line grid — Vercel's hero sits on a faint technical
        graph-paper backdrop that fades out toward the edges. */}
    <div
      className="vercel-grid"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        backgroundPosition: "center -1px",
        maskImage:
          "radial-gradient(ellipse 78% 62% at 50% 28%, #000 38%, transparent 76%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 78% 62% at 50% 28%, #000 38%, transparent 76%)",
      }}
    />
    {/* Animated Vercel-gradient glow behind the globe. At the section level so
        the band's hard edge doesn't crop it — the radial mask fades it out. */}
    <div
      className="vercel-globe-glow"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
    <CompanyNav
      brand={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#fff", fontWeight: 600, letterSpacing: "-0.04em", fontSize: 19 }}>
          <VercelMark size={18} />
          Vercel
        </span>
      }
      items={["Products", "Resources", "Solutions", "Enterprise", "Pricing"]}
      right={
        <>
          <span className="showcase-nav-link ai-gradient">Ask AI</span>
          <span className="showcase-nav-link vercel-outline" style={{ color: "#ededed", padding: "7px 15px" }}>Log in</span>
          <span className="showcase-nav-cta" style={{ background: "#fff", color: "#000", borderRadius: 6 }}>
            Sign Up
          </span>
        </>
      }
      style={{ color: "#ededed", position: "relative", zIndex: 2 }}
    />
    <div className="showcase-inner" style={{ position: "relative", zIndex: 1, gap: 20, justifyContent: "flex-start", paddingBottom: 0 }}>
      <div className="vercel-copy">
      {/* Announcement pill: [Events] tag · message · dark ticket button */}
      <span
        className="vercel-pill vercel-announce"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 5px 5px 6px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.06)",
          fontSize: 14,
          color: "#ededed",
          boxShadow: "none",
        }}
      >
        <span className="vercel-pill" style={{ background: "rgba(0,112,243,0.22)", color: "#6cb2ff", borderRadius: 999, padding: "2px 9px", fontSize: 12, fontWeight: 500 }}>
          Events
        </span>
        {/* Shorter copy on phones so the pill isn't cramped (CSS toggles). */}
        <span className="vercel-evt-full">Ship 26 is coming to 5 cities</span>
        <span className="vercel-evt-short">Ship 26 is coming</span>
        <span className="vercel-pill" style={{ background: "#fff", color: "#000", borderRadius: 999, padding: "4px 11px", fontSize: 13, fontWeight: 500 }}>
          Get your ticket →
        </span>
      </span>
      <h2
        className="showcase-headline"
        style={{
          color: "#ffffff",
          fontWeight: 600,
          letterSpacing: "-0.05em",
          lineHeight: 1.0,
          fontSize: "clamp(38px, 4.4vw, 56px)",
        }}
      >
        Deploy to the edge of the world.
      </h2>
      <p className="showcase-subhead" style={{ color: "#a1a1a1", fontSize: "clamp(17px, 1.5vw, 20px)", lineHeight: 1.6, maxWidth: 540 }}>
        Vercel runs your frontend on a global edge network — every visitor, in
        every region, gets a faster, more personalized web.
      </p>
      <div className="showcase-ctas">
        <span className="showcase-cta showcase-cta--primary" style={{ background: "#fff", color: "#000", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 6 }}>
          <VercelMark size={12} /> Start Deploying
        </span>
        <span className="showcase-cta vercel-outline" style={{ background: "transparent", color: "#ededed" }}>
          Get a Demo
        </span>
      </div>
      </div>
      {/* Vercel's signature contour-mesh gradient band — full-bleed and
          grown to fill the whole viewport below the hero copy, fading up
          into the white page where the headline sits. The 3D mark sits
          dead-centre on the real site — our globe takes that slot. */}
      <div
        className="vercel-band"
        style={{
          position: "relative",
          width: "100vw",
          // Symmetric full-bleed margins. The parent .showcase-inner is
          // align-items:center; a single marginLeft gets re-centered and leaves
          // black space on the right. Matching marginRight makes the margin box
          // fill the content box, neutralizing the centering so the band (and
          // the globe inside it) reach both viewport edges.
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          flex: "1 1 auto",
          minHeight: "clamp(340px, 42vw, 600px)",
          overflow: "hidden",
          // The globe is taller than this band, so overflow:hidden hard-crops
          // its top. Fade the band's top edge so the globe melts out softly
          // instead of being cut by a hard line.
          WebkitMaskImage: "linear-gradient(to top, #000 84%, transparent 100%)",
          maskImage: "linear-gradient(to top, #000 84%, transparent 100%)",
        }}
      >
        {/* Mesh gradient + contour rings removed. Glow lives at the section
            level (below) so the band's hard edge doesn't crop it. */}
        <div
          className="vercel-globe-box"
          style={{
            position: "absolute",
            left: "50%",
            bottom: `${values.bottom}px`,
            transform: `translateX(calc(-50% + ${values.x}px))`,
            width: `${values.width}px`,
            aspectRatio: "1 / 1",
            zIndex: 1,
          }}
        >
          {/* Soft dark halo grounds the globe as a glowing planet on the
              bright mesh — mirrors how Vercel's metallic 3D mark sits in a
              pool of shadow at the centre of the gradient. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "8%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(8,8,12,0.92) 0%, rgba(8,8,12,0.62) 46%, rgba(8,8,12,0) 70%)",
              filter: "blur(3px)",
            }}
          />
          <LazyGlobe
            src={brandEmbedUrl("default", "vercel", "examples-vercel", {
              theme: "dark",
              // globestudio-world-globe (1).json — triangle dots, RGB shader,
              // network arcs + routes, dark surface sphere. Composited
              // transparent so the gradient mesh shows around the planet.
              config: {
                selection: "world",
                transparent: true,
                backgroundStyle: "solid",
                density: 90,
                dotSize: 8.1,
                dotColor: "#ffffff",
                shape: "Triangle",
                dotRotation: 69,
                shapeRotationSpeed: 76,
                renderMode: "dots",
                worldFill: "#5a5a64",
                worldStroke: "#f6f2ea",
                worldStrokeWidth: 1.8,
                mapDepth: 55,
                tiltX: committed.tiltX,
                tiltY: committed.tiltY,
                shaderSettings: {
                  effect: "aurora",
                  intensity: 31,
                  split: 7,
                  grain: 84,
                  scanlines: 0,
                  cellSize: 16,
                  threshold: 50,
                  warp: 24,
                  motion: 44,
                },
                globeSettings: {
                  autoSpin: true,
                  autoSpinSpeed: committed.spin,
                  dotLift: 100,
                  glow: false,
                  glowStrength: 22,
                  glowSpread: 95,
                  glowColor: "#ffffff",
                  grid: false,
                  look: "classic",
                  network: true,
                  networkStrength: 100,
                  networkArcs: 100,
                  networkPulses: 100,
                  networkMono: true,
                  arcColor: "#ffffff",
                  pulseColor: "#ffffff",
                  routes: true,
                  routesStrength: 82,
                  surface: true,
                  surfaceStrength: 100,
                  surfaceColor: "#18191d",
                },
              },
            })}
            title="Vercel-flavored globe"
            className="showcase-globe"
            style={{ position: "relative", background: "transparent", aspectRatio: "1 / 1", width: "100%" }}
          />
        </div>
      </div>
    </div>
    {/* Globe tuner — append ?tune to the URL in dev to show it. */}
    {import.meta.env.DEV &&
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("tune") && (
        <GlobeTunerPanel values={values} fields={VERCEL_TUNER_FIELDS} set={set} reset={reset} label="Vercel" side="right" />
      )}
  </section>
  );
};

// Retro "game over" screen — the corrupt (datamosh) shader on the globe as a
// glitchy backdrop, with Geist Pixel type for GAME OVER + a CONTINUE? menu.
// Default fit of our screen over the Panasonic glass (percent of the photo).
const TV_FIT_DEFAULT = { left: 27.4, top: 17.1, width: 43.5, height: 52.3, radius: 13.6 };
const TV_FIT_KEY = "globestudio:tv-fit";

// Dev-only tuner (visit /examples?tunetv) to move/resize the screen overlay
// so it lines up with the TV in the photo. Values persist to localStorage.
const TvFitRow = ({ label, value, min, max, onChange }) => (
  <label style={{ display: "grid", gridTemplateColumns: "52px 1fr 56px", alignItems: "center", gap: 8, fontSize: 12 }}>
    <span>{label}</span>
    <input type="range" min={min} max={max} step={0.1} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))} />
    <input type="number" min={min} max={max} step={0.1} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width: 54, background: "#111", color: "#fff", border: "1px solid #333", padding: "2px 4px", fontSize: 12 }} />
  </label>
);

const TvFitPanel = ({ fit, setFit }) => {
  const up = (k) => (v) => setFit((f) => ({ ...f, [k]: v }));
  const css =
    `left: ${fit.left}%;\ntop: ${fit.top}%;\nwidth: ${fit.width}%;\n` +
    `height: ${fit.height}%;\nborder-radius: ${fit.radius}% / ${(fit.radius * 1.27).toFixed(1)}% !important;`;
  const btn = { background: "#1c2230", color: "#dfe7ea", border: "1px solid #333", padding: "5px 9px", fontSize: 12, cursor: "pointer" };
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 99999, width: 286,
      background: "rgba(12,14,18,0.96)", color: "#e8eef0", border: "1px solid #2a2f37",
      padding: 14, fontFamily: "ui-monospace, monospace", boxShadow: "0 12px 40px rgba(0,0,0,0.55)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>TV screen fit</strong>
        <button style={btn} onClick={() => setFit(TV_FIT_DEFAULT)}>reset</button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <TvFitRow label="left" value={fit.left} min={0} max={60} onChange={up("left")} />
        <TvFitRow label="top" value={fit.top} min={0} max={60} onChange={up("top")} />
        <TvFitRow label="width" value={fit.width} min={10} max={90} onChange={up("width")} />
        <TvFitRow label="height" value={fit.height} min={10} max={90} onChange={up("height")} />
        <TvFitRow label="radius" value={fit.radius} min={0} max={30} onChange={up("radius")} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button style={btn} onClick={() => setFit((f) => ({ ...f, left: +((100 - f.width) / 2).toFixed(2) }))}>center ⇆</button>
        <button style={btn} onClick={() => navigator.clipboard && navigator.clipboard.writeText(css)}>copy CSS</button>
      </div>
      <pre style={{ marginTop: 10, fontSize: 11, background: "#0a0c10", padding: 8, whiteSpace: "pre-wrap", color: "#9fb1b8" }}>{css}</pre>
    </div>
  );
};

// Animated CRT static + VCR tracking noise (ported from Karl Saunders' pen).
// Low-res canvas stretched over the screen, screen-blended so the white specks
// read as glowing static over the dark picture. Disabled for reduced-motion.
const CrtNoise = () => {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) return undefined;
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const W = (canvas.width = 220);
    const H = (canvas.height = 165);
    const rand = (a, b) => a + Math.random() * (b - a);
    let raf;
    let last = 0;
    let trackY = H;
    const draw = (t) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 42) return; // ~24fps for an authentic flicker
      last = t;
      // --- snow / static ---
      const img = ctx.createImageData(W, H);
      const buf = new Uint32Array(img.data.buffer);
      for (let i = 0; i < buf.length; i++) {
        if (Math.random() < 0.16) {
          const v = rand(120, 255) | 0;
          buf[i] = (200 << 24) | (v << 16) | (v << 8) | v; // ABGR
        }
      }
      ctx.putImageData(img, 0, 0);
      // --- VCR tracking band rolling up the screen ---
      trackY -= 1.4;
      if (trackY < -30) trackY = H + rand(40, 180);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * W;
        const y = trackY + Math.random() * 22;
        ctx.fillRect(x, y, rand(1, 5), 1);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  return <canvas ref={ref} className="crt-noise" aria-hidden="true" />;
};

// "Signal lost" — a kernel-panic / crashed-renderer screen. The corrupt-shader
// globe glitches hard above a monospace error dump and a reboot prompt.
const GameOverShowcase = () => {
  const [fit, setFit] = useState(() => {
    try {
      const raw = localStorage.getItem(TV_FIT_KEY);
      if (raw) return { ...TV_FIT_DEFAULT, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return TV_FIT_DEFAULT;
  });
  const [showTuner, setShowTuner] = useState(false);
  useEffect(() => {
    setShowTuner(new URLSearchParams(window.location.search).has("tunetv"));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(TV_FIT_KEY, JSON.stringify(fit));
    } catch {
      /* ignore */
    }
  }, [fit]);

  const crtStyle = {
    "--crt-left": `${fit.left}%`,
    "--crt-top": `${fit.top}%`,
    "--crt-w": `${fit.width}%`,
    "--crt-h": `${fit.height}%`,
    "--crt-radius": `${fit.radius}% / ${(fit.radius * 1.27).toFixed(1)}%`,
  };

  return (
  <section
    id="gameover"
    className="showcase showcase--gameover signal-lost"
    style={{
      background: "#000",
      color: "#cdd4d2",
      fontFamily: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
    }}
  >
    {/* Photo of the room + Panasonic CRT; our screen overlays its glass. */}
    <div className="tv-stage">
      <div className="crt" style={crtStyle}>
        {/* Heavily corrupted globe — the crashed render. */}
        <div style={{ width: "56cqh", aspectRatio: "1 / 1", marginBottom: "-6cqh" }}>
          <LazyGlobe
            src={brandEmbedUrl("default", "gameover", "examples-gameover", {
              theme: "dark",
              config: {
                selection: "world",
                transparent: true,
                background: "#100008",
                density: 80,
                dotSize: 12,
                dotColor: "#ffffff",
                shape: "Square",
                renderMode: "dots",
                shaderSettings: {
                  effect: "corrupt",
                  cellSize: 5,
                  intensity: 92,
                  motion: 60,
                  split: 12,
                  grain: 60,
                  scanlines: 0,
                  threshold: 50,
                  warp: 42,
                },
                globeSettings: {
                  autoSpin: true,
                  autoSpinSpeed: 70,
                  glow: false,
                  grid: false,
                  surface: true,
                  surfaceStrength: 100,
                  surfaceColor: "#100008",
                },
              },
            })}
            title="Corrupted globe"
            className="showcase-globe"
            style={{ background: "transparent", aspectRatio: "1 / 1", width: "100%" }}
          />
        </div>
        <h2
          className="signal-glitch"
          style={{
            margin: 0,
            fontFamily: '"Geist Pixel", ui-monospace, monospace',
            fontSize: "9.5cqh",
            lineHeight: 1,
            letterSpacing: "0.05em",
            color: "#ffffff",
            textShadow: "0 0 3cqh rgba(255,60,86,0.45)",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Signal lost
          <span className="signal-cursor" aria-hidden="true" />
        </h2>
        {/* Monospace crash dump + reboot prompt. */}
        <div style={{ marginTop: "4cqh", fontSize: "2.5cqh", lineHeight: 1.7 }}>
          <div style={{ fontSize: "2cqh", lineHeight: 1.9 }}>
            <div style={{ color: "#ff5a6e" }}>FATAL: world_renderer.so crashed</div>
            <div style={{ color: "#7c878c" }}>signal 11 (SIGSEGV) at 0x0000007f</div>
            <div style={{ color: "#7c878c" }}>dots dropped: 14,203 / 196,400</div>
            <div style={{ color: "#7c878c" }}>connection to globe lost.</div>
          </div>
          <div style={{ marginTop: "4cqh", color: "#cdd4d2" }}>
            <span style={{ color: "#5a6468" }}>&gt; </span>
            reboot world? <span style={{ color: "#7c878c" }}>[Y/n]</span>
          </div>
          <div style={{ marginTop: "2.6cqh", display: "flex", alignItems: "center", justifyContent: "center", gap: "8cqh" }}>
            <span className="signal-yes" style={{ display: "inline-flex", alignItems: "center", gap: "2.6cqh", color: "#ffffff" }}>
              <span
                aria-hidden="true"
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "1.1cqh solid transparent",
                  borderBottom: "1.1cqh solid transparent",
                  borderLeft: "1.8cqh solid #43e03c",
                }}
              />
              YES
            </span>
            <span style={{ opacity: 0.45 }}>NO</span>
          </div>
        </div>
        {/* CRT frame overlays — scanlines, animated static, rolling refresh
            bar, then the curved-corner vignette on top. */}
        <div className="crt-scanlines" aria-hidden="true" />
        <CrtNoise />
        <div className="crt-rollbar" aria-hidden="true" />
        <div className="crt-vignette" aria-hidden="true" />
      </div>
    </div>
    {showTuner && <TvFitPanel fit={fit} setFit={setFit} />}
  </section>
  );
};

// Dev-only tuner (visit /examples?tunenews) to scale + recenter the halftone
// globe inside its press-photo frame. Reuses the TvFitRow slider row.
const NEWS_GLOBE_DEFAULT = { scale: 150, x: 0, y: 0 };
const NEWS_GLOBE_KEY = "globestudio:news-globe-v2";

const NewsGlobePanel = ({ v, setV }) => {
  const up = (k) => (val) => setV((s) => ({ ...s, [k]: val }));
  const css = `transform: translate(${v.x}%, ${v.y}%) scale(${(v.scale / 100).toFixed(2)});`;
  const btn = { background: "#1c2230", color: "#dfe7ea", border: "1px solid #333", padding: "5px 9px", fontSize: 12, cursor: "pointer" };
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 99999, width: 286,
      background: "rgba(12,14,18,0.96)", color: "#e8eef0", border: "1px solid #2a2f37",
      padding: 14, fontFamily: "ui-monospace, monospace", boxShadow: "0 12px 40px rgba(0,0,0,0.55)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>Globe fit</strong>
        <button style={btn} onClick={() => setV(NEWS_GLOBE_DEFAULT)}>reset</button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <TvFitRow label="scale" value={v.scale} min={40} max={400} onChange={up("scale")} />
        <TvFitRow label="x" value={v.x} min={-50} max={50} onChange={up("x")} />
        <TvFitRow label="y" value={v.y} min={-50} max={50} onChange={up("y")} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button style={btn} onClick={() => setV((s) => ({ ...s, x: 0, y: 0 }))}>center</button>
        <button style={btn} onClick={() => navigator.clipboard && navigator.clipboard.writeText(css)}>copy CSS</button>
      </div>
      <pre style={{ marginTop: 10, fontSize: 11, background: "#0a0c10", padding: 8, whiteSpace: "pre-wrap", color: "#9fb1b8" }}>{css}</pre>
    </div>
  );
};

// "The Globe Dispatch" — a vintage broadsheet front page where the rotating
// halftone globe stands in for the lead press photo (newspaper photos were
// halftone dot screens). Aged paper, blackletter masthead, justified columns.
const NewsShowcase = () => {
  const [globe, setGlobe] = useState(() => {
    try {
      const raw = localStorage.getItem(NEWS_GLOBE_KEY);
      if (raw) return { ...NEWS_GLOBE_DEFAULT, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return NEWS_GLOBE_DEFAULT;
  });
  const [showTuner, setShowTuner] = useState(false);
  useEffect(() => {
    setShowTuner(new URLSearchParams(window.location.search).has("tunenews"));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(NEWS_GLOBE_KEY, JSON.stringify(globe));
    } catch {
      /* ignore */
    }
  }, [globe]);

  const globeStyle = {
    "--news-globe-scale": globe.scale,
    "--news-globe-x": `${globe.x}%`,
    "--news-globe-y": `${globe.y}%`,
  };

  return (
  <section id="news" className="showcase showcase--news newsroom">
    <div className="news-paper">
      <header className="news-masthead">
        <div className="news-mast-side">Est.<br />MMXXVI</div>
        <h1 className="news-title">The Globe Dispatch</h1>
        <div className="news-mast-side">World<br />Edition</div>
      </header>
      <div className="news-dateline">
        <span>Vol. CXXIV · No. 195</span>
        <span>May 29, 2026</span>
        <span>Printed in 196,400 dots</span>
        <span>Price: One Dot</span>
      </div>
      <div className="news-body">
        <aside className="news-col">
          <h3 className="news-kicker">On the Wire</h3>
          <p>
            Reports continue to arrive from every meridian confirming the same
            dispatch: the world, against all odds, is still turning.
          </p>
          <p>
            Officials urged calm. “It has done this every day for some time,” a
            spokesman noted, “and we fully expect it to continue.”
          </p>
          <p>
            Eyewitnesses described the motion as “smooth,” “uneventful,” and,
            from close range, “frankly rather beautiful.”
          </p>
          <p>
            The Meteorological Office added that conditions remained “largely
            atmospheric,” with visibility extending, in places, to the horizon.
          </p>
          <h3 className="news-kicker">Index</h3>
          <ul className="news-index">
            <li>Weather <span>Scattered dots</span></li>
            <li>Markets <span>Dots ▲ 2</span></li>
            <li>Rotation <span>On schedule</span></li>
            <li>Tides <span>Coming, going</span></li>
            <li>Horizon <span>Curved, as ever</span></li>
            <li>Outlook <span>Spherical</span></li>
          </ul>
          <h3 className="news-kicker">Late Bulletin</h3>
          <p>
            The Bureau of Longitude reports all 360 degrees present and in their
            usual order, pending the customary review.
          </p>
          <h3 className="news-kicker">Quoted</h3>
          <blockquote className="news-quote">
            “We checked twice. It is, reassuringly, still round.”
            <cite>— Office of the Cartographer Royal</cite>
          </blockquote>
          <h3 className="news-kicker">Also Inside</h3>
          <ul className="news-index">
            <li>Letters <span>p. 4</span></li>
            <li>Almanac <span>p. 7</span></li>
            <li>Horizons <span>p. 12</span></li>
            <li>Crossword <span>p. 16</span></li>
          </ul>
        </aside>
        <div className="news-main">
          <h2 className="news-headline">The World, Rendered</h2>
          <p className="news-deck">
            After 4.5 billion years, Earth keeps its appointment — printed here
            in full halftone, one dot at a time.
          </p>
          <figure className="news-photo">
            <div className="news-photo-frame">
              <div className="news-globe" style={globeStyle}>
                <LazyGlobe
                src={brandEmbedUrl("halftone", "news", "examples-news", {
                  theme: "light",
                  config: {
                    selection: "world",
                    // Transparent so the newspaper-cream page shows THROUGH the
                    // iframe and the halftone globe reads as dark-ink press photo
                    // on paper. Same-origin embeds skip the `only light` UA scheme
                    // (see embed-view.jsx + index.html) that used to paint a white
                    // box over the cream.
                    transparent: true,
                    background: "#f1e8d4",
                    density: 90,
                    dotSize: 9,
                    dotColor: "#1a1610",
                    shape: "Circle",
                    renderMode: "dots",
                    shaderSettings: {
                      effect: "halftone",
                      intensity: 58,
                      cellSize: 6,
                      motion: 20,
                      scanlines: 0,
                      grain: 0,
                      split: 0,
                      threshold: 50,
                      warp: 0,
                    },
                    globeSettings: {
                      autoSpin: true,
                      autoSpinSpeed: 22,
                      glow: false,
                      grid: false,
                      // Tinted sphere so the globe reads as a full halftone disc
                      // — the oceans/body pick up a faint dark-ink wash (and the
                      // halftone screen) instead of the continents floating on
                      // bare paper.
                      surface: true,
                      surfaceColor: "#1a1610",
                      surfaceStrength: 24,
                    },
                  },
                })}
                  title="Halftone globe"
                  className="showcase-globe"
                  style={{ background: "transparent", width: "100%", aspectRatio: "1 / 1" }}
                />
              </div>
            </div>
            <figcaption>
              THE EARTH, photographed mid-spin from the newsroom window.
              — Staff dot-photography
            </figcaption>
          </figure>
          <div className="news-text">
            <p>
              Cartographers working through the night re-counted the continents
              and found them, reassuringly, all present and accounted for. A
              correspondent stationed at the equator filed only two words before
              deadline: “Still spinning.”
            </p>
            <p>
              From the wire desk: dispatches confirm sunrise occurred on schedule
              in all reporting zones, with no objections formally filed.
            </p>
            <p>
              Analysts cautioned against complacency, noting the planet remains
              under no obligation to continue — and does so, they stress, purely
              out of long-standing habit.
            </p>
            <p>
              Markets greeted the news with characteristic indifference, the Dot
              Index closing two points higher on famously light trading.
            </p>
            <p>
              In the capitals, ministers convened to affirm their continued
              support for the planet’s rotation while declining, as ever, to
              take any personal credit for it.
            </p>
            <h4 className="news-subhead">No End in Sight</h4>
            <p>
              The Institute for Obvious Phenomena released a four-hundred-page
              study whose abstract read, in its entirety: “Yes.”
            </p>
            <p>
              Abroad, the sun again rose in the east, prompting renewed calls for
              a formal inquiry into precisely why it insists on doing so.
            </p>
            <p>
              Readers wishing to confirm the rotation independently were advised
              to stand quite still and wait.
            </p>
            <p className="news-byline">By A. Staff Writer</p>
          </div>
        </div>
      </div>
    </div>
    {showTuner && <NewsGlobePanel v={globe} setV={setGlobe} />}
  </section>
  );
};

const ProfoundShowcase = () => (
  <section
    id="profound"
    className="showcase showcase--profound"
    style={{
      background: "#FAFAFA",
      color: "#0A0A0A",
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    }}
  >
    <CompanyNav
      brand={<ProfoundMark size={18} />}
      items={["Platform", "Pricing", "Customers", "Company"]}
      right={
        <>
          <span className="showcase-nav-link" style={{ color: "#6B7280" }}>Sign in</span>
          <span className="showcase-nav-cta" style={{ background: "#0B1F4B", color: "#fff" }}>
            Get a Demo
          </span>
        </>
      }
      style={{ borderBottom: "1px solid rgba(11, 31, 75, 0.08)", color: "#0B1F4B" }}
    />
    <div className="showcase-inner showcase-inner--split">
      <div className="showcase-copy">
        <span className="showcase-eyebrow" style={{ color: "#00B3A4", letterSpacing: "0.14em" }}>
          AI SEARCH ANALYTICS
        </span>
        <h2 className="showcase-headline" style={{ color: "#0A0A0A", fontWeight: 600 }}>
          Win in{" "}
          <span className="profound-engine-cycle" style={{ color: "#0B1F4B" }} aria-label="every AI engine">
            <span className="profound-engine-track">
              <span>Perplexity</span>
              <span>ChatGPT</span>
              <span>Claude</span>
              <span>Gemini</span>
              <span>Grok</span>
              <span>Copilot</span>
              <span>Perplexity</span>
            </span>
          </span>
        </h2>
        <p className="showcase-subhead" style={{ color: "#6B7280" }}>
          1.5 billion+ prompts analyzed across 150+ regions and 30+ languages — live, weekly-refreshed visibility into what every assistant says about you.
        </p>
        <div className="showcase-ctas">
          <span className="showcase-cta showcase-cta--primary" style={{ background: "#0B1F4B", color: "#fff" }}>
            Get a Demo
          </span>
          <span className="showcase-cta showcase-cta--ghost" style={{ color: "#0B1F4B", borderColor: "#0B1F4B" }}>
            Get Started
          </span>
        </div>
      </div>
      {/* Fake Profound dashboard chrome around the globe — filter chips
          at top, globe canvas in middle, live mention counter at bottom.
          Reads as "this is a screenshot of the product" without us
          having to ship a separate product UI mockup. */}
      <div
        style={{
          width: "100%",
          maxWidth: 540,
          borderRadius: 16,
          background: "#fff",
          border: "1px solid rgba(11, 31, 75, 0.08)",
          boxShadow: "0 40px 100px -30px rgba(11, 31, 75, 0.18), 0 8px 24px -12px rgba(11, 31, 75, 0.12)",
          overflow: "hidden",
        }}
      >
        {/* Filter chips row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 16px",
            borderBottom: "1px solid rgba(11, 31, 75, 0.08)",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {["All engines", "30 days", "150 regions", "EN"].map((c) => (
            <span
              key={c}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: "#F1F4F9",
                color: "#0B1F4B",
              }}
            >
              {c}
            </span>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#6B7280", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "#00B3A4", boxShadow: "0 0 0 3px rgba(0,179,164,0.2)" }} />
            LIVE
          </span>
        </div>

        <LazyGlobe
          src={brandEmbedUrl("default", "profound", "examples-profound")}
          title="Profound-flavored globe"
          style={{
            background: "#0B1F4B",
            aspectRatio: "5 / 4",
            width: "100%",
          }}
        />

        {/* Footer: mention counter + engine breakdown */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderTop: "1px solid rgba(11, 31, 75, 0.08)",
            fontSize: 12,
            color: "#0B1F4B",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <strong style={{ fontSize: 22, fontWeight: 700 }}>1,577</strong>
            <span style={{ color: "#6B7280", fontWeight: 500 }}>mentions this week</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(16,185,129,0.12)", color: "#059669", fontWeight: 700, fontSize: 10 }}>
              GOOD 61%
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const LinearShowcase = () => (
  <section
    id="linear"
    className="showcase showcase--linear"
    style={{
      background: "#08090A",
      color: "#F7F8F8",
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Inter", sans-serif',
    }}
  >
    <CompanyNav
      brand={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#F7F8F8", fontWeight: 600, letterSpacing: "-0.01em", fontSize: 16 }}>
          <LinearMark size={18} />
          Linear
        </span>
      }
      items={["Product", "Pricing", "Customers", "Method", "Now"]}
      right={
        <>
          <span className="showcase-nav-link" style={{ color: "rgba(247,248,248,0.7)" }}>Log in</span>
          <span className="showcase-nav-cta" style={{ background: "#F7F8F8", color: "#08090A" }}>
            Sign up
          </span>
        </>
      }
      style={{ borderBottom: "1px solid rgba(247, 248, 248, 0.08)", color: "#F7F8F8" }}
    />
    <div className="showcase-inner showcase-inner--centered">
      <span className="showcase-eyebrow" style={{ color: "#5E6AD2" }}>
        BUILT FOR PRODUCT TEAMS
      </span>
      <h2
        className="showcase-headline"
        style={{
          color: "#F7F8F8",
          fontWeight: 600,
          letterSpacing: "-0.025em",
        }}
      >
        The product development system<br />for teams and agents.
      </h2>
      <p className="showcase-subhead" style={{ color: "rgba(247, 248, 248, 0.6)" }}>
        Purpose-built for planning and building products. Designed for the AI era.
      </p>
      <div className="showcase-ctas">
        <span className="showcase-cta showcase-cta--primary" style={{ background: "#F7F8F8", color: "#08090A" }}>
          Start free
        </span>
        <span className="showcase-cta showcase-cta--ghost" style={{ color: "#F7F8F8", borderColor: "rgba(247, 248, 248, 0.18)" }}>
          Talk to sales
        </span>
      </div>
      <div style={{ position: "relative", marginTop: 48, maxWidth: 540, width: "100%", aspectRatio: "1 / 1" }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: -60,
            background: "radial-gradient(circle at 50% 50%, rgba(94, 106, 210, 0.4), rgba(94, 106, 210, 0) 62%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
        <LazyGlobe
          src={brandEmbedUrl("aurora", "linear", "examples-linear")}
          title="Linear-flavored globe"
          className="showcase-globe"
          style={{
            background: "transparent",
            aspectRatio: "1 / 1",
            width: "100%",
            position: "relative",
          }}
        />
        {/* Floating "issue card" overlay — Linear's annotated-screenshot
            pattern; sits over the top-right of the globe, signals
            "this is a Linear-native product view of global team data." */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            padding: "12px 16px",
            background: "rgba(20, 21, 26, 0.94)",
            border: "1px solid rgba(247, 248, 248, 0.1)",
            borderRadius: 10,
            color: "#F7F8F8",
            fontSize: 12,
            maxWidth: 240,
            boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            zIndex: 2,
            textAlign: "left",
          }}
        >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, color: "#5E6AD2", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em" }}>
          <span style={{ width: 6, height: 6, borderRadius: 2, background: "#5E6AD2" }} />
          ENG-247
        </div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>World expansion: edge regions Q1</div>
        <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
          {["E", "A", "R"].map((init, i) => (
            <div
              key={init}
              style={{
                width: 20,
                height: 20,
                borderRadius: 999,
                background: ["#FF9F8C", "#A6F0C6", "#A4B3FF"][i],
                color: "#0a0a0a",
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {init}
            </div>
          ))}
          <span style={{ color: "rgba(247,248,248,0.5)", fontSize: 11, marginLeft: 4 }}>+ 5</span>
        </div>
      </div>
      </div>
      <div className="showcase-stats" style={{ marginTop: 56 }}>
        {[
          { v: "25,000", l: "product teams" },
          { v: "3.3×", l: "faster issue resolution" },
          { v: "28%", l: "issues authored by agents" },
        ].map((s) => (
          <div key={s.l} className="showcase-stat">
            <strong style={{ color: "#F7F8F8" }}>{s.v}</strong>
            <span style={{ color: "rgba(247, 248, 248, 0.6)" }}>{s.l}</span>
          </div>
        ))}
      </div>
      <LogoWall
        color="rgba(247, 248, 248, 0.7)"
        label="Customers"
        logos={[
          { name: "OpenAI", weight: 600 },
          { name: "Mercury", weight: 600 },
          { name: "Vercel", weight: 700 },
          { name: "Ramp", weight: 700, tracking: "-0.02em" },
          { name: "Cursor", weight: 600 },
        ]}
      />
    </div>
  </section>
);

// --- Dev-only globe tuner --------------------------------------------------
// A floating control panel (DEV only) for visually positioning the Stripe
// hero globe: tilt (view-from-above / left-right), size, and the crop
// offsets. Live preview; persists to localStorage so a page reload keeps
// your tweaks; "Copy values" emits the exact numbers to paste back into the
// hardcoded defaults below. Never ships — the panel render is
// import.meta.env.DEV-gated and production always uses STRIPE_GLOBE_DEFAULTS.
const STRIPE_GLOBE_DEFAULTS = {
  tiltX: 36,
  tiltY: -14,
  spin: 26,
  width: 1650,
  right: -690,
  bottom: -360,
};

const STRIPE_TUNER_FIELDS = [
  { key: "tiltX", label: "Tilt ↑ (above)", min: -90, max: 90, step: 1 },
  { key: "tiltY", label: "Tilt → (turn)", min: -90, max: 90, step: 1 },
  { key: "spin", label: "Spin speed", min: 0, max: 100, step: 1 },
  { key: "width", label: "Size (px)", min: 600, max: 2400, step: 10 },
  { key: "right", label: "X offset (right)", min: -1400, max: 200, step: 10 },
  { key: "bottom", label: "Y offset (bottom)", min: -1400, max: 200, step: 10 },
];

// Holds the tuner state. tilt + spin feed the embed URL (so they're debounced
// — changing them reloads the iframe), while size/offsets are parent CSS and
// apply live. In production this is inert: it returns the static defaults and
// runs no storage/debounce effects.
const useGlobeTuner = (storageKey, defaults) => {
  const [values, setValues] = useState(() => {
    if (!import.meta.env.DEV || typeof localStorage === "undefined") return defaults;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });
  const [committed, setCommitted] = useState(values);
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const id = setTimeout(() => setCommitted(values), 220);
    return () => clearTimeout(id);
  }, [values]);
  useEffect(() => {
    if (!import.meta.env.DEV || typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(values));
    } catch {
      /* private mode / quota — tuning just won't persist */
    }
  }, [storageKey, values]);
  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  const reset = () => setValues(defaults);
  return { values, committed, set, reset };
};

const GlobeTunerPanel = ({ values, fields, set, reset, label = "Stripe", side = "left" }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(values, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — values are still visible in the panel */
    }
  };
  const btn = {
    flex: 1,
    padding: "7px 8px",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 7,
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    font: "inherit",
    cursor: "pointer",
  };
  return (
    <div
      style={{
        position: "fixed",
        left: side === "right" ? "auto" : 16,
        right: side === "right" ? 16 : "auto",
        bottom: 16,
        zIndex: 99999,
        width: 256,
        padding: 14,
        borderRadius: 12,
        background: "rgba(17,17,20,0.94)",
        color: "#fff",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
        lineHeight: 1.3,
        boxShadow: "0 10px 34px rgba(0,0,0,0.45)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, fontWeight: 700, fontSize: 12 }}>
        <span>Globe tuner</span>
        <span style={{ opacity: 0.45, fontWeight: 500 }}>DEV · {label}</span>
      </div>
      {fields.map((f) => (
        <label key={f.key} style={{ display: "block", marginBottom: 9 }}>
          <span style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ opacity: 0.8 }}>{f.label}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{values[f.key]}</span>
          </span>
          <input
            type="range"
            min={f.min}
            max={f.max}
            step={f.step}
            value={values[f.key]}
            onChange={(e) => set(f.key, Number(e.target.value))}
            style={{ width: "100%", accentColor: "#6a00ff" }}
          />
        </label>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" onClick={copy} style={{ ...btn, background: copied ? "#6a00ff" : btn.background, borderColor: copied ? "#6a00ff" : btn.border }}>
          {copied ? "Copied ✓" : "Copy values"}
        </button>
        <button type="button" onClick={reset} style={btn}>
          Reset
        </button>
      </div>
    </div>
  );
};

// A tiny flag beside "195 countries" that rotates through a handful of
// country flags (flag-icons 4x3, served from the alevizio/icons CDN). Each
// swap flips in like a little coin; static under prefers-reduced-motion.
const FLAG_CODES = ["us", "gb", "jp", "br", "fr", "de", "in", "mx", "za", "au", "ca", "kr"];

const RotatingFlag = ({ height = 13 }) => {
  const [index, setIndex] = useState(0);
  const reduceMotion = usePrefersReducedMotion();
  useEffect(() => {
    if (reduceMotion) return undefined;
    const id = setInterval(
      () => setIndex((n) => (n + 1) % FLAG_CODES.length),
      1700,
    );
    return () => clearInterval(id);
  }, [reduceMotion]);
  const code = FLAG_CODES[index];
  return (
    <img
      key={code}
      className="rotating-flag"
      src={`https://alevizio.github.io/icons/svg/flag-icons/4x3/${code}.svg`}
      alt=""
      aria-hidden="true"
      width={Math.round((height * 4) / 3)}
      height={height}
      style={{
        display: "inline-block",
        objectFit: "cover",
        boxShadow: "0 0 0 1px rgba(10,37,64,0.1)",
      }}
    />
  );
};

const StripeShowcase = () => {
  const { values, committed, set, reset } = useGlobeTuner(
    "globestudio:stripe-globe-tune",
    STRIPE_GLOBE_DEFAULTS,
  );
  return (
  <section
    id="stripe"
    className="showcase showcase--stripe"
    style={{
      background: "#FFFFFF",
      color: "#0d253d",
      // Söhne web font (licensed — see public/showcase-fonts/) with Inter as
      // the fallback while it loads / if it fails.
      fontFamily: '"Sohne Local", "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      borderBottom: "1px solid rgba(10,37,64,0.1)",
    }}
  >
    <style>{`@font-face{font-family:"Sohne Local";src:url("/showcase-fonts/sohne.woff2") format("woff2");font-weight:100 800;font-style:normal;font-display:swap;}`}</style>
    {/* Background gradient removed — the globe is the hero visual now. */}
    {/* Vertical container rules — frame the hero at the edges of the nav's
        container width. They start at the nav's bottom hairline (not the
        section top) so they read as dropping down from the nav header
        rather than running up through it. */}
    <div aria-hidden="true" style={{ position: "absolute", top: 76, left: 0, right: 0, bottom: 0, zIndex: 1, pointerEvents: "none", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 1262, height: "100%", borderLeft: "1px solid rgba(10,37,64,0.07)", borderRight: "1px solid rgba(10,37,64,0.07)" }} />
    </div>
    {/* Flow-shader backdrop — aligned to the vertical container rules above
        (same top:76 + maxWidth:1262, centered) and run full-height behind the
        hero so the wash fills the framed area. Same flow shader as the app, at
        low opacity over the white section so the navy copy stays legible.
        zIndex 0 sits below the rules + copy (z1) and below the globe (z2). */}
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        // Meet the marquee's top hairline. Strip = borders(2) + padding(48) +
        // ~36px logos ≈ 86px, plus the inner's 34px bottom padding ≈ 120px
        // from the section bottom.
        bottom: 120,
        zIndex: 0,
        pointerEvents: "none",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "relative", width: "100%", maxWidth: 1262, height: "100%", overflow: "hidden" }}>
        <FlowBackdrop
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.22 }}
        />
        <div
          className="stripe-wash stripe-wash-a"
          style={{
            position: "absolute",
            // Start below the nav so the shader stays visible (and blurrable)
            // behind the frosted nav instead of being whitened out.
            top: 77,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.22) 55%, rgba(255,255,255,0) 100%)",
          }}
        />
        {/* White wash toward the globe — horizontal, transparent on the left
            ramping to fully white near the right (~88%) where the globe sits,
            so the shader fades to clean white under the globe. */}
        <div
          className="stripe-wash stripe-wash-b"
          style={{
            position: "absolute",
            top: 77,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 88%)",
          }}
        />
      </div>
    </div>
    <CompanyNav
      brand={<img src="/showcase-logos/stripe.svg" alt="Stripe" style={{ height: 25, display: "block" }} />}
      items={["Products", "Solutions", "Developers", "Resources", "Pricing"]}
      right={
        <>
          <span className="showcase-nav-cta" style={{ background: "#fff", color: "#0a2540", border: "1px solid #d4dde6", borderRadius: 4, fontWeight: 400, fontSize: 14, padding: "11px 16px", boxShadow: "0 1px 1px rgba(10,37,64,0.05)" }}>Sign in</span>
          <span className="showcase-nav-cta" style={{ background: "#533afd", color: "#fff", borderRadius: 4, fontWeight: 400, fontSize: 14, padding: "11px 16px" }}>
            Contact sales ›
          </span>
        </>
      }
      style={{ color: "#0d253d", position: "relative", zIndex: 2, borderBottom: "1px solid rgba(10,37,64,0.08)", background: "rgba(255,255,255,0.42)", backdropFilter: "blur(16px) saturate(150%)", WebkitBackdropFilter: "blur(16px) saturate(150%)" }}
    />
    {/* Left-anchored copy column — Stripe's hero is NOT centered. Copy
        sits in the left ~58%, the ribbon owns the right. */}
    <div
      className="showcase-inner"
      style={{
        position: "relative",
        zIndex: 2,
        flex: "1 1 auto",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        textAlign: "left",
        maxWidth: 1262,
        // Top pad 0 + gap 0 so the copy wrapper's centering region spans
        // exactly nav-bottom → marquee-top (the flow rectangle), centering the
        // copy between the two lines. paddingBottom 34 still seats the marquee.
        padding: "0px 24px 34px",
        gap: 0,
      }}
    >
      {/* Mobile-only white veil over the globe, spanning nav-bottom → logo
          strip (inset:0 in the inner). z-index:-1 keeps it under the copy, but
          since the inner is its own z2 layer it still sits above the globe
          (z1). Lifts the centered text off the busy globe. */}
      <div className="stripe-hero-scrim" aria-hidden="true" />
      {/* Center the copy block in the flow rectangle — this wrapper grows to
          fill the space above the marquee and centers the copy on both axes. */}
      <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%" }}>
      <div className="stripe-hero-copy" style={{ maxWidth: 1180, transform: "translate(64px, -48px)" }}>
        <div
          className="stripe-eyebrow"
          style={{
            fontSize: 14,
            color: "#0d253d",
            fontWeight: 500,
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Payments now live across
          <span style={{ fontVariantNumeric: "tabular-nums", color: "#533afd", fontWeight: 600 }}>
            195 countries
          </span>
          <RotatingFlag />
        </div>
        {/* Light-weight Söhne-style headline: dark first sentence,
            then the rest flows in blue — exactly like the real site. */}
        <h2
          style={{
            margin: 0,
            // 48px / weight 300 / -0.96px in a wide column so the headline
            // wraps to fewer lines across the white hero.
            fontSize: "clamp(32px, 3.4vw, 48px)",
            lineHeight: 1.15,
            fontWeight: 300,
            letterSpacing: "-0.96px",
            fontFeatureSettings: '"ss01"',
            color: "#0a2540",
            maxWidth: 1180,
            textWrap: "balance",
            // Blend the copy onto the globe behind it — multiply keeps the
            // dark text readable while letting the globe show through.
            mixBlendMode: "multiply",
          }}
        >
          Payments infrastructure that spans the globe.{" "}
          <span style={{ color: "#41597a" }}>
            Accept money across borders, settle in local currency, and reach
            customers in every time zone—from your first transaction to your
            billionth.
          </span>
        </h2>
        <div className="showcase-ctas" style={{ justifyContent: "flex-start", marginTop: 44, gap: 12 }}>
          <span
            className="showcase-cta showcase-cta--primary"
            style={{ background: "#533afd", color: "#fff", fontWeight: 400, fontSize: 16, padding: "15px 24px", borderRadius: 16, boxShadow: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Get started
            <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1, fontWeight: 400 }}>›</span>
          </span>
          <span
            className="showcase-cta"
            style={{
              background: "#fff",
              color: "#533afd",
              border: "1px solid #d4dde6",
              borderRadius: 16,
              boxShadow: "none",
              fontWeight: 400,
              fontSize: 16,
              padding: "15px 24px",
              display: "inline-flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            {/* Official multi-colour Google "G" mark (standard sign-in glyph). */}
            <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Sign up with Google
          </span>
        </div>

      </div>
      </div>
      {/* Customer logo marquee — flow element spanning the full container
          width (line to line, bleeding to the vertical rules) with a
          hairline above. Infinite scroll; the track holds the list twice
          for a seamless -50% loop. */}
      <div className="stripe-logo-strip" style={{ width: "100vw", marginLeft: "calc(50% - 50vw)", borderTop: "1px solid rgba(10,37,64,0.1)", borderBottom: "1px solid rgba(10,37,64,0.1)", paddingTop: 24, paddingBottom: 24 }}>
        {/* Lines stay full-bleed; the logo track is clipped to the 1262
            container (the vertical rules) — no gutters, so logos crop exactly
            at the lines. */}
        <div style={{ maxWidth: 1262, margin: "0 auto" }}>
        <div className="stripe-logo-marquee">
          <div className="stripe-logo-marquee-track">
            {(() => {
              const logos = [
                { name: "Vercel", file: "vercel.svg", weight: 600, h: 32 },
                { name: "Uber", file: "uber.svg", weight: 700, h: 30 },
                { name: "Anthropic", file: "anthropic.svg", weight: 500, tracking: "0.02em", h: 28 },
                { name: "Lightspeed", file: "lightspeed.svg", weight: 600, h: 32 },
                { name: "Cursor", file: "cursor.svg", weight: 600, tracking: "0.04em", h: 30 },
                { name: "OpenAI", file: "openai.svg", weight: 500, h: 32 },
                { name: "amazon", file: "amazon.svg", weight: 700, h: 36 },
                { name: "NVIDIA", file: "nvidia.svg", weight: 700, tracking: "0.02em", h: 32 },
              ];
              return [...logos, ...logos].map((l, i) => {
                const hidden = i >= logos.length;
                return (
                  <img
                    key={l.name + i}
                    src={`/showcase-logos/${l.file}`}
                    alt={hidden ? "" : l.name}
                    aria-hidden={hidden ? "true" : undefined}
                    style={{ height: l.h, width: "auto", display: "block", flexShrink: 0 }}
                    // If a logo asset is ever missing, fall back to the
                    // styled text wordmark instead of a broken image.
                    onError={(e) => {
                      const span = document.createElement("span");
                      span.textContent = l.name;
                      span.style.cssText = `font-family:"Inter",system-ui,sans-serif;font-weight:${l.weight};letter-spacing:${l.tracking || "-0.01em"};font-size:27px;color:#697386;white-space:nowrap;`;
                      if (hidden) span.setAttribute("aria-hidden", "true");
                      e.currentTarget.replaceWith(span);
                    }}
                  />
                );
              });
            })()}
          </div>
        </div>
        </div>
      </div>
    </div>
    {/* Globe — large, cropped into the section's bottom-right corner (the
        section clips overflow). No backdrop; the dotted planet bleeds off
        the corner as the hero visual. */}
    <div
      style={{
        position: "absolute",
        right: `${values.right}px`,
        bottom: `${values.bottom}px`,
        width: `${values.width}px`,
        aspectRatio: "1 / 1",
        zIndex: 1,
        pointerEvents: "none",
      }}
    >
      <LazyGlobe
        src={brandEmbedUrl("default", "stripe", "examples-stripe", {
          theme: "light",
          // globestudio-world-globe.json design: a dense dotted world with a
          // graticule grid, routes, and mono purple network arcs, spinning.
          // Composited transparent onto the section's white (the proven
          // showcase pattern). Two palette tweaks vs. the source file: the
          // dots/grid are darkened from the file's light-grey — those were
          // tuned to sit on a solid grey sphere, but a transparent composite
          // hides that sphere (depth-only), so light dots would vanish on
          // white. Darkening makes the dotted world read on the white hero.
          config: {
            selection: "world",
            transparent: true,
            backgroundStyle: "solid",
            density: 77,
            dotSize: 6.3,
            // Light, airy greys to match the hero's hairline rules
            // (rgba(10,37,64,~0.08) ≈ a very pale blue-grey on white). Dots
            // sit a touch darker than the grid so the dotted continents still
            // read against the white section.
            dotColor: "#c3c8d2",
            shape: "Circle",
            renderMode: "dots",
            worldStroke: "#dde1e9",
            worldStrokeWidth: 1.8,
            mapDepth: 55,
            // Tilt + spin driven by the dev Globe tuner (committed/debounced
            // so dragging a slider doesn't thrash the iframe). Production uses
            // the STRIPE_GLOBE_DEFAULTS baked above.
            tiltX: committed.tiltX,
            tiltY: committed.tiltY,
            globeSettings: {
              autoSpin: true,
              autoSpinSpeed: committed.spin,
              glow: false,
              grid: true,
              gridColor: "#dde1e9",
              gridSize: 24,
              gridStrength: 100,
              look: "classic",
              network: true,
              networkStrength: 70,
              networkArcs: 60,
              networkPulses: 50,
              arcColor: "#6a00ff",
              pulseColor: "#b56b9c",
              networkMono: true,
              routes: true,
              routesStrength: 88,
              surface: false,
            },
            shaderSettings: {
              effect: "none",
              intensity: 45,
              split: 7,
              grain: 8,
              scanlines: 36,
              cellSize: 14,
              threshold: 50,
              warp: 24,
              motion: 35,
            },
          },
        })}
        title="Stripe global payments globe"
        className="showcase-globe"
        style={{ background: "transparent", aspectRatio: "1 / 1", width: "100%" }}
      />
    </div>
    {/* Globe tuner panel — hidden by default. Append ?tune to the URL in dev
        to show it (e.g. /examples?tune). The useGlobeTuner hook above still
        feeds the baked STRIPE_GLOBE_DEFAULTS into the globe either way. */}
    {import.meta.env.DEV &&
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("tune") && (
        <GlobeTunerPanel values={values} fields={STRIPE_TUNER_FIELDS} set={set} reset={reset} />
      )}
  </section>
  );
};

const EarthscaleShowcase = () => (
  <section
    id="earthscale"
    className="showcase showcase--earthscale"
    style={{
      background: "#1d1a16",
      color: "#ece7da",
      fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
      position: "relative",
      overflow: "hidden",
    }}
  >
    <LazyGlobe
      src={brandEmbedUrl("bloom", "earthscale", "examples-earthscale")}
      title="Earthscale-flavored globe"
      className="showcase-globe-backdrop"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.55,
      }}
    />
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(180deg, rgba(29,26,22,0.65) 0%, rgba(29,26,22,0.35) 40%, rgba(29,26,22,0.85) 100%)",
        pointerEvents: "none",
      }}
    />
    <CompanyNav
      brand={<EarthscaleMark size={16} />}
      items={["Team"]}
      right={
        <>
          <span className="showcase-nav-link" style={{ color: "rgba(236, 231, 218, 0.7)", fontFamily: 'ui-sans-serif, system-ui' }}>Book a Demo</span>
          <span className="showcase-nav-cta" style={{ background: "#d99c66", color: "#1d1a16", boxShadow: "0 0 0 4px rgba(217, 156, 102, 0.2)" }}>
            Request Trial
          </span>
        </>
      }
      style={{
        position: "relative",
        zIndex: 1,
        borderBottom: "1px solid rgba(236, 231, 218, 0.08)",
        color: "#ece7da",
        background: "rgba(29, 26, 22, 0.4)",
        backdropFilter: "blur(12px)",
      }}
    />
    <div className="showcase-inner showcase-inner--centered" style={{ position: "relative" }}>
      <span
        className="showcase-eyebrow"
        style={{
          color: "#d99c66",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          letterSpacing: "0.14em",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "#d99c66",
            marginRight: 8,
            verticalAlign: "middle",
            boxShadow: "0 0 0 3px rgba(217,156,102,0.2)",
          }}
        />
        TIME-TO-POWER INTELLIGENCE
      </span>
      <h2
        className="showcase-headline"
        style={{
          color: "#f5f0e2",
          fontWeight: 500,
          letterSpacing: "-0.02em",
        }}
      >
        Read the signals<br />that shape every project.
      </h2>
      <p
        className="showcase-subhead"
        style={{
          color: "rgba(236, 231, 218, 0.75)",
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        AI agents parse permits, grid plans, and supply-chain lead times — across every project on earth.
      </p>
      <div className="showcase-ctas">
        <span
          className="showcase-cta showcase-cta--primary"
          style={{
            background: "#d99c66",
            color: "#1d1a16",
            boxShadow: "0 0 0 6px rgba(217, 156, 102, 0.18)",
          }}
        >
          Request a Trial Analysis
        </span>
        <span
          className="showcase-cta showcase-cta--ghost"
          style={{ color: "#ece7da", borderColor: "rgba(236, 231, 218, 0.2)" }}
        >
          Book a Demo
        </span>
      </div>
      {/* Earthscale team row — their site's signature founders card pattern.
          4 circular avatars with role labels in JetBrains Mono small caps,
          each tagged with the brand's amber dot. */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 40,
          marginTop: 64,
          flexWrap: "wrap",
        }}
      >
        {[
          { name: "Felix Dorrek", role: "CO-FOUNDER", initial: "F" },
          { name: "Noah Golmant", role: "CO-FOUNDER", initial: "N" },
          { name: "Anya Petrova", role: "ENGINEER", initial: "A" },
          { name: "Mark Reyes", role: "GEOSPATIAL", initial: "M" },
        ].map((m, i) => (
          <div
            key={m.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#ece7da",
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                clipPath: "circle(48%)",
                border: "1px solid rgba(236,231,218,0.18)",
                background: ["#3a3128", "#4a3a2c", "#3a3128", "#4a3a2c"][i],
                color: "#d99c66",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 14,
                fontFamily: 'ui-serif, "Fraunces", Georgia, serif',
              }}
            >
              {m.initial}
            </div>
            <div style={{ textAlign: "left", lineHeight: 1.3 }}>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  color: "#d99c66",
                  letterSpacing: "0.14em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: "#d99c66",
                    boxShadow: "0 0 0 2px rgba(217,156,102,0.2)",
                  }}
                />
                {m.role}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// --- Cards gallery ---------------------------------------------------------

const CardsGallery = () => (
  <section className="examples-block">
    <h2 className="examples-block-title">…and inside cards.</h2>
    <p className="examples-block-lede">
      The same patterns work at card-scale. Drop a chip into any feature grid,
      hero rail, or product tile — colors swap, the globe stays.
    </p>
    <div className="examples-cards-grid">
      {[
        { brand: "pachama",    look: "topographic", title: "Reforestation, verified.",   meta: "Pará, Brazil · 12,400 ha",    bg: "#F4F1EA", fg: "#0E3B2E", accent: "#F25C3B" },
        { brand: "vercel",     look: "default",     title: "Edge regions, live.",        meta: "iad1 · fra1 · sin1 · syd1",   bg: "#000",    fg: "#EDEDED", accent: "#FF0080" },
        { brand: "profound",   look: "default",     title: "AI prompt density.",         meta: "150+ regions · 30+ languages", bg: "#FAFAFA", fg: "#0B1F4B", accent: "#00B3A4" },
        { brand: "linear",     look: "aurora",      title: "Issue spread by team.",      meta: "25,000 teams · global",       bg: "#08090A", fg: "#F7F8F8", accent: "#5E6AD2" },
        { brand: "stripe",     look: "default",     title: "Where payments flow.",       meta: "200+ countries · live mesh",  bg: "#F6F9FC", fg: "#0d253d", accent: "#533afd" },
        { brand: "earthscale", look: "bloom",       title: "Power projects, parsed.",    meta: "7 continents · 62 grids",     bg: "#1d1a16", fg: "#ece7da", accent: "#d99c66" },
      ].map((card) => (
        <article
          key={card.title}
          className="examples-card"
          style={{ background: card.bg, color: card.fg }}
        >
          <LazyGlobe
            src={brandEmbedUrl(card.look, card.brand, "examples-card")}
            title={card.title}
            className="examples-card-globe"
            style={{
              width: "100%",
              aspectRatio: "16 / 10",
              background: BRAND_BG[card.brand],
            }}
          />
          <div className="examples-card-body">
            <strong style={{ color: card.fg }}>{card.title}</strong>
            <span style={{ color: card.accent }}>{card.meta}</span>
          </div>
        </article>
      ))}
    </div>
  </section>
);

// --- Stats gallery ---------------------------------------------------------

const StatsGallery = () => (
  <section className="examples-block">
    <h2 className="examples-block-title">…and as stats.</h2>
    <p className="examples-block-lede">
      Stat callouts that earn their headline-size type by sitting next to a
      live globe. Each row is one HTML snippet away.
    </p>
    <div className="examples-stats-grid">
      {[
        { brand: "vercel",   look: "default",     value: "126",   label: "Edge PoPs across the globe", bg: "#000",    fg: "#EDEDED" },
        { brand: "stripe",   look: "default",     value: "$1.9T", label: "processed in 2025",          bg: "#F6F9FC", fg: "#0d253d" },
        { brand: "pachama",  look: "topographic", value: "30M+",  label: "tonnes CO₂ under management", bg: "#F4F1EA", fg: "#0E3B2E" },
        { brand: "profound", look: "default",     value: "1.5B",  label: "AI prompts analyzed",        bg: "#FAFAFA", fg: "#0B1F4B" },
      ].map((stat) => (
        <div
          key={stat.label}
          className="examples-stat-tile"
          style={{ background: stat.bg, color: stat.fg }}
        >
          <LazyGlobe
            src={brandEmbedUrl(stat.look, stat.brand, "examples-stat")}
            title={stat.label}
            className="examples-stat-globe"
            style={{
              width: 100,
              height: 100,
              flexShrink: 0,
              background: BRAND_BG[stat.brand],
              borderRadius: 8,
              overflow: "hidden",
            }}
          />
          <div className="examples-stat-meta">
            <strong style={{ color: stat.fg }}>{stat.value}</strong>
            <span style={{ color: stat.fg, opacity: 0.7 }}>{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// --- Code reference (collapsible) ------------------------------------------

const CODE_SNIPPETS = {
  pachama: `<section style="background:#F4F1EA;color:#0E3B2E;padding:64px;text-align:center;font-family:Georgia,serif">
  <span style="font-size:11px;letter-spacing:0.14em;opacity:0.6">CARBON REMOVAL · NATURE</span>
  <h1 style="font-size:72px;margin:16px 0 24px">Restore nature, <em style="color:#F25C3B">at scale.</em></h1>
  <p style="font-size:18px;opacity:0.75;max-width:640px;margin:0 auto 32px">AI and satellite data monitoring 30M+ tonnes of CO₂ across global forest projects.</p>
  <iframe src="${SITE}/embed?look=topographic" width="920" height="517" style="border:0;border-radius:12px"></iframe>
</section>`,
  vercel: `<section style="background:#000;color:#EDEDED;padding:64px;text-align:center;font-family:system-ui,sans-serif">
  <span style="font-size:11px;letter-spacing:0.14em;color:#A1A1A1">EDGE NETWORK</span>
  <h1 style="font-size:80px;font-weight:600;background:linear-gradient(90deg,#FF0080,#FF4D4D,#7928CA,#0070F3);-webkit-background-clip:text;color:transparent;margin:16px 0 24px">Deploy at the edge of every continent.</h1>
  <p style="color:#A1A1A1;font-size:18px">126 PoPs. 20 regions. &lt;40ms p95.</p>
  <iframe src="${SITE}/embed?look=default" width="920" height="517" style="border:0;border-radius:12px;border:1px solid #1F1F1F"></iframe>
</section>`,
  profound: `<section style="background:#FAFAFA;color:#0A0A0A;padding:64px;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;font-family:system-ui,sans-serif">
  <div>
    <span style="color:#00B3A4;letter-spacing:0.14em;font-size:11px">AI SEARCH ANALYTICS</span>
    <h1 style="font-size:56px;margin:16px 0">See where your brand appears in <em style="color:#0B1F4B;font-style:normal">AI answers.</em></h1>
    <p style="color:#6B7280">1.5B+ prompts across 150+ regions and 30+ languages.</p>
  </div>
  <iframe src="${SITE}/embed?look=default" width="100%" height="500" style="border:0;border-radius:16px;background:#0B1F4B"></iframe>
</section>`,
  linear: `<section style="background:#08090A;color:#F7F8F8;padding:64px;text-align:center;font-family:system-ui,sans-serif">
  <span style="color:#5E6AD2;font-size:11px;letter-spacing:0.14em">BUILT FOR PRODUCT TEAMS</span>
  <h1 style="font-size:72px;font-weight:600;letter-spacing:-0.025em;margin:16px 0">The product development system for teams and agents.</h1>
  <p style="color:rgba(247,248,248,0.6)">Purpose-built for planning. Designed for the AI era.</p>
  <iframe src="${SITE}/embed?look=aurora" width="920" height="517" style="border:0;border-radius:16px"></iframe>
</section>`,
  stripe: `<section style="background:#F6F9FC;color:#0d253d;padding:64px;text-align:center;font-family:system-ui,sans-serif">
  <span style="color:#533afd;font-size:11px;letter-spacing:0.14em">GLOBAL PAYMENTS</span>
  <h1 style="font-size:72px;font-weight:500;letter-spacing:-0.02em;margin:16px 0">Accept payments from anywhere in the world.</h1>
  <p style="color:#425466">$1.9T processed. 200+ countries. 99.999% uptime.</p>
  <iframe src="${SITE}/embed?look=default" width="920" height="517" style="border:0;border-radius:16px;background:#0d253d"></iframe>
</section>`,
  earthscale: `<section style="background:#1d1a16;color:#ece7da;padding:120px 64px;text-align:center;position:relative;overflow:hidden;font-family:Georgia,serif">
  <iframe src="${SITE}/embed?look=bloom" style="position:absolute;inset:0;width:100%;height:100%;border:0;opacity:0.55"></iframe>
  <div style="position:relative;max-width:760px;margin:0 auto">
    <span style="color:#d99c66;font-family:monospace;letter-spacing:0.14em;font-size:11px">● TIME-TO-POWER INTELLIGENCE</span>
    <h1 style="color:#f5f0e2;font-size:72px;margin:16px 0">Read the signals that shape every project.</h1>
    <a style="background:#d99c66;color:#1d1a16;padding:14px 24px;text-decoration:none;border-radius:8px">Request a Trial Analysis</a>
  </div>
</section>`,
};

const CodeReference = () => {
  const [openId, setOpenId] = useState(null);
  return (
    <section className="examples-block">
      <h2 className="examples-block-title">Steal any of these.</h2>
      <p className="examples-block-lede">
        Click a name to expand the raw HTML. Tweak colors, swap the preset,
        paste anywhere that takes an iframe.
      </p>
      <div className="examples-code-list">
        {SHOWCASES.map((s) => (
          <details
            key={s.id}
            className="examples-code-item"
            open={openId === s.id}
            onToggle={(e) => {
              if (e.currentTarget.open) setOpenId(s.id);
              else if (openId === s.id) setOpenId(null);
            }}
          >
            <summary className="examples-code-summary">
              <span>{s.name}</span>
              <span className="examples-code-summary-hint">View HTML →</span>
            </summary>
            <div className="examples-code-body">
              <CodeBlock language="html">{CODE_SNIPPETS[s.id]}</CodeBlock>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
};

// --- Page ------------------------------------------------------------------

// The brand-hero showcase stack (Stripe, Vercel, the CRT "Signal lost"
// screen, the newspaper). Exported so the teaser landing page can render
// it below its hero too. Loads the real brand display fonts on mount.
export const ShowcaseStack = () => {
  useEffect(() => {
    // Geist (Vercel), Inter (Stripe/Linear/Profound), Fraunces (serif
    // display) — the actual faces are the biggest "looks like their site"
    // lever. Scoped + removed on unmount so the canvas app never pays for it.
    if (document.querySelector("link[data-examples-fonts]")) return undefined;
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap";
    fontLink.dataset.examplesFonts = "true";
    document.head.appendChild(fontLink);
    return () => {
      if (fontLink.parentNode) fontLink.parentNode.removeChild(fontLink);
    };
  }, []);

  return (
    <div className="showcase-stack">
      <StripeShowcase />
      <VercelShowcase />
      <GameOverShowcase />
      <NewsShowcase />
    </div>
  );
};

export const ExamplesPage = () => {
  useBodyScrollable();
  useEffect(() => {
    document.title = "Examples — Globestudio";
    const setMeta = (selector, content) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute("content", content);
    };
    setMeta(
      'meta[name="description"]',
      "Real-world examples of Globestudio in product marketing — Pachama, Vercel, Profound, Linear, Stripe, Earthscale. Six full-screen hero showcases plus card and stat patterns. Copy-paste HTML.",
    );
  }, []);

  const activeId = useActiveShowcase(SHOWCASES.map((s) => s.id));

  return (
    <>
      <TakeoverNav />
      <main className="examples-page examples-page--showcase">
        <header className="examples-hero">
          <a
            className="examples-hero-brand takeover-page-brand"
            href="/"
            aria-label="Globestudio home"
          >
            <DottedGlobe size={56} />
          </a>
          <h1 className="examples-hero-title">Real-world examples</h1>
          <p className="examples-hero-lede">
            Six hero showcases in the actual palette + voice of six products
            you already know — Pachama, Vercel, Profound, Linear, Stripe,
            Earthscale. Then cards. Then stats. Steal any of it.
          </p>
        </header>

        <ShowcaseChipNav activeId={activeId} />

        <ShowcaseStack />

        {/* <CardsGallery /> */}
        {/* <StatsGallery /> */}
        {/* <CodeReference /> */}

        <PagePager />
      </main>
    </>
  );
};
