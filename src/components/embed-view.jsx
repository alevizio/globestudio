import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { lookPresets } from "../data/look-presets.js";
import { DEFAULT_GLOBE_SETTINGS } from "../config/globe-settings.js";
import { effectPresets, DEFAULT_SHADER_SETTINGS } from "../config/shader-effects.js";
import { areaOptions } from "../data/geography.js";
import { createCountryMapData } from "../utils/dot-generation.js";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion.js";

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
  };
};

const buildSettings = (raw) => {
  const preset = lookPresets.find((p) => p.id === raw.look) || lookPresets[0];
  // Start from the preset's full setting tree, then layer query overrides
  // on top so a designer can pin "halftone but my brand color" or similar.
  return {
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
};

const findAreaIds = (selectionValue) => {
  const option = areaOptions.find((o) => o.value === selectionValue) || areaOptions[0];
  return option.ids || [];
};

export const EmbedView = () => {
  const params = useMemo(
    () => parseParams(typeof window !== "undefined" ? window.location.search : ""),
    [],
  );
  const settings = useMemo(() => buildSettings(params), [params]);
  const ids = useMemo(() => findAreaIds(params.selection), [params.selection]);
  const mapData = useMemo(() => createCountryMapData(ids, settings.density), [ids, settings.density]);
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionFrozen = prefersReducedMotion || params.staticMode;
  const [hasWebGL, setHasWebGL] = useState(true);

  // Probe for WebGL 2 support up-front so we can show a graceful fallback
  // instead of a blank canvas. The probe happens once, after mount.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") || probe.getContext("webgl");
    setHasWebGL(Boolean(gl));
  }, []);

  // Resize-aware postMessage protocol for parent iframes. Whenever the
  // viewport changes, we tell the parent "my content height is N pixels"
  // so they can resize the iframe to match. Parents listen via
  // window.addEventListener("message", e => e.data?.type === "worlddots-resize" && ...).
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return undefined;
    const post = () => {
      window.parent.postMessage(
        { type: "worlddots-resize", height: document.documentElement.scrollHeight, source: params.source },
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

  if (!hasWebGL) {
    return (
      <div className="embed-view embed-view-fallback">
        <p>This browser doesn't support WebGL 2. Worlddots needs WebGL 2 to render the globe.</p>
        <p>
          <a href="https://worlddots.app/" target="_blank" rel="noreferrer noopener">
            Open Worlddots in a supported browser →
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="embed-view" data-source={params.source}>
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
          background={settings.background}
          transparent={settings.transparent}
          morphMode={params.view === "flat" ? "flat" : "globe"}
          morphTransition={null}
          interactive={false}
          tiltX={settings.tiltX}
          tiltY={settings.tiltY}
          mapDepth={55}
          mapZoom={1}
          panelCollapsed
          spaceSettings={{ density: 65, motion: 35, nebula: 55, hue: 0, brightness: 100 }}
          shaderSettings={settings.shaderSettings}
          globeSettings={settings.globeSettings}
          backgroundStyle="solid"
          reducedMotion={motionFrozen}
          label="Worlddots dotted globe (embed)"
        />
      </Suspense>
    </div>
  );
};
