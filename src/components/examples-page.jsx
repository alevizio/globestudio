import { useEffect, useRef, useState } from "react";
import { useBodyScrollable } from "../hooks/use-body-scrollable.js";
import { PagePager } from "./ui/page-pager.jsx";
import { DottedGlobe } from "./icons.jsx";
import { TakeoverNav } from "./ui/takeover-nav.jsx";
import { CodeBlock } from "./ui/code-block.jsx";
import { buildShareUrl } from "../utils/share-config.js";

// Per-company globe configs — palette-matched so the rendered globe
// reads as part of the brand instead of a default Globestudio mark.
// Each is fed through buildShareUrl(config, site, "/embed") to produce
// the canonical /embed?c=… URL the iframe loads.
// Each brand sets transparent: true so the embed iframe doesn't paint
// its own (hard-coded var(--bg)) background — the iframe wrapper in
// the showcase has the brand bg set inline, and that shows through.
// dotColor + worldStroke control the only colors the user actually sees.
const BRAND_GLOBES = {
  pachama: {
    selection: "world",
    transparent: true,
    // Canopy lime on dark-forest inset bg — forest green on forest green
    // (matching their wordmark color) reads as invisible; lime is the
    // satellite-canopy color that already lives in their LiDAR palette.
    dotColor: "#B8E14C",
    worldFill: "#0E3B2E",
    worldStroke: "#1f5240",
    dotsVisible: true,
    shape: "Circle",
    density: 38,
  },
  vercel: {
    // awesome-design-md/vercel: white page, but the globe lives in an
    // intentional dark "deployment map" panel (Vercel uses dark product
    // panels on light pages). White dots on the dark panel + the three
    // signature Vercel gradients glowing beneath it.
    selection: "world",
    transparent: true,
    dotColor: "#FFFFFF",
    worldFill: "#0A0A0A",
    worldStroke: "#262626",
    shape: "Circle",
    density: 42,
  },
  profound: {
    selection: "world",
    transparent: true,
    dotColor: "#00B3A4",
    worldFill: "#0B1F4B",
    worldStroke: "#1A3070",
    shape: "Circle",
    density: 40,
  },
  linear: {
    selection: "world",
    transparent: true,
    dotColor: "#5E6AD2",
    worldFill: "#08090A",
    worldStroke: "#1a1a22",
    shape: "Circle",
    density: 42,
  },
  stripe: {
    // Exact tokens from awesome-design-md/stripe DESIGN.md: primary
    // indigo #533afd, dashboard chrome navy #1c1e54.
    selection: "world",
    transparent: true,
    dotColor: "#665efd",
    worldFill: "#1c1e54",
    worldStroke: "#2e2b8c",
    shape: "Circle",
    density: 42,
  },
  earthscale: {
    selection: "world",
    transparent: true,
    dotColor: "#d99c66",
    worldFill: "#1d1a16",
    worldStroke: "#3a3128",
    shape: "Circle",
    density: 38,
  },
};

// Background colors shown UNDER each transparent iframe — the iframe
// wrapper picks the bg from here so the globe color story is unified
// across showcase / card / stat surfaces for one brand.
const BRAND_BG = {
  pachama:    "#F4F1EA",
  vercel:     "#000000",
  profound:   "#0B1F4B",
  linear:     "#08090A",
  stripe:     "#1c1e54",
  earthscale: "#1d1a16",
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
const brandEmbedUrl = (look, brandKey, source) => {
  const config = { ...BRAND_GLOBES[brandKey], ...(look ? { look } : {}) };
  const url = new URL(buildShareUrl(config, SITE, "/embed"));
  if (source) url.searchParams.set("source", source);
  return url.toString();
};

const SHOWCASES = [
  { id: "pachama", name: "Pachama" },
  { id: "vercel", name: "Vercel" },
  { id: "profound", name: "Profound" },
  { id: "linear", name: "Linear" },
  { id: "stripe", name: "Stripe" },
  { id: "earthscale", name: "Earthscale" },
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
  useEffect(() => {
    if (shouldLoad) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad]);
  return (
    <div ref={ref} className={className} style={style}>
      {shouldLoad ? (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          style={{ border: 0, width: "100%", height: "100%", display: "block" }}
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

const StripeMark = ({ size = 22 }) => (
  // Stripe's word IS the mark — render as styled text.
  <span
    style={{
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      fontWeight: 700,
      fontSize: size,
      letterSpacing: "-0.04em",
      fontStyle: "italic",
      lineHeight: 1,
      color: "currentColor",
    }}
  >
    stripe
  </span>
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
      <div style={{ position: "relative", width: "100%", maxWidth: 920, marginTop: 40 }}>
        <LazyGlobe
          src={brandEmbedUrl("topographic", "pachama", "examples-pachama")}
          title="Pachama-flavored globe"
          className="showcase-globe"
          style={{
            background: "#0E3B2E",
            aspectRatio: "16 / 9",
            width: "100%",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 30px 80px -30px rgba(14, 59, 46, 0.4)",
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

const VercelShowcase = () => (
  <section
    id="vercel"
    className="showcase showcase--vercel"
    style={{
      // awesome-design-md/vercel: white canvas, ink #171717, Geist.
      background: "#FFFFFF",
      color: "#171717",
      fontFamily: '"Geist", "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
    }}
  >
    <CompanyNav
      brand={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#171717", fontWeight: 600, letterSpacing: "-0.04em", fontSize: 18 }}>
          <VercelMark size={17} />
          Vercel
        </span>
      }
      items={["Products", "Solutions", "Resources", "Enterprise", "Docs", "Pricing"]}
      right={
        <>
          <span className="showcase-nav-link" style={{ color: "#171717" }}>Log In</span>
          <span className="showcase-nav-cta" style={{ background: "#171717", color: "#fff" }}>
            Sign Up
          </span>
        </>
      }
      style={{ borderBottom: "1px solid #EBEBEB", color: "#171717" }}
    />
    <div className="showcase-inner showcase-inner--centered">
      {/* Vercel's announcement pill */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 5px 5px 14px",
          borderRadius: 999,
          border: "1px solid #EBEBEB",
          background: "#FAFAFA",
          fontSize: 13,
          color: "#171717",
          fontWeight: 500,
        }}
      >
        Ship 2026 is coming to 5 cities
        <span style={{ background: "#171717", color: "#fff", borderRadius: 999, padding: "3px 10px", fontSize: 12 }}>
          Get your ticket →
        </span>
      </span>
      <h2
        className="showcase-headline"
        style={{
          color: "#171717",
          fontWeight: 600,
          letterSpacing: "-0.05em",
          lineHeight: 1.0,
        }}
      >
        Deploy at the edge<br />of every continent.
      </h2>
      <p className="showcase-subhead" style={{ color: "#4d4d4d" }}>
        Vercel runs your frontend across 126 PoPs and 20 compute regions —
        sub-40ms p95 latency, everywhere.
      </p>
      <div className="showcase-ctas">
        <span className="showcase-cta showcase-cta--primary" style={{ background: "#171717", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <VercelMark size={13} /> Start Deploying
        </span>
        <span className="showcase-cta" style={{ background: "#fff", color: "#171717", border: "1px solid #EBEBEB" }}>
          Get a Demo
        </span>
      </div>
      {/* Globe in a bordered card, with the three signature Vercel
          gradients (develop blue→cyan, preview violet→pink, ship
          red→amber) glowing beneath it. */}
      <div style={{ position: "relative", maxWidth: 920, width: "100%", marginTop: 48 }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "auto 8% -40px 8%",
            height: 200,
            zIndex: 0,
            pointerEvents: "none",
            filter: "blur(60px)",
            opacity: 0.7,
            background:
              "linear-gradient(90deg, #007cf0 0%, #00dfd8 28%, #7928ca 50%, #ff0080 72%, #ff4d4d 86%, #f9cb28 100%)",
          }}
        />
        <LazyGlobe
          src={brandEmbedUrl("default", "vercel", "examples-vercel")}
          title="Vercel-flavored globe"
          className="showcase-globe"
          style={{
            position: "relative",
            background: "#000000",
            aspectRatio: "16 / 9",
            width: "100%",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #EBEBEB",
            boxShadow: "0 24px 60px -30px rgba(0,0,0,0.25)",
          }}
        />
      </div>
      <div className="showcase-stats" style={{ marginTop: 64 }}>
        {[
          { v: "126", l: "Edge PoPs" },
          { v: "20", l: "Compute regions" },
          { v: "<40ms", l: "p95 latency" },
        ].map((s) => (
          <div key={s.l} className="showcase-stat">
            <strong style={{ color: "#171717", letterSpacing: "-0.04em" }}>{s.v}</strong>
            <span style={{ color: "#888888" }}>{s.l}</span>
          </div>
        ))}
      </div>
      <LogoWall
        color="#888888"
        label="Trusted by"
        logos={[
          { name: "Notion", weight: 700 },
          { name: "OpenAI", weight: 600 },
          { name: "Adobe", weight: 700, tracking: "0.02em" },
          { name: "GitHub", weight: 600 },
          { name: "Loom", weight: 700, tracking: "-0.03em" },
          { name: "Cursor", weight: 600 },
        ]}
      />
    </div>
  </section>
);

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
      <div style={{ position: "relative", marginTop: 60, maxWidth: 920, width: "100%" }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: -80,
            background: "radial-gradient(circle at 50% 50%, rgba(94, 106, 210, 0.35), rgba(94, 106, 210, 0) 60%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
        <LazyGlobe
          src={brandEmbedUrl("aurora", "linear", "examples-linear")}
          title="Linear-flavored globe"
          className="showcase-globe"
          style={{
            background: "#08090A",
            aspectRatio: "16 / 9",
            width: "100%",
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(247, 248, 248, 0.08)",
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

const StripeShowcase = () => (
  <section
    id="stripe"
    className="showcase showcase--stripe"
    style={{
      background: "#FFFFFF",
      color: "#0d253d",
      fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
      position: "relative",
      overflow: "hidden",
    }}
  >
    {/* Stripe's signature silk-ribbon gradient. The fanning-from-a-
        corner look is a conic gradient anchored at the top-right
        corner: warm amber → coral → magenta → violet → blue swept as
        angular bands. Layered with two soft radial highlights for the
        silk sheen, lightly blurred, and clipped to a diagonal so it
        sweeps from the top-right toward lower-center like the real
        site (whose version is WebGL). */}
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: -260,
        right: -240,
        width: 1180,
        height: 1080,
        zIndex: 0,
        pointerEvents: "none",
        filter: "blur(14px) saturate(1.05)",
        // Mesh colors straight from the Stripe DESIGN.md: cream
        // (#f5e9d4) → sherbet → lavender (#b9b9f9) → indigo (#533afd)
        // → ruby (#ea2261) → magenta (#f96bee), swept as a corner fan.
        background: `
          radial-gradient(60% 45% at 70% 16%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 55%),
          radial-gradient(55% 55% at 56% 60%, rgba(249,107,238,0.32) 0%, rgba(249,107,238,0) 60%),
          conic-gradient(from 198deg at 88% 6%,
            #f5e9d4 0deg,
            #ffb060 24deg,
            #f96bee 48deg,
            #ea2261 68deg,
            #533afd 92deg,
            #665efd 116deg,
            #b9b9f9 142deg,
            rgba(185,185,249,0) 176deg)
        `,
        clipPath: "polygon(26% 0, 100% 0, 100% 82%, 50% 100%, 28% 62%, 16% 20%)",
      }}
    />
    {/* White feather on the left + bottom edges so the ribbon melts
        into the page instead of ending in a hard polygon line. */}
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background:
          "linear-gradient(95deg, #FFFFFF 30%, rgba(255,255,255,0) 62%), linear-gradient(0deg, #FFFFFF 4%, rgba(255,255,255,0) 34%)",
      }}
    />
    <CompanyNav
      brand={<StripeMark size={24} />}
      items={["Products", "Solutions", "Developers", "Resources", "Pricing"]}
      right={
        <>
          <span className="showcase-nav-link" style={{ color: "#ea2261", fontWeight: 600 }}>Sign in</span>
          <span className="showcase-nav-cta" style={{ background: "#533afd", color: "#fff" }}>
            Contact sales →
          </span>
        </>
      }
      style={{ color: "#0d253d", position: "relative", zIndex: 2 }}
    />
    {/* Left-anchored copy column — Stripe's hero is NOT centered. Copy
        sits in the left ~58%, the ribbon owns the right. */}
    <div
      className="showcase-inner"
      style={{
        position: "relative",
        zIndex: 1,
        alignItems: "flex-start",
        textAlign: "left",
        maxWidth: 1180,
      }}
    >
      <div style={{ maxWidth: 680 }}>
        <div
          style={{
            fontSize: 14,
            color: "#0d253d",
            fontWeight: 500,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Global GDP running on Stripe:
          <span style={{ fontVariantNumeric: "tabular-nums", color: "#533afd", fontWeight: 600 }}>
            1.65433278%
          </span>
        </div>
        {/* Light-weight Söhne-style headline: dark first sentence,
            then the rest flows in blue — exactly like the real site. */}
        <h2
          style={{
            margin: 0,
            fontSize: "clamp(34px, 3.6vw, 48px)",
            lineHeight: 1.15,
            fontWeight: 300,
            letterSpacing: "-0.96px",
            fontFeatureSettings: '"ss01"',
            color: "#0d253d",
            maxWidth: 720,
          }}
        >
          Financial infrastructure to grow your revenue.{" "}
          <span style={{ color: "#273951" }}>
            Accept payments, offer financial services, and visualize global
            money movement—from your first transaction to your billionth.
          </span>
        </h2>
        <div className="showcase-ctas" style={{ justifyContent: "flex-start", marginTop: 28 }}>
          <span
            className="showcase-cta showcase-cta--primary"
            style={{ background: "#533afd", color: "#fff", fontWeight: 600 }}
          >
            Get started →
          </span>
          <span
            className="showcase-cta"
            style={{
              background: "#fff",
              color: "#0d253d",
              border: "1px solid rgba(10,37,64,0.12)",
              boxShadow: "0 2px 5px rgba(0,0,0,0.06)",
              display: "inline-flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 700, color: "#4285F4" }}>G</span>
            Sign up with Google
          </span>
        </div>

        {/* Customer logo row — grayscale, single line, like Stripe's. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 36,
            marginTop: 56,
            flexWrap: "wrap",
            opacity: 0.7,
          }}
        >
          {[
            { name: "amazon", weight: 700 },
            { name: "NVIDIA", weight: 800, tracking: "0.02em" },
            { name: "Ford", weight: 700, italic: true },
            { name: "coinbase", weight: 600 },
            { name: "Google", weight: 500 },
            { name: "shopify", weight: 700, tracking: "-0.02em" },
            { name: "mindbody", weight: 600 },
          ].map((l) => (
            <span
              key={l.name}
              style={{
                fontFamily: '"Inter", system-ui, sans-serif',
                fontWeight: l.weight,
                fontStyle: l.italic ? "italic" : "normal",
                letterSpacing: l.tracking || "-0.01em",
                fontSize: 17,
                color: "#697386",
              }}
            >
              {l.name}
            </span>
          ))}
        </div>
      </div>

      {/* The globe lives in a clean white Stripe-Dashboard widget that
          floats over the ribbon, lower-right — exactly how Stripe
          floats product-UI cards over its gradient. Header + globe +
          live volume stat + a live payment-route row underneath. */}
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 28,
          width: 340,
          maxWidth: "40%",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 30px 70px -24px rgba(10,37,64,0.35), 0 4px 12px rgba(10,37,64,0.08)",
          overflow: "hidden",
          border: "1px solid rgba(10,37,64,0.06)",
        }}
      >
        {/* Card header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px 10px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 12, color: "#697386", fontWeight: 500 }}>Global volume</span>
            <span style={{ fontSize: 22, fontWeight: 600, color: "#0d253d", letterSpacing: "-0.01em" }}>$1.9T</span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#3ECF8E",
              background: "rgba(62,207,142,0.12)",
              padding: "3px 8px",
              borderRadius: 6,
            }}
          >
            ↑ 24.1%
          </span>
        </div>
        {/* Globe — Stripe-purple dots on deep navy */}
        <LazyGlobe
          src={brandEmbedUrl("default", "stripe", "examples-stripe")}
          title="Stripe global payments globe"
          style={{
            background: "#0d253d",
            aspectRatio: "16 / 11",
            width: "100%",
          }}
        />
        {/* Live payment-route row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderTop: "1px solid rgba(10,37,64,0.06)",
            fontSize: 12,
            color: "#0d253d",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "#3ECF8E", boxShadow: "0 0 0 3px rgba(62,207,142,0.2)", flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>Singapore → São Paulo</span>
          <span style={{ marginLeft: "auto", color: "#697386", fontVariantNumeric: "tabular-nums" }}>$48,200 · 1.2s</span>
        </div>
      </div>
    </div>
  </section>
);

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
                borderRadius: "50%",
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

    // Load the real brand display fonts (Geist for Vercel, Inter for
    // Linear/Profound/Stripe, Fraunces serif for Earthscale/Pachama
    // display) only on this route — the fidelity jump from system-ui
    // to the actual faces is the single biggest "looks like their
    // site" lever. Scoped + cleaned up on unmount so it never taxes
    // the canvas app.
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

        <div className="showcase-stack">
          <PachamaShowcase />
          <VercelShowcase />
          <ProfoundShowcase />
          <LinearShowcase />
          <StripeShowcase />
          <EarthscaleShowcase />
        </div>

        <CardsGallery />
        <StatsGallery />
        <CodeReference />

        <PagePager />
      </main>
    </>
  );
};
