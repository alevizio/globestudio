import { useEffect, useRef, useState } from "react";
import "./teaser-page.css";
import { LiquidMetal } from "@paper-design/shaders-react";
import { DottedGlobe, ChevronRight, DOTTED_GLOBE_PATH } from "./icons.jsx";
import { ChromeShader } from "./chrome-shader.jsx";
import { track } from "./analytics.jsx";
import { ShowcaseStack } from "./examples-page.jsx";
import { useBodyScrollable } from "../hooks/use-body-scrollable.js";
import { buildShareUrl } from "../utils/share-config.js";

// The CRT look (globestudio.app/looks/crt) — phosphor glow + scanlines —
// rendered transparent so it floats over the dark teaser. Loaded via the
// isolated /embed route (iframe) so three.js stays in the embed chunk.
const TEASER_GLOBE = {
  selection: "world",
  transparent: true,
  background: "#020a10",
  density: 70,
  dotSize: 14,
  dotColor: "#ffffff",
  shape: "ASCII",
  asciiSymbol: "█",
  renderMode: "dots",
  worldFill: "#5a5a64",
  worldStroke: "#f6f2ea",
  shaderSettings: {
    intensity: 65,
    split: 8,
    grain: 10,
    scanlines: 78,
    cellSize: 9,
    threshold: 50,
    warp: 30,
    motion: 30,
    effect: "crt",
  },
  globeSettings: {
    autoSpin: true,
    autoSpinSpeed: 35,
    dotLift: 15,
    glow: true,
    glowStrength: 65,
    glowSpread: 50,
    grid: true,
    gridColor: "#ffffff",
    gridSize: 30,
    gridStrength: 45,
    network: true,
    networkStrength: 70,
    networkArcs: 60,
    networkPulses: 50,
    networkMono: true,
    routes: true,
    routesStrength: 82,
    surface: true,
    surfaceStrength: 30,
    surfaceColor: "#18191d",
  },
};

const EMBED_URL = buildShareUrl(TEASER_GLOBE, "", "/embed");
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Logo treatments to compare via the switcher. "liquid" = flowing chrome,
// "chrome" = a tighter polished-mirror preset, "flat" = the plain mark.
// (Drop in a different paper.design shader here to add another option.)
const LOGO_STYLE_KEY = "globestudio:teaser-logo-v4";
const LOGO_DEFAULT = "liquid";
const LOGO_STYLES = ["liquid", "chrome", "prismatic", "flat"];

const renderLogo = (style) => {
  if (style === "flat") return <DottedGlobe size={120} />;
  // Real chrome/prismatic shader (chromatic dispersion + iridescence +
  // mouse-tracked specular) rendered into the globe silhouette.
  if (style === "chrome") {
    return (
      <div className="teaser-logo-shader">
        <ChromeShader svgPath={DOTTED_GLOBE_PATH} svgWidth={915} svgHeight={523} svgScale={0.92} theme="dark" />
      </div>
    );
  }
  // CSS holographic-foil reproduction (no WebGL/canvas).
  if (style === "prismatic") return <span className="teaser-logo-prismatic" aria-hidden="true" />;
  // paper.design LiquidMetal — flowing liquid chrome.
  return (
    <LiquidMetal
      image="/logo-globe.svg"
      width={240}
      height={137}
      fit="contain"
      colorBack="#00000000"
      colorTint="#eaf1fb"
      softness={0.28}
      repetition={3}
      shiftRed={0.3}
      shiftBlue={0.3}
      distortion={0.1}
      contour={1}
      speed={0.8}
    />
  );
};

// Dev-only globe-position tuner (visit /?teaser&tune). Persists to
// localStorage; copy the CSS into .teaser-globe to bake a new default.
const TEASER_POS_KEY = "globestudio:teaser-globe-pos";
const TEASER_POS_DEFAULT = { x: 7, y: 500, scale: 220 };

const TunerRow = ({ label, value, min, max, onChange }) => (
  <label style={{ display: "grid", gridTemplateColumns: "46px 1fr 52px", alignItems: "center", gap: 8, fontSize: 12 }}>
    <span>{label}</span>
    <input type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width: 50, background: "#111", color: "#fff", border: "1px solid #333", fontSize: 12, padding: "2px 4px" }}
    />
  </label>
);

const TeaserGlobePanel = ({ pos, setPos }) => {
  const up = (k) => (v) => setPos((s) => ({ ...s, [k]: v }));
  const css =
    `transform: translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) ` +
    `scale(${(pos.scale / 100).toFixed(2)});`;
  const btn = { background: "#1c2230", color: "#dfe7ea", border: "1px solid #333", padding: "5px 9px", fontSize: 12, cursor: "pointer" };
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 99999, width: 268,
      background: "rgba(12,14,18,0.96)", color: "#e8eef0", border: "1px solid #2a2f37",
      padding: 14, fontFamily: "ui-monospace, monospace", boxShadow: "0 12px 40px rgba(0,0,0,0.55)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>Teaser globe</strong>
        <button style={btn} onClick={() => setPos(TEASER_POS_DEFAULT)}>reset</button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <TunerRow label="x" value={pos.x} min={-500} max={500} onChange={up("x")} />
        <TunerRow label="y" value={pos.y} min={-500} max={500} onChange={up("y")} />
        <TunerRow label="scale" value={pos.scale} min={40} max={220} onChange={up("scale")} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button style={btn} onClick={() => setPos((s) => ({ ...s, x: 0, y: 0 }))}>center</button>
        <button style={btn} onClick={() => navigator.clipboard && navigator.clipboard.writeText(css)}>copy CSS</button>
      </div>
      <pre style={{ marginTop: 10, fontSize: 11, background: "#0a0c10", padding: 8, whiteSpace: "pre-wrap", color: "#9fb1b8" }}>{css}</pre>
    </div>
  );
};

export const TeaserPage = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");
  const [globeLoaded, setGlobeLoaded] = useState(false); // hero globe fade-in
  const honeypotRef = useRef(null);
  const honeypotRef2 = useRef(null);
  const logoRef = useRef(null);
  const appFrameRef = useRef(null);
  // Defer the heavy app-preview iframe (full app + geo data, ~1MB+) until the
  // bottom hero is scrolled toward, so it's off the initial payload. iframe
  // loading="lazy" alone isn't enough here — Chrome's lazy threshold loads it
  // near-immediately since it's only one scroll-section down.
  const appWrapRef = useRef(null);
  const [appVisible, setAppVisible] = useState(false);
  useEffect(() => {
    const el = appWrapRef.current;
    if (!el || appVisible) return undefined;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAppVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [appVisible]);
  // Defer the entire showcase stack (its own globes + a 1.7MB retro-tv.png)
  // until the user scrolls past the hero. Otherwise it loads eagerly on first
  // paint and steals bandwidth from the hero globe — which is what makes the
  // globe take a few seconds. Off the critical path, the hero globe loads fast.
  const showcasesRef = useRef(null);
  const [showcasesVisible, setShowcasesVisible] = useState(false);
  useEffect(() => {
    const el = showcasesRef.current;
    if (!el || showcasesVisible) return undefined;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowcasesVisible(true);
          obs.disconnect();
        }
      },
      // The sentinel sits right at the fold (just below the 100svh hero), so a
      // positive rootMargin would fire at load and defeat the defer. A small
      // NEGATIVE bottom margin means it only fires once the user has actually
      // scrolled ~half a screen toward the showcases — by then the hero globe
      // has loaded on a clean critical path.
      { rootMargin: "0px 0px -40% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [showcasesVisible]);
  useBodyScrollable();

  // Set up the (same-origin) app preview: hide the panel header (nav + icons)
  // and the look-chips bar so the preview reads as a clean app shell.
  const setupAppPreview = () => {
    try {
      const doc = appFrameRef.current?.contentDocument;
      if (!doc) return;
      let style = doc.getElementById("gs-teaser-trim");
      if (!style) {
        style = doc.createElement("style");
        style.id = "gs-teaser-trim";
        (doc.head || doc.documentElement).appendChild(style);
      }
      style.textContent = ".panel-header, .looks-bar { display: none !important; }";
    } catch {
      /* cross-origin / not ready — ignore */
    }
  };

  const [pos, setPos] = useState(() => {
    try {
      const raw = localStorage.getItem(TEASER_POS_KEY);
      if (raw) return { ...TEASER_POS_DEFAULT, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return TEASER_POS_DEFAULT;
  });
  const [showTuner, setShowTuner] = useState(false);
  useEffect(() => {
    setShowTuner(new URLSearchParams(window.location.search).has("tune"));
  }, []);
  const [logoStyle, setLogoStyle] = useState(() => {
    try {
      return localStorage.getItem(LOGO_STYLE_KEY) || LOGO_DEFAULT;
    } catch {
      return LOGO_DEFAULT;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(LOGO_STYLE_KEY, logoStyle);
    } catch {
      /* ignore */
    }
  }, [logoStyle]);
  // Mouse-driven prismatic: the cursor position (0–1 across the viewport)
  // feeds CSS vars that shift the foil's sheen + hue, so the logo catches
  // light as you move — like a holographic shader reacting to the pointer.
  useEffect(() => {
    const el = logoRef.current;
    if (!el || logoStyle !== "prismatic") return undefined;
    let raf = 0;
    const onMove = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty("--mx", (e.clientX / window.innerWidth).toFixed(3));
        el.style.setProperty("--my", (e.clientY / window.innerHeight).toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [logoStyle]);
  useEffect(() => {
    try {
      localStorage.setItem(TEASER_POS_KEY, JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, [pos]);
  const globeStyle = {
    "--tg-x": `${pos.x}px`,
    "--tg-y": `${pos.y}px`,
    "--tg-scale": pos.scale,
  };

  const submit = async (event) => {
    event.preventDefault();
    if (status === "loading") return;
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    // Honeypot — bots fill hidden fields; humans never see it. Either
    // form's honeypot (top hero or bottom) trips it.
    if (honeypotRef.current?.value || honeypotRef2.current?.value) {
      setStatus("success");
      setMessage("You're on the list.");
      return;
    }
    setStatus("loading");
    setMessage("");

    // No serverless function under `vite dev`; simulate so the flow is
    // previewable locally. Real POST happens in the deployed build.
    if (import.meta.env.DEV) {
      await new Promise((r) => setTimeout(r, 600));
      track("waitlist_signup");
      setStatus("success");
      setMessage("You're on the list — we'll email you at launch. (dev)");
      return;
    }

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, hp: honeypotRef.current?.value || honeypotRef2.current?.value || "" }),
      });
      if (res.status === 409) {
        track("waitlist_duplicate");
        setStatus("success");
        setMessage("That email is already on the list — you're all set, no need to sign up again.");
        return;
      }
      if (!res.ok) throw new Error(`status ${res.status}`);
      track("waitlist_signup");
      setStatus("success");
      setMessage("You're on the list — we'll email you at launch.");
    } catch (_err) {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  // Signup form (used in the top hero + the bottom showcase). Each instance
  // gets its own honeypot ref + unique input id; they share the same state.
  const renderSignup = (hpRef, id) =>
    status === "success" ? (
      <p className="teaser-result teaser-result--ok" role="status">
        {message}
      </p>
    ) : (
      <>
        <form className="teaser-form" onSubmit={submit} noValidate>
          <label className="teaser-visually-hidden" htmlFor={`teaser-email-${id}`}>
            Email address
          </label>
          <input
            id={`teaser-email-${id}`}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@studio.com"
            className="teaser-input"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            aria-invalid={status === "error"}
          />
          <input
            ref={hpRef}
            type="text"
            name="company"
            className="teaser-honeypot"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <button type="submit" className="teaser-submit" disabled={status === "loading"}>
            {status === "loading" ? (
              "Adding…"
            ) : (
              <>
                Notify me
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </form>
        {status === "error" && (
          <p className="teaser-result teaser-result--err" role="alert">
            {message}
          </p>
        )}
      </>
    );

  return (
    <main className="teaser-page">
      <section className="teaser">
      <div
        className={`teaser-globe ${globeLoaded ? "is-loaded" : ""}`}
        style={globeStyle}
        aria-hidden="true"
      >
        <iframe
          src={EMBED_URL}
          title=""
          tabIndex={-1}
          loading="eager"
          // The iframe load event fires when the embed HTML is in; the WebGL
          // globe paints its first frame a beat later — wait that out, then
          // fade in (via .is-loaded) so the globe eases in instead of popping.
          onLoad={() => window.setTimeout(() => setGlobeLoaded(true), 450)}
        />
      </div>
      <div className="teaser-veil" aria-hidden="true" />

      <section className="teaser-content">
        <span className="teaser-mark" role="img" aria-label="Globestudio" ref={logoRef}>
          {renderLogo("liquid")}
        </span>
        <h1 className="teaser-title">Something worldly is coming.</h1>
        <p className="teaser-tagline">
          Open-source dotted maps and 3D globes for designers — render any
          country in dots, ASCII, or halftone and export it anywhere.
        </p>

        {renderSignup(honeypotRef, "top")}
        <p className="teaser-footnote">No spam — one email when we launch.</p>
      </section>
      </section>

      <div ref={showcasesRef} aria-hidden={!showcasesVisible || undefined}>
        {showcasesVisible && <ShowcaseStack />}
      </div>

      {/* Bottom hero: mini landing block — logo on top, a clean spinning
          globe in a rounded pixel-corner frame with an on/off toggle, then
          the signup form below. */}
      <section className="teaser-look-hero">
        <div className="teaser-look-head">
          <span className="teaser-look-logo" role="img" aria-label="Globestudio">
            {renderLogo("liquid")}
          </span>
          {renderSignup(honeypotRef2, "bottom")}
        </div>
        {/* Full app preview (sidebar + globe), big, cropping off the bottom
            edge. Iframes the real app via ?app=1; not functional. */}
        <div className="teaser-app-frame" ref={appWrapRef}>
          {appVisible && (
            <iframe
              ref={appFrameRef}
              className="teaser-app-iframe"
              src="/looks/bloom?app=1"
              title="Globestudio app — Bloom look"
              loading="lazy"
              tabIndex={-1}
              onLoad={setupAppPreview}
            />
          )}
        </div>
      </section>

      {showTuner && <TeaserGlobePanel pos={pos} setPos={setPos} />}
    </main>
  );
};
