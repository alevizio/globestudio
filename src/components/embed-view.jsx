import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { lookPresets } from "../data/look-presets.js";
import {
  DEFAULT_FLOW_SETTINGS,
  DEFAULT_SPACE_SETTINGS,
  FLOW_BACKGROUND_BASE,
  SPACE_BACKGROUND_BASE,
} from "../config/backgrounds.js";
import { DEFAULT_GLOBE_SETTINGS } from "../config/globe-settings.js";
import { effectPresets, DEFAULT_SHADER_SETTINGS } from "../config/shader-effects.js";
import { areaOptions } from "../data/geography.js";
import { createCountryMapData } from "../utils/dot-generation.js";
import { createDottedSvg } from "../utils/svg-markup.js";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion.js";
import { parseShareConfig } from "../utils/share-config.js";

// Lazy-load the heavy WebGL component so the initial embed payload is small.
const GlobeBackground = lazy(() =>
  import("./globe-background.jsx").then((m) => ({ default: m.GlobeBackground })),
);

// Parameters the embed honors via query string. Strings get parsed to their
// native types here so the consumer downstream gets clean typed values.
const parseParams = (search) => {
  const params = new URLSearchParams(search);
  const num = (key, fallback) => {
    const v = params.get(key);
    if (v == null || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const bool = (key, fallback) => {
    const v = params.get(key);
    if (v == null) return fallback;
    return v === "1" || v === "true";
  };
  return {
    look: params.get("look") || "default",
    density: num("density", 40),
    dotSize: num("dotSize", 10),
    dotColor: params.get("dotColor") ? `#${params.get("dotColor").replace(/^#/, "")}` : null,
    worldFill: params.get("worldFill") ? `#${params.get("worldFill").replace(/^#/, "")}` : null,
    renderMode: params.get("renderMode") || null,
    selection: params.get("selection") || "world",
    motion: num("motion", 35),
    tiltX: num("tiltX", 0),
    tiltY: num("tiltY", 0),
    autoSpin: bool("autoSpin", true),
    view: params.get("view") || "globe",
    // `static=1` freezes all motion — used when the embed lives in a Framer
    // canvas mode so the static preview doesn't burn frames.
    staticMode: bool("static", false),
    source: params.get("source") || "embed",
    background: params.get("background") ? `#${params.get("background").replace(/^#/, "")}` : "#0a0a0a",
    transparent: bool("transparent", false),
    // Render theme. The globe's default palette (glow, grid, surface) is
    // tuned for dark backgrounds; `theme=light` flips it to a graphite-on-
    // cream palette so a transparent embed reads cleanly on a light host
    // page instead of washing out. Anything other than "light" stays dark.
    theme: params.get("theme") === "light" ? "light" : "dark",
    // `plugin=figma` enables the host-plugin shell: an Insert button that
    // captures the canvas as a PNG and postMessages the bytes back to the
    // parent (Figma plugin UI bridge). See figma-plugin/ for the host.
    plugin: params.get("plugin") || null,
  };
};

const buildSettings = (raw, shareConfig) => {
  const preset = lookPresets.find((p) => p.id === raw.look) || lookPresets[0];
  // Three layers, each one overriding the last:
  //   1. The preset's full setting tree (the baseline).
  //   2. Individual query params (?density=70, ?dotColor=ffffff, …).
  //   3. The share-config snapshot from ?c=… (the user's exact look).
  // The share layer wins because it's the most specific intent — the
  // sender's "this is exactly what I made", overriding any preset
  // defaults or one-off param overrides on the same URL.
  const base = {
    ...preset.settings,
    selection: raw.selection || preset.settings.selection,
    density: raw.density || preset.settings.density,
    dotSize: raw.dotSize || preset.settings.dotSize,
    dotColor: raw.dotColor || preset.settings.dotColor,
    worldFill: raw.worldFill || preset.settings.worldFill,
    renderMode: raw.renderMode || preset.settings.renderMode,
    background: raw.background,
    transparent: raw.transparent,
    tiltX: raw.tiltX,
    tiltY: raw.tiltY,
    globeSettings: {
      ...preset.settings.globeSettings,
      autoSpin: raw.autoSpin && !raw.staticMode,
    },
    shaderSettings: preset.settings.shaderSettings || { ...DEFAULT_SHADER_SETTINGS, ...effectPresets.none },
  };
  if (!shareConfig) return base;
  // Share config flat keys map 1:1 to settings keys, with the exception
  // of the nested shaderSettings / globeSettings / spaceSettings /
  // flowSettings — those
  // need a shallow merge so the share's partial overrides don't blow
  // away the preset's defaults for fields it didn't customize.
  return {
    ...base,
    ...shareConfig,
    globeSettings: { ...base.globeSettings, ...(shareConfig.globeSettings ?? {}) },
    shaderSettings: { ...base.shaderSettings, ...(shareConfig.shaderSettings ?? {}) },
    spaceSettings: { ...(base.spaceSettings ?? {}), ...(shareConfig.spaceSettings ?? {}) },
    flowSettings: { ...(base.flowSettings ?? {}), ...(shareConfig.flowSettings ?? {}) },
  };
};

const findAreaIds = (selectionValue) => {
  const option = areaOptions.find((o) => o.value === selectionValue) || areaOptions[0];
  return option.ids || [];
};

export const EmbedView = () => {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = useMemo(() => parseParams(search), [search]);
  // If the host URL carries ?c=…, the recipient gets the sender's exact
  // customizations layered on top of preset defaults. See
  // src/utils/share-config.js for the encoding contract.
  const shareConfig = useMemo(() => parseShareConfig(search), [search]);
  const settings = useMemo(
    () => buildSettings(params, shareConfig),
    [params, shareConfig],
  );
  // The share config's selection (if any) overrides the URL params' one.
  const effectiveSelection = shareConfig?.selection || params.selection;
  const ids = useMemo(() => findAreaIds(effectiveSelection), [effectiveSelection]);
  const mapData = useMemo(() => createCountryMapData(ids, settings.density), [ids, settings.density]);
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionFrozen = prefersReducedMotion || params.staticMode;
  const [hasWebGL, setHasWebGL] = useState(true);
  // Set by GlobeBackground after the renderer mounts. Used by the Figma
  // plugin's Insert flow to read the live canvas pixels.
  const canvasHandleRef = useRef(null);
  const [inserting, setInserting] = useState(false);
  const isSpaceBackground = settings.backgroundStyle === "space";
  const isFlowBackground = settings.backgroundStyle === "flow";

  // Figma plugin Insert: capture the live canvas at native resolution,
  // package the PNG bytes, and postMessage them to window.parent (the
  // plugin's ui.html bridge — see figma-plugin/ui.html).
  const handleFigmaInsert = useCallback(async () => {
    setInserting(true);
    try {
      // Wait one frame so the latest render is committed to the canvas.
      // WebGLRenderer uses preserveDrawingBuffer: true so toBlob/toDataURL
      // return the most recent frame after this beat.
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      const canvas =
        canvasHandleRef.current ||
        document.querySelector(".globe-background canvas") ||
        document.querySelector(".embed-view canvas");
      if (!canvas) throw new Error("Canvas not found");
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
          "image/png",
        );
      });
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // Also generate the dotted-map SVG so the plugin can insert editable
      // vectors (named Background/Dots/Effects layers) instead of a flat PNG.
      // Best-effort: if it throws, the plugin falls back to the PNG bytes.
      let svg = null;
      try {
        svg = createDottedSvg({
          mapData,
          dotColor: settings.dotColor || "#ffffff",
          dotColorAlpha: settings.dotColorAlpha ?? 1,
          dotGradient: settings.dotGradient ?? null,
          dotSize: settings.dotSize,
          shape: settings.shape || "Circle",
          asciiSymbol: settings.asciiSymbol || "*",
          dotsVisible: settings.dotsVisible !== false,
          background: settings.background,
          transparent: settings.transparent,
          selectedDots: new Set(),
          mode: settings.renderMode,
          shaderSettings: settings.shaderSettings,
          sizeVary: settings.sizeVary || false,
          crop: true,
          label: "Globestudio dotted map",
        }).svg;
      } catch (svgErr) {
        // eslint-disable-next-line no-console
        console.warn("[globestudio] SVG generation failed; sending PNG only:", svgErr);
        svg = null;
      }
      const preset = lookPresets.find((p) => p.id === params.look);
      window.parent.postMessage(
        {
          type: "globestudio-insert",
          bytes,
          svg,
          width: canvas.width,
          height: canvas.height,
          presetName: preset ? `Globestudio — ${preset.name}` : "Globestudio",
        },
        "*",
      );
    } catch (err) {
      // Swallow + surface in console; the parent plugin shows an error
      // toast if it doesn't receive an insert message.
      // eslint-disable-next-line no-console
      console.error("[globestudio] Insert failed:", err);
    } finally {
      setInserting(false);
    }
  }, [params.look, mapData, settings]);

  // Probe for WebGL 2 support up-front so we can show a graceful fallback
  // instead of a blank canvas. The probe happens once, after mount.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") || probe.getContext("webgl");
    setHasWebGL(Boolean(gl));
  }, []);

  // When ?c=…&transparent flag is set, make the WHOLE embed document
  // see-through — not just the .embed-view wrapper but <html> and
  // <body> too. The WebGL canvas already clears at alpha 0, so once
  // the document chrome is transparent the iframe shows the host
  // page behind it. This is what lets /examples drop brand-tinted
  // globes straight onto cream / white / brand-colored heroes with
  // no dark box.
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!settings.transparent) return undefined;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.background;
    const prevBody = body.style.background;
    const prevColorScheme = html.style.colorScheme;
    html.style.background = "transparent";
    body.style.background = "transparent";
    // The app declares color-scheme: dark (meta + :root), which makes
    // Chromium paint an opaque UA backdrop behind the (otherwise fully
    // transparent) embed document. Drop to the neutral scheme so the
    // embed doesn't impose its own opaque backdrop. NOTE: the decisive
    // fix lives on the EMBEDDER side — Chromium ties an iframe's backdrop
    // opacity to the *embedder's* color-scheme, so a transparent host
    // must also set color-scheme on the iframe element (see examples-page
    // LazyGlobe). This line keeps the embed itself neutral regardless.
    html.style.colorScheme = "normal";
    return () => {
      html.style.background = prevHtml;
      body.style.background = prevBody;
      html.style.colorScheme = prevColorScheme;
    };
  }, [settings.transparent]);

  // Resize-aware postMessage protocol for parent iframes. Whenever the
  // viewport changes, we tell the parent "my content height is N pixels"
  // so they can resize the iframe to match. Parents listen via
  // window.addEventListener("message", e => e.data?.type === "globestudio-resize" && ...).
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return undefined;
    const post = () => {
      window.parent.postMessage(
        { type: "globestudio-resize", height: document.documentElement.scrollHeight, source: params.source },
        "*",
      );
    };
    post();
    window.addEventListener("resize", post);
    return () => window.removeEventListener("resize", post);
  }, [params.source]);

  // Surface the source param + look to the analytics layer (Vercel Analytics
  // captures path + query by default, so just having ?source=framer in the
  // URL is enough — no custom event needed yet).
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-embed-source", params.source);
  }, [params.source]);

  // Keep the bare /embed iframes out of the index — they're thin and would
  // compete with the canonical pages. (SEO research.)
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  if (!hasWebGL) {
    return (
      <div className="embed-view embed-view-fallback">
        <p>This browser doesn't support WebGL 2. Globestudio needs WebGL 2 to render the globe.</p>
        <p>
          <a href="https://globestudio.app/" target="_blank" rel="noreferrer noopener">
            Open Globestudio in a supported browser →
          </a>
        </p>
      </div>
    );
  }

  return (
    <div
      className="embed-view"
      data-source={params.source}
      data-transparent={settings.transparent ? "true" : undefined}
    >
      <Suspense fallback={<div className="embed-view-placeholder" aria-hidden="true" />}>
        <GlobeBackground
          mapData={mapData}
          selectedDots={new Set()}
          dotColor={settings.dotColor}
          dotSize={settings.dotSize}
          dotsVisible
          shape={settings.shape}
          dotRotation={0}
          rotateAnimating={!motionFrozen}
          sizeVary={false}
          asciiSymbol={settings.asciiSymbol}
          customShape={null}
          dotGradient={settings.dotGradient}
          dotColorAlpha={1}
          renderMode={settings.renderMode}
          worldFill={settings.worldFill}
          worldFillAlpha={1}
          worldFillGradient={null}
          worldFillVisible
          worldStroke={settings.worldStroke}
          worldStrokeAlpha={1}
          worldStrokeGradient={null}
          worldStrokeVisible
          worldStrokeWidth={1.8}
          flatProjection="mercator"
          riversVisible={false}
          citiesVisible={false}
          citiesMinPop={0}
          customTopology={null}
          customTopologyVisible={false}
          selectionCountryCodes={ids}
          selectionCollection={null}
          background={isSpaceBackground ? SPACE_BACKGROUND_BASE : isFlowBackground ? FLOW_BACKGROUND_BASE : settings.background}
          transparent={settings.transparent || isSpaceBackground || isFlowBackground}
          morphMode={params.view === "flat" ? "flat" : "globe"}
          morphTransition={null}
          interactive={false}
          tiltX={settings.tiltX}
          tiltY={settings.tiltY}
          mapDepth={55}
          mapZoom={1}
          panelCollapsed
          spaceSettings={settings.spaceSettings || DEFAULT_SPACE_SETTINGS}
          flowSettings={settings.flowSettings || DEFAULT_FLOW_SETTINGS}
          shaderSettings={settings.shaderSettings}
          globeSettings={settings.globeSettings}
          backgroundStyle={settings.backgroundStyle || "solid"}
          reducedMotion={motionFrozen}
          uiTheme={params.theme}
          perfHud={false}
          canvasHandleRef={canvasHandleRef}
          label="Globestudio dotted globe (embed)"
        />
      </Suspense>
      {params.plugin === "figma" && (
        <div className="embed-plugin-bar" data-plugin="figma">
          <button
            type="button"
            className="embed-plugin-insert"
            onClick={handleFigmaInsert}
            disabled={inserting}
          >
            {inserting ? "Inserting…" : "Insert into Figma"}
          </button>
        </div>
      )}
    </div>
  );
};
