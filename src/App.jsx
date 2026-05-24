import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { US_COUNTRY_ID } from "./config/constants.js";
import { DEFAULT_SHADER_SETTINGS } from "./config/shader-effects.js";
import {
  DEFAULT_GLOBE_SETTINGS,
  GLOBE_MORPH_DURATION,
} from "./config/globe-settings.js";
import { areaOptionByValue, areaOptions } from "./data/geography.js";
import { lookPresets } from "./data/look-presets.js";
import { presetTags } from "./data/preset-tags.js";
import { useUsStatesLoader } from "./hooks/use-us-states-loader.js";
import { useShareConfigImport } from "./hooks/use-share-config-import.js";
import { useRouteLook } from "./hooks/use-route-look.js";
import { useSheetDrag } from "./hooks/use-sheet-drag.js";
import { useTrackpadZoom } from "./hooks/use-trackpad-zoom.js";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts.js";
import { usePrefetchHeavyChunks } from "./hooks/use-prefetch-heavy-chunks.js";
import { clampNumber } from "./utils/math.js";
import { invertGradient, invertHex } from "./utils/color.js";
import { buildShareUrl } from "./utils/share-config.js";
import {
  createCountryMapData,
  createStateMapData,
  makeFeatureCollection,
} from "./utils/dot-generation.js";
import { createDottedSvg } from "./utils/svg-markup.js";
import {
  buildExportFilename,
  copyTextToClipboard,
  downloadBlob,
  exportScaleValue,
  pickVideoMimeType,
  recordCanvasToVideoBlob,
} from "./utils/export.js";
import { clearPersistedState, usePersistedState } from "./hooks/use-persisted-state.js";
import { usePrefersReducedMotion } from "./hooks/use-prefers-reduced-motion.js";
import { hasWebGL } from "./utils/webgl-support.js";
import { CanvasA11yProxy } from "./components/canvas-a11y-proxy.jsx";
import { ControlPanel } from "./components/control-panel.jsx";
import { ErrorBoundary } from "./components/error-boundary.jsx";
import { NoWebGLFallback } from "./components/no-webgl-fallback.jsx";
import { PresetDetail } from "./components/preset-detail.jsx";
import { updatePresetRoute } from "./utils/preset-route.js";
import { ExportModal } from "./components/export-modal.jsx";
import { LooksBar } from "./components/looks-bar.jsx";
import { AboutOverlay } from "./components/about-overlay.jsx";
import { ShortcutsOverlay } from "./components/shortcuts-overlay.jsx";
import { CommandPalette } from "./components/command-palette.jsx";
import { OnboardingHint } from "./components/onboarding-hint.jsx";
import { Analytics, track } from "./components/analytics.jsx";
import { BrandPage } from "./components/brand-page.jsx";
import { DocsPage } from "./components/docs-page.jsx";
import { ChangelogPage } from "./components/changelog-page.jsx";
import { PrivacyPage } from "./components/privacy-page.jsx";
import { NotFoundPage } from "./components/not-found-page.jsx";
import { Bug, DottedGlobe, Download, Github, Info, Keyboard, Moon, PanelLeftClose, PanelLeftOpen, Sun } from "./components/icons.jsx";
import { FollowTooltip } from "./components/ui/follow-tooltip.jsx";
import { IconButton } from "./components/ui/icon-button.jsx";
import { MapZoomControls } from "./components/ui/map-zoom-controls.jsx";
import { ViewModeSwitch } from "./components/ui/view-mode-switch.jsx";

const GlobeBackground = lazy(() =>
  import("./components/globe-background.jsx").then((m) => ({ default: m.GlobeBackground })),
);

const App = () => {
  // Static-page routes — /brand and /docs are takeover pages, not the
  // canvas + panel app. /looks/:id and / fall through to the canvas
  // app; anything else lands on the 404 takeover. SPA navigation
  // happens via full reload (anchor href="/path") so no router
  // library needed.
  if (typeof window !== "undefined") {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    if (path === "/brand") return <BrandPage />;
    if (path === "/docs") return <DocsPage />;
    if (path === "/changelog") return <ChangelogPage />;
    if (path === "/privacy") return <PrivacyPage />;
    const isHome = path === "/";
    const isPresetRoute = /^\/looks\/[\w-]+$/.test(path);
    const isEmbed = path === "/embed";
    if (!isHome && !isPresetRoute && !isEmbed) return <NotFoundPage />;
  }

  const globeCanvasRef = useRef(null);
  // Probe once on first mount whether WebGL is available. If not, the
  // <GlobeBackground> render path below is replaced by <NoWebGLFallback>
  // and Three.js never loads. The probe is synchronous + cheap (creates
  // and discards a 1x1 canvas) so doing it during render is fine.
  const webglSupported = useMemo(() => hasWebGL(), []);
  // Toggle a body class so the fallback's stylesheet can hide
  // canvas-dependent chrome (control panel, looks bar, zoom, perf hud).
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.toggle("is-no-webgl", !webglSupported);
    return () => document.body.classList.remove("is-no-webgl");
  }, [webglSupported]);
  const [selection, setSelection] = usePersistedState("selection", "world");
  const [stateSelection, setStateSelection] = usePersistedState("stateSelection", "all");
  const [canvasScale, setCanvasScale] = usePersistedState("canvasScale", "1x");
  const [background, setBackground] = usePersistedState("background", "#0a0a0a");
  const [transparent, setTransparent] = usePersistedState("transparent", false);
  const [backgroundStyle, setBackgroundStyle] = usePersistedState("backgroundStyle", "solid");
  const DEFAULT_SPACE_SETTINGS = {
    density: 65,
    motion: 35,
    nebula: 55,
    hue: 0,
    brightness: 100,
  };
  const [spaceSettings, setSpaceSettings] = usePersistedState("spaceSettings", DEFAULT_SPACE_SETTINGS);
  const [viewMode, setViewMode] = useState("globe");
  const [viewTransition, setViewTransition] = useState(null);
  const viewTransitionTimeoutRef = useRef(0);
  // Default map zoom — desktop starts at 0.8 for a "looking at the world"
  // framing. Mobile gets 1.5 so the globe actually fills the visible
  // canvas area above the bottom sheet instead of feeling small.
  const [mapZoom, setMapZoom] = useState(() => {
    if (typeof window === "undefined") return 0.8;
    return window.innerWidth < 620 ? 2.2 : 0.8;
  });
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const mapZoomRef = useRef(mapZoom);
  const viewModeRef = useRef(viewMode);
  const [mapDepth, setMapDepth] = usePersistedState("mapDepth", 55);
  const [tiltX, setTiltX] = usePersistedState("tiltX", 0);
  const [tiltY, setTiltY] = usePersistedState("tiltY", 0);
  const [density, setDensity] = usePersistedState("density", 40);
  const [dotSize, setDotSize] = usePersistedState("dotSize", 10);
  const [dotColor, setDotColor] = usePersistedState("dotColor", "#ffffff");
  // Solid-color opacity, 0–1. Separate state so the persisted dotColor stays
  // a clean 6-char hex.
  const [dotColorAlpha, setDotColorAlpha] = usePersistedState("dotColorAlpha", 1);
  // Optional linear-gradient color fill. When set, every dot is recolored
  // based on its position on the map (lat/lng projected onto the angle
  // vector). Stored as { from, to, angle, fromAlpha, toAlpha } so it
  // survives reloads with per-stop opacity.
  const [dotGradient, setDotGradient] = usePersistedState("dotGradient", null);
  const [dotsVisible, setDotsVisible] = usePersistedState("dotsVisible", true);
  const [shape, setShape] = usePersistedState("shape", "Circle");
  const [dotRotation, setDotRotation] = usePersistedState("dotRotation", 0);
  const [rotateAnimating, setRotateAnimating] = usePersistedState("rotateAnimating", false);
  const [sizeVary, setSizeVary] = usePersistedState("sizeVary", false);
  const [asciiSymbol, setAsciiSymbol] = usePersistedState("asciiSymbol", "*");
  const [customShape, setCustomShape] = usePersistedState("customShape", null);
  const [renderMode, setRenderMode] = usePersistedState("renderMode", "dots");
  const [worldFill, setWorldFill] = usePersistedState("worldFill", "#5a5a64");
  const [worldFillAlpha, setWorldFillAlpha] = usePersistedState("worldFillAlpha", 1);
  const [worldFillGradient, setWorldFillGradient] = usePersistedState("worldFillGradient", null);
  const [worldFillVisible, setWorldFillVisible] = usePersistedState("worldFillVisible", true);
  const [worldStroke, setWorldStroke] = usePersistedState("worldStroke", "#f6f2ea");
  const [worldStrokeAlpha, setWorldStrokeAlpha] = usePersistedState("worldStrokeAlpha", 1);
  const [worldStrokeGradient, setWorldStrokeGradient] = usePersistedState("worldStrokeGradient", null);
  const [worldStrokeVisible, setWorldStrokeVisible] = usePersistedState("worldStrokeVisible", true);
  const [worldStrokeWidth, setWorldStrokeWidth] = usePersistedState("worldStrokeWidth", 1.8);
  // Flat-plane projection used when render mode is Solid. Sphere always uses
  // equirectangular regardless. See docs/research/2026-05-map-data-alternatives.md
  // Finding 3 for the projection inventory.
  const [flatProjection, setFlatProjection] = usePersistedState("flatProjection", "mercator");
  // Rivers overlay (solid mode only in v1). Toggle is off by default so the
  // ~120KB gzipped river dataset isn't fetched until designers opt in.
  const [riversVisible, setRiversVisible] = usePersistedState("riversVisible", false);
  // Cities overlay — populated places drawn as size-scaled dots. Off by
  // default; same lazy-load + texture-rebuild architecture as rivers.
  // citiesMinPop filters by population threshold so designers can hide
  // small towns when they only want major cities.
  const [citiesVisible, setCitiesVisible] = usePersistedState("citiesVisible", false);
  const [citiesMinPop, setCitiesMinPop] = usePersistedState("citiesMinPop", 0);
  // User-supplied GeoJSON FeatureCollection — designers paste any line/point
  // data (transit, custom paths, points of interest, isolines) and it
  // overlays the solid texture. Stored as raw JSON string in localStorage;
  // parsed + validated on use. Empty string = no custom topology.
  const [customTopologyRaw, setCustomTopologyRaw] = usePersistedState("customTopologyRaw", "");
  const [customTopologyVisible, setCustomTopologyVisible] = usePersistedState("customTopologyVisible", false);
  // Parse + validate the raw JSON once per change. Invalid input becomes null
  // so the texture treats it as "no custom data" and skips the overlay block.
  const customTopology = useMemo(() => {
    if (!customTopologyRaw) return null;
    try {
      const parsed = JSON.parse(customTopologyRaw);
      if (parsed?.type !== "FeatureCollection" || !Array.isArray(parsed.features)) return null;
      // Filter to supported geometry types so a polygon-heavy input doesn't
      // surprise the user when polygons get silently ignored.
      const supportedTypes = new Set(["LineString", "MultiLineString", "Point", "MultiPoint"]);
      return {
        type: "FeatureCollection",
        features: parsed.features.filter((f) => supportedTypes.has(f?.geometry?.type)),
      };
    } catch (_) {
      return null;
    }
  }, [customTopologyRaw]);
  const [shaderSettings, setShaderSettings] = usePersistedState("shaderSettings", DEFAULT_SHADER_SETTINGS);
  const [globeSettings, setGlobeSettings] = usePersistedState("globeSettings", DEFAULT_GLOBE_SETTINGS);
  // First-time mobile visitors land on the globe with the panel hidden so the
  // visual is the first impression. Returning users keep their saved choice.
  const [panelCollapsed, setPanelCollapsed] = usePersistedState(
    "panelCollapsed",
    typeof window !== "undefined" && window.innerWidth < 720,
  );
  const { dragOffset, isDragging, handlers: sheetHandlers } = useSheetDrag(
    panelCollapsed,
    setPanelCollapsed,
  );
  const [animationsEnabled, setAnimationsEnabled] = usePersistedState("animationsEnabled", true);
  // UI theme: "dark" (default) or "light". Only swaps the panel/picker tokens —
  // the canvas/globe rendering stays on its dark base because the artwork
  // is colored independently and reads best against the canvas's own background.
  const [uiTheme, setUiTheme] = usePersistedState("uiTheme", "dark");
  // Theme toggle that *also* RGB-inverts every user-facing color so the
  // canvas/globe flip cleanly between dark and light. Solid colors get
  // (255-r, 255-g, 255-b); gradients invert each stop while preserving
  // angle/midpoint/per-stop alphas. Alphas, projection, and numeric
  // settings stay put. Round-trips losslessly — toggle twice and you
  // get back to where you started.
  const toggleTheme = useCallback(() => {
    // Briefly mark the root with .is-theme-transitioning so CSS can attach
    // a one-shot ~320ms transition to every background-color / color /
    // border-color / fill change. Without this the panels snap between
    // themes; with it they crossfade. The class is auto-cleared so the
    // transition doesn't compound onto normal interactions afterward.
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("is-theme-transitioning");
      window.setTimeout(() => {
        document.documentElement.classList.remove("is-theme-transitioning");
      }, 360);
    }
    setUiTheme((current) => (current === "dark" ? "light" : "dark"));
    setDotColor((c) => invertHex(c));
    setWorldFill((c) => invertHex(c));
    setWorldStroke((c) => invertHex(c));
    setBackground((c) => invertHex(c));
    setDotGradient((g) => invertGradient(g));
    setWorldFillGradient((g) => invertGradient(g));
    setWorldStrokeGradient((g) => invertGradient(g));
  }, [
    setUiTheme,
    setDotColor,
    setWorldFill,
    setWorldStroke,
    setBackground,
    setDotGradient,
    setWorldFillGradient,
    setWorldStrokeGradient,
  ]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", uiTheme);
  }, [uiTheme]);
  const [copyStatus, setCopyStatus] = useState("idle");
  const [selectedDots, setSelectedDots] = useState(new Set());
  const [usStates, setUsStates] = useState([]);
  const [videoStatus, setVideoStatus] = useState("idle");
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDurationMs, setVideoDurationMs] = useState(5000);
  const videoSupported = useMemo(() => Boolean(pickVideoMimeType()), []);
  // Brief acknowledgments after destructive/successful actions. Each is a
  // single-shot flag that auto-clears so the button can be re-pressed.
  const [resetFlash, setResetFlash] = useState(false);
  const [shuffleFlash, setShuffleFlash] = useState(false);
  const [pngStatus, setPngStatus] = useState("idle");
  const [svgStatus, setSvgStatus] = useState("idle");
  const [appliedLookId, setAppliedLookId] = useState(null);
  // Persistent record of which preset is currently shown (vs appliedLookId
  // which clears 700ms after click for the ripple animation). Drives
  // PresetDetail rendering + tracks URL state. Initialized from the URL
  // path so /looks/halftone direct loads work without a click.
  const [currentPresetId, setCurrentPresetId] = useState(() => {
    if (typeof window === "undefined") return null;
    const match = window.location.pathname.match(/^\/looks\/([\w-]+)/);
    return match ? match[1] : null;
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Transient toast shown when a keyboard shortcut fires. Auto-clears after a
  // short delay; the ref tracks the latest timeout so successive keys reset it
  // instead of stacking.
  const [keyboardHint, setKeyboardHint] = useState(null);
  const keyboardHintTimeoutRef = useRef(0);
  const flashKeyboardHint = useCallback((key, label) => {
    setKeyboardHint({ key, label });
    window.clearTimeout(keyboardHintTimeoutRef.current);
    keyboardHintTimeoutRef.current = window.setTimeout(() => {
      setKeyboardHint(null);
    }, 1400);
  }, []);
  const prefersReducedMotion = usePrefersReducedMotion();
  // Animations are frozen when either the OS setting requests reduced motion
  // OR the user has flipped the in-app toggle off.
  const motionFrozen = prefersReducedMotion || !animationsEnabled;

  // Derive globe / space settings that respect the user's motion preferences.
  // Keep the underlying state intact so toggling restores values automatically.
  const effectiveGlobeSettings = useMemo(() => {
    if (!motionFrozen) return globeSettings;
    return { ...globeSettings, autoSpin: false, network: false };
  }, [globeSettings, motionFrozen]);
  const effectiveSpaceSettings = useMemo(() => {
    if (!motionFrozen) return spaceSettings;
    return { ...spaceSettings, motion: 0 };
  }, [spaceSettings, motionFrozen]);
  const effectiveShaderSettings = useMemo(() => {
    if (!motionFrozen) return shaderSettings;
    return { ...shaderSettings, motion: 0 };
  }, [shaderSettings, motionFrozen]);

  mapZoomRef.current = mapZoom;
  viewModeRef.current = viewMode;

  useUsStatesLoader(selection, usStates.length, setUsStates);

  usePrefetchHeavyChunks();
  // useRouteLook + useShareConfigImport are deliberately declared further
  // down — they pass `applyLook` and `importConfig`, which are defined
  // later in the component body. Calling them up here would hit the
  // temporal dead zone for those `const`s and crash on first render.

  const selected = useMemo(() => {
    const selectedCountryId = selection.startsWith("country:") ? selection.replace("country:", "") : "";
    const shouldUseState = selectedCountryId === US_COUNTRY_ID && stateSelection !== "all" && usStates.length > 0;

    if (shouldUseState) {
      const selectedState = usStates.find((item) => item._id === stateSelection) || usStates[0];
      return {
        mode: "state",
        label: selectedState._displayName,
        collection: makeFeatureCollection([selectedState]),
        countryCodes: [],
      };
    }

    const option = areaOptionByValue.get(selection) || areaOptions[0];

    return {
      mode: "country",
      label: option.label.replace(" (Continent)", "").replace(" (Subregion)", ""),
      countryCodes: option.ids,
      collection: null,
    };
  }, [selection, stateSelection, usStates]);

  const mapData = useMemo(() => {
    if (selected.mode === "state") {
      return createStateMapData(selected.collection, density, shape);
    }

    return createCountryMapData(selected.countryCodes, density);
  }, [density, selected, shape]);

  const dotCount = dotsVisible ? mapData.points.length : 0;

  const exportSvgData = useMemo(
    () =>
      createDottedSvg({
        mapData,
        dotColor,
        dotColorAlpha,
        dotGradient,
        dotSize,
        shape,
        asciiSymbol,
        dotsVisible,
        background,
        transparent,
        selectedDots,
        mode: selected.mode,
        shaderSettings,
        sizeVary,
        customShape,
        crop: true,
        scale: exportScaleValue(canvasScale),
        label: `${selected.label} dotted map`,
      }),
    [
      asciiSymbol,
      background,
      canvasScale,
      customShape,
      dotColor,
      dotColorAlpha,
      dotGradient,
      dotSize,
      dotsVisible,
      mapData,
      selected.label,
      selected.mode,
      selectedDots,
      shaderSettings,
      shape,
      sizeVary,
      transparent,
    ],
  );

  const reset = () => {
    clearPersistedState();
    setSelection("world");
    setStateSelection("all");
    setCanvasScale("1x");
    // Reset to theme-aware defaults — apply light-mode equivalents when the
    // user is in light theme so the canvas doesn't snap back to a dark-on-light
    // palette after they reset.
    const t = (c) => (uiTheme === "light" ? invertHex(c) : c);
    setBackground(t("#0a0a0a"));
    setTransparent(false);
    setBackgroundStyle("solid");
    setSpaceSettings({ ...DEFAULT_SPACE_SETTINGS });
    setViewMode("globe");
    setViewTransition(null);
    window.clearTimeout(viewTransitionTimeoutRef.current);
    setMapZoom(0.8);
    setMapOffset({ x: 0, y: 0 });
    setMapDepth(55);
    setTiltX(0);
    setTiltY(0);
    setDensity(40);
    setDotSize(10);
    setDotColor(t("#ffffff"));
    setDotsVisible(true);
    setShape("Circle");
    setDotRotation(0);
    setRotateAnimating(false);
    setSizeVary(false);
    setCustomShape(null);
    setDotGradient(null);
    setDotColorAlpha(1);
    setAsciiSymbol("*");
    setRenderMode("dots");
    setWorldFill(t("#5a5a64"));
    setWorldFillAlpha(1);
    setWorldFillGradient(null);
    setWorldFillVisible(true);
    setWorldStroke(t("#f6f2ea"));
    setWorldStrokeAlpha(1);
    setWorldStrokeGradient(null);
    setWorldStrokeVisible(true);
    setWorldStrokeWidth(1.8);
    setShaderSettings({ ...DEFAULT_SHADER_SETTINGS });
    setGlobeSettings({ ...DEFAULT_GLOBE_SETTINGS });
    setPanelCollapsed(false);
    setAnimationsEnabled(true);
    setSelectedDots(new Set());
  };

  const applyLook = useCallback((preset) => {
    const s = preset.settings;
    // Look presets are authored against the dark canvas. When the user is
    // in light theme, invert every color (RGB complement) so the preset
    // still reads "right" — light dots stay visible against a cream bg,
    // dark world-fills invert to light, gradients flip per stop. The
    // shader-driven visual identity (Risograph ink, Aurora bands, dither
    // patterns) is preserved because shaders use the base colors as inputs.
    const themeColor = (c) => (uiTheme === "light" ? invertHex(c) : c);
    const themeGradient = (g) => (uiTheme === "light" ? invertGradient(g) : g);
    if (s.selection !== undefined) setSelection(s.selection);
    if (s.stateSelection !== undefined) setStateSelection(s.stateSelection);
    if (s.background !== undefined) setBackground(themeColor(s.background));
    if (s.transparent !== undefined) setTransparent(s.transparent);
    if (s.backgroundStyle !== undefined) setBackgroundStyle(s.backgroundStyle);
    if (s.spaceSettings) setSpaceSettings((current) => ({ ...current, ...s.spaceSettings }));
    if (s.density !== undefined) setDensity(s.density);
    if (s.dotSize !== undefined) setDotSize(s.dotSize);
    if (s.dotColor !== undefined) setDotColor(themeColor(s.dotColor));
    if (s.dotColorAlpha !== undefined) setDotColorAlpha(s.dotColorAlpha);
    if (s.dotGradient !== undefined) setDotGradient(themeGradient(s.dotGradient));
    if (s.dotsVisible !== undefined) setDotsVisible(s.dotsVisible);
    if (s.shape !== undefined) setShape(s.shape);
    if (s.dotRotation !== undefined) setDotRotation(s.dotRotation);
    if (s.rotateAnimating !== undefined) setRotateAnimating(s.rotateAnimating);
    if (s.sizeVary !== undefined) setSizeVary(s.sizeVary);
    if (s.customShape !== undefined) setCustomShape(s.customShape);
    if (s.asciiSymbol !== undefined) setAsciiSymbol(s.asciiSymbol);
    if (s.renderMode !== undefined) setRenderMode(s.renderMode);
    if (s.worldFill !== undefined) setWorldFill(themeColor(s.worldFill));
    if (s.worldFillAlpha !== undefined) setWorldFillAlpha(s.worldFillAlpha);
    if (s.worldFillGradient !== undefined) setWorldFillGradient(themeGradient(s.worldFillGradient));
    if (s.worldFillVisible !== undefined) setWorldFillVisible(s.worldFillVisible);
    if (s.worldStroke !== undefined) setWorldStroke(themeColor(s.worldStroke));
    if (s.worldStrokeAlpha !== undefined) setWorldStrokeAlpha(s.worldStrokeAlpha);
    if (s.worldStrokeGradient !== undefined) setWorldStrokeGradient(themeGradient(s.worldStrokeGradient));
    if (s.worldStrokeVisible !== undefined) setWorldStrokeVisible(s.worldStrokeVisible);
    if (s.worldStrokeWidth !== undefined) setWorldStrokeWidth(s.worldStrokeWidth);
    if (s.shaderSettings) setShaderSettings(s.shaderSettings);
    if (s.globeSettings) setGlobeSettings(s.globeSettings);
    if (s.mapDepth !== undefined) setMapDepth(s.mapDepth);
    if (s.tiltX !== undefined) setTiltX(s.tiltX);
    if (s.tiltY !== undefined) setTiltY(s.tiltY);
    setSelectedDots(new Set());
    setAppliedLookId(preset.id);
    setCurrentPresetId(preset.id);
    setStatusMessage(`Applied ${preset.name}`);
    window.setTimeout(() => setAppliedLookId((id) => (id === preset.id ? null : id)), 700);
    // URL + per-preset SEO/share metadata (document.title, meta tags,
    // canonical link, BreadcrumbList JSON-LD). Pure DOM side-effect —
    // see src/utils/preset-route.js.
    updatePresetRoute(preset);
    // Privacy-respecting analytics: no PII, just which preset was
    // applied. See src/components/analytics.jsx for opt-out logic.
    track("preset_applied", { preset: preset.id });
  }, [uiTheme]);

  // Declared here (not at the top of the component body) so the
  // `applyLook` const above is already initialized — calling
  // `useRouteLook(applyLook)` earlier hits the TDZ on first render.
  useRouteLook(applyLook);

  // Curated palette + size sweet-spots. Picked to look good across most
  // preset combinations, not chaotic random hex codes that produce ugly mud.
  const SHUFFLE_COLORS = useMemo(
    () => ["#ffffff", "#f6f2ea", "#9adfff", "#ffd58a", "#ff9ef3", "#b793ff", "#b7ffef", "#ffb8a3", "#a8ffaf"],
    [],
  );
  const SHUFFLE_SHAPES = useMemo(
    () => ["Circle", "Hexagon", "Square", "Triangle", "Diamond", "Pentagon"],
    [],
  );

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const shuffleLook = useCallback(() => {
    const preset = pick(lookPresets);
    applyLook(preset);
    // Brief flash class so the shuffle icon does a tumble — confirms the
    // action even when the resulting visual change is subtle.
    setShuffleFlash(true);
    window.setTimeout(() => setShuffleFlash(false), 620);
    // Layer extra randomness on top of the preset for variety. The preset gives
    // us a tested aesthetic; the overrides give the reroll some surprise.
    window.setTimeout(() => {
      if (preset.settings.renderMode !== "solid") {
        setDotColor(pick(SHUFFLE_COLORS));
        if (preset.id === "default" || Math.random() < 0.4) {
          setShape(pick(SHUFFLE_SHAPES));
        }
      }
      setStatusMessage(`Shuffled to ${preset.name}`);
    }, 50);
  }, [SHUFFLE_COLORS, SHUFFLE_SHAPES, applyLook]);

  const handleReset = useCallback(() => {
    reset();
    setResetFlash(true);
    setCurrentPresetId(null);
    setStatusMessage("Reset to defaults");
    window.setTimeout(() => setResetFlash(false), 600);
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.history.pushState({}, "", "/");
      // Restore the homepage SEO + share metadata (mirrors the applyLook block
      // above). Keeps link previews accurate when users navigate back to root.
      const homeTitle = "Globestudio — Open-Source Dotted Maps and 3D Globes for Designers";
      const homeDescription = "Designer-first tool for dotted maps and animated 3D globes. Pick any country, region, or US state. Customize shapes, gradients, shader effects. Export PNG, SVG, WebM. Open source under MIT.";
      const homeImage = "https://globestudio.app/og/default.png";
      document.title = homeTitle;
      const setMeta = (selector, content) => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute("content", content);
      };
      setMeta('meta[name="description"]', homeDescription);
      setMeta('meta[property="og:title"]', homeTitle);
      setMeta('meta[property="og:description"]', homeDescription);
      setMeta('meta[property="og:url"]', "https://globestudio.app/");
      setMeta('meta[property="og:image"]', homeImage);
      setMeta('meta[name="twitter:title"]', "Globestudio — Open-Source Dotted Maps and 3D Globes");
      setMeta('meta[name="twitter:description"]', homeDescription);
      setMeta('meta[name="twitter:image"]', homeImage);
      // Restore the canonical URL to the homepage when navigating back to root.
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute("href", "https://globestudio.app/");
      // Remove the per-route breadcrumb script when navigating back to root
      // so the homepage doesn't carry stale breadcrumb context.
      const breadcrumbScript = document.getElementById("breadcrumb-ld");
      if (breadcrumbScript) breadcrumbScript.remove();
    }
  }, []);

  // Setter wrappers that announce to the aria-live region (WCAG 4.1.3
  // Status Messages). Underlying state setters stay pure; only the boundary
  // passed to ControlPanel adds the announcement so other internal callers
  // don't fire a duplicate.
  const handleRenderModeChange = useCallback((next) => {
    setRenderMode(next);
    setStatusMessage(next === "solid" ? "Switched to solid mode" : "Switched to dot mode");
  }, [setRenderMode]);

  const handleRiversToggle = useCallback((next) => {
    setRiversVisible(next);
    setStatusMessage(next ? "Rivers shown" : "Rivers hidden");
  }, [setRiversVisible]);

  const handleCitiesToggle = useCallback((next) => {
    setCitiesVisible(next);
    setStatusMessage(next ? "Cities shown" : "Cities hidden");
  }, [setCitiesVisible]);

  const handleProjectionChange = useCallback((next) => {
    setFlatProjection(next);
    // Friendly label rather than the raw enum value.
    const label = ({ mercator: "Mercator", equalEarth: "Equal Earth", naturalEarth1: "Natural Earth", winkel3: "Winkel Tripel", robinson: "Robinson" })[next] || next;
    setStatusMessage(`Projection: ${label}`);
  }, [setFlatProjection]);

  const handleSelectionChange = useCallback((next) => {
    setSelection(next);
    // Selection values are namespaced ("country:USA", "continent:Europe", etc.)
    // — only announce a friendly label for known shapes; skip the raw value
    // for "world" since the visual update is obvious.
    if (typeof next === "string" && next !== "world") {
      const [type, id] = next.split(":");
      const friendly = id?.replace(/-/g, " ") ?? next;
      setStatusMessage(`Selection: ${friendly} (${type})`);
    }
  }, [setSelection]);

  const changeViewMode = useCallback((nextMode) => {
    if (nextMode === viewMode) return;

    window.clearTimeout(viewTransitionTimeoutRef.current);
    setViewTransition(nextMode === "globe" ? "to-globe" : "to-flat");
    setViewMode(nextMode);
    viewTransitionTimeoutRef.current = window.setTimeout(() => {
      setViewTransition(null);
    }, GLOBE_MORPH_DURATION + 80);
    // Announce the view switch to screen readers via the existing aria-live
    // region. WCAG 4.1.3 Status Messages.
    setStatusMessage(nextMode === "globe" ? "Switched to globe view" : "Switched to flat view");
  }, [viewMode]);

  useKeyboardShortcuts({
    viewModeRef,
    shuffle: shuffleLook,
    reset: handleReset,
    applyLook,
    toggleView: changeViewMode,
    setExportModalOpen,
    setShortcutsOpen,
    setPanelCollapsed,
    setMapZoom,
    setPaletteOpen,
    flashHint: flashKeyboardHint,
  });

  useTrackpadZoom({ mapZoomRef, viewModeRef, setMapZoom, setMapOffset });

  useEffect(() => () => window.clearTimeout(viewTransitionTimeoutRef.current), []);

  const exportSvg = () => {
    downloadBlob(
      new Blob([exportSvgData.svg], { type: "image/svg+xml;charset=utf-8" }),
      buildExportFilename(selected.label, "svg", viewMode),
    );
    setSvgStatus("saved");
    setStatusMessage("SVG saved");
    window.setTimeout(() => setSvgStatus("idle"), 1800);
  };

  const exportVideo = useCallback(async (options = {}) => {
    const canvas = globeCanvasRef.current;
    if (!canvas || videoStatus === "recording") return;
    setVideoStatus("recording");
    setVideoProgress(0);
    try {
      const blob = await recordCanvasToVideoBlob(canvas, {
        durationMs: options.durationMs ?? videoDurationMs,
        fps: options.fps ?? 60,
        onProgress: setVideoProgress,
      });
      downloadBlob(blob, buildExportFilename(selected.label, "webm", viewMode));
      setVideoStatus("ready");
      window.setTimeout(() => setVideoStatus("idle"), 2200);
    } catch (error) {
      console.error("Video export failed", error);
      setVideoStatus("idle");
    } finally {
      setVideoProgress(0);
    }
  }, [selected.label, videoDurationMs, videoStatus, viewMode]);

  // Snapshot of every user-customizable visual setting. Shared between
  // exportConfig (downloads as .json) and getShareUrl (encodes into a
  // ?c=… link). One source of truth so the two paths can't drift.
  const buildCurrentConfig = useCallback(
    () => ({
      version: 1,
      selection,
      stateSelection,
      background,
      transparent,
      backgroundStyle,
      density,
      dotSize,
      dotColor,
      dotColorAlpha,
      dotGradient,
      dotsVisible,
      shape,
      dotRotation,
      rotateAnimating,
      sizeVary,
      asciiSymbol,
      customShape,
      renderMode,
      worldFill,
      worldFillAlpha,
      worldFillGradient,
      worldFillVisible,
      worldStroke,
      worldStrokeAlpha,
      worldStrokeGradient,
      worldStrokeVisible,
      worldStrokeWidth,
      mapDepth,
      tiltX,
      tiltY,
      shaderSettings,
      globeSettings,
      spaceSettings,
      animationsEnabled,
    }),
    [
      selection, stateSelection, background, transparent, backgroundStyle,
      density, dotSize, dotColor, dotColorAlpha, dotGradient, dotsVisible,
      shape, dotRotation, rotateAnimating, sizeVary, asciiSymbol, customShape,
      renderMode, worldFill, worldFillAlpha, worldFillGradient, worldFillVisible,
      worldStroke, worldStrokeAlpha, worldStrokeGradient, worldStrokeVisible,
      worldStrokeWidth, mapDepth, tiltX, tiltY, shaderSettings, globeSettings,
      spaceSettings, animationsEnabled,
    ],
  );

  const exportConfig = () => {
    // Prepend a $schema reference so editors (VS Code, Cursor, WebStorm)
    // pick up autocomplete + validation when the user opens the
    // downloaded file. The schema lives at /public/schema/config.json.
    const config = {
      $schema: "https://globestudio.app/schema/config.json",
      ...buildCurrentConfig(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    downloadBlob(blob, buildExportFilename(selected.label, "json", viewMode));
    setStatusMessage("Configuration exported");
  };

  // URL that restores the current customizations when opened — used by
  // the export modal's Share tab. Lands at "/" (not /looks/:id) so the
  // landing-page mount doesn't apply preset defaults on top of the
  // share config and clobber its differences.
  const getShareUrl = useCallback(
    () =>
      buildShareUrl(
        buildCurrentConfig(),
        typeof window !== "undefined" ? window.location.origin : "https://globestudio.app",
        "/",
      ),
    [buildCurrentConfig],
  );

  const importConfig = (config) => {
    if (!config || typeof config !== "object") return;
    const set = (key, setter) => {
      if (config[key] !== undefined) setter(config[key]);
    };
    set("selection", setSelection);
    set("stateSelection", setStateSelection);
    set("background", setBackground);
    set("transparent", setTransparent);
    set("backgroundStyle", setBackgroundStyle);
    set("density", setDensity);
    set("dotSize", setDotSize);
    set("dotColor", setDotColor);
    set("dotColorAlpha", setDotColorAlpha);
    set("dotGradient", setDotGradient);
    set("dotsVisible", setDotsVisible);
    set("shape", setShape);
    set("dotRotation", setDotRotation);
    set("rotateAnimating", setRotateAnimating);
    set("sizeVary", setSizeVary);
    set("customShape", setCustomShape);
    set("asciiSymbol", setAsciiSymbol);
    set("renderMode", setRenderMode);
    set("worldFill", setWorldFill);
    set("worldFillAlpha", setWorldFillAlpha);
    set("worldFillGradient", setWorldFillGradient);
    set("worldFillVisible", setWorldFillVisible);
    set("worldStroke", setWorldStroke);
    set("worldStrokeAlpha", setWorldStrokeAlpha);
    set("worldStrokeGradient", setWorldStrokeGradient);
    set("worldStrokeVisible", setWorldStrokeVisible);
    set("worldStrokeWidth", setWorldStrokeWidth);
    set("mapDepth", setMapDepth);
    set("tiltX", setTiltX);
    set("tiltY", setTiltY);
    set("animationsEnabled", setAnimationsEnabled);
    if (config.shaderSettings) setShaderSettings((current) => ({ ...current, ...config.shaderSettings }));
    if (config.globeSettings) setGlobeSettings((current) => ({ ...current, ...config.globeSettings }));
    if (config.spaceSettings) setSpaceSettings((current) => ({ ...current, ...config.spaceSettings }));
    setStatusMessage("Configuration imported");
  };

  // Declared here (not at the top of the component body) so `importConfig`
  // above is already initialized — calling
  // `useShareConfigImport(importConfig, …)` earlier hits the TDZ on the
  // first render.
  useShareConfigImport(importConfig, setStatusMessage);

  const copySvg = useCallback(async () => {
    try {
      await copyTextToClipboard(exportSvgData.svg);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
      return true;
    } catch {
      setCopyStatus("manual");
      return false;
    }
  }, [exportSvgData.svg]);

  const flashPngSaved = () => {
    setPngStatus("saved");
    setStatusMessage("PNG saved");
    window.setTimeout(() => setPngStatus("idle"), 1800);
  };

  const exportPng = async (options = {}) => {
    const activeGlobeCanvas = globeCanvasRef.current;
    if (activeGlobeCanvas?.width && activeGlobeCanvas?.height) {
      const scale = options.scale ?? exportScaleValue(canvasScale);
      const filename = buildExportFilename(selected.label, "png", viewMode);

      // Prefer the true high-res re-render path when available — the WebGL scene
      // is rendered fresh at N× resolution so dots and stars stay crisp.
      if (typeof activeGlobeCanvas.captureAtScale === "function") {
        try {
          const blob = await activeGlobeCanvas.captureAtScale(scale);
          if (blob) {
            downloadBlob(blob, filename);
            flashPngSaved();
            return;
          }
        } catch (error) {
          console.warn("High-res capture failed, falling back to upscale", error);
        }
      }

      // Fallback: Canvas2D upscale of the current framebuffer. Lower quality at
      // higher scales but always works.
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(activeGlobeCanvas.width * scale);
      canvas.height = Math.round(activeGlobeCanvas.height * scale);
      const context = canvas.getContext("2d");
      if (!context) return;
      if (!transparent) {
        context.fillStyle = background;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(activeGlobeCanvas, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          downloadBlob(pngBlob, filename);
          flashPngSaved();
        }
      }, "image/png");
      return;
    }

    const blob = new Blob([exportSvgData.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(exportSvgData.width);
      canvas.height = Math.round(exportSvgData.height);
      const context = canvas.getContext("2d");
      if (!transparent) {
        context.fillStyle = background;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          downloadBlob(pngBlob, buildExportFilename(selected.label, "png", viewMode));
          flashPngSaved();
        }
        URL.revokeObjectURL(url);
      }, "image/png");
    };

    image.src = url;
  };

  const isViewTransitioning = Boolean(viewTransition);
  const globeGlowOpacity = viewMode === "globe" && globeSettings.glow
    ? (globeSettings.look === "borderless" ? 0.18 : 0.12)
      + (clampNumber(globeSettings.glowStrength, 0, 100) / 100) * (globeSettings.look === "borderless" ? 0.48 : 0.36)
    : 0;

  const isSpaceBackground = backgroundStyle === "space";
  const isTransparentBackground = backgroundStyle === "transparent" || transparent;
  const effectiveTransparent = isTransparentBackground || isSpaceBackground;

  // Command-palette actions. Built fresh on every render — cheap, and
  // it means the closures always capture the latest values (current
  // viewMode, panel-collapsed state, etc.) without juggling deps.
  // Preset rows carry the preset object so the palette can render the
  // matching LookPreview thumbnail.
  const paletteActions = [
    ...lookPresets.map((preset) => ({
      id: `apply:${preset.id}`,
      label: preset.name,
      group: "Look",
      preset,
      // Searchable adjectives (e.g. "synthwave", "retro", "print") so
      // typing in Cmd+K finds presets by vibe, not just exact name.
      // See src/data/preset-tags.js.
      tags: presetTags[preset.id],
      run: () => applyLook(preset),
    })),
    {
      id: "shuffle",
      label: "Shuffle to a random look",
      group: "Action",
      kbd: "S",
      run: () => shuffleLook(),
    },
    {
      id: "reset",
      label: "Reset to defaults",
      group: "Action",
      kbd: "R",
      run: () => handleReset(),
    },
    {
      id: "view",
      label: viewMode === "globe" ? "Switch to flat view" : "Switch to globe view",
      group: "View",
      kbd: "G",
      run: () => changeViewMode(viewMode === "globe" ? "flat" : "globe"),
    },
    {
      id: "panel",
      label: panelCollapsed ? "Show control panel" : "Hide control panel",
      group: "View",
      kbd: "H",
      run: () => setPanelCollapsed((v) => !v),
    },
    {
      id: "export",
      label: "Open export dialog",
      group: "Action",
      kbd: "D",
      run: () => setExportModalOpen(true),
    },
    {
      id: "shortcuts",
      label: "Show keyboard shortcuts",
      group: "Help",
      kbd: "?",
      run: () => setShortcutsOpen(true),
    },
    {
      id: "about",
      label: "About Globestudio",
      group: "Help",
      run: () => setAboutOpen(true),
    },
  ];

  return (
    <main
      className={`app-shell ${viewMode === "globe" ? "is-globe-mode" : "is-flat-mode"} ${
        globeSettings.look === "borderless" ? "is-borderless-globe" : ""
      } ${
        isTransparentBackground && !isSpaceBackground ? "is-transparent-preview" : ""
      } ${
        isSpaceBackground ? "is-space-background" : ""
      } ${
        panelCollapsed ? "is-panel-collapsed" : ""
      } ${
        viewTransition ? `is-view-transitioning is-${viewTransition}` : ""
      } ${
        currentPresetId ? "has-preset-detail" : ""
      } ${
        appliedLookId ? "is-preset-applying" : ""
      }`}
      style={{
        "--preview-bg": isSpaceBackground ? "#03030a" : isTransparentBackground ? "#f4f4f4" : background,
        "--map-offset-x": `${mapOffset.x}px`,
        "--map-offset-y": `${mapOffset.y}px`,
        "--map-perspective": `${1800 - mapDepth * 14}px`,
        "--map-zoom": mapZoom,
        "--shader-glow": `${Math.max(0, shaderSettings.intensity * 0.16)}px`,
        "--shader-glow-wide": `${Math.max(0, shaderSettings.intensity * 0.32)}px`,
        "--globe-bg-glow-opacity": globeGlowOpacity,
        "--globe-glow-spread": `${30 + (clampNumber(globeSettings.glowSpread, 0, 100) / 100) * 80}%`,
        "--globe-glow-blur": `${(clampNumber(globeSettings.glowSpread, 0, 100) / 100) * 18}px`,
        "--shader-intensity": shaderSettings.intensity / 100,
        "--shader-split": `${shaderSettings.split}px`,
        "--shader-split-neg": `${-shaderSettings.split}px`,
        "--tilt-x": `${tiltX}deg`,
        "--tilt-y": `${tiltY}deg`,
      }}
    >
      {/* Skip link — visible only when keyboard-focused, lands on the canvas
          so keyboard users don't have to tab through chrome to reach the
          globe. WCAG 2.4.1 Bypass Blocks (Level A). */}
      <a href="#globe-canvas" className="skip-link">Skip to globe</a>
      <h1 className="visually-hidden">Globestudio — dotted maps and globe generator</h1>
      <div className="visually-hidden" role="status" aria-live="polite">{statusMessage}</div>
      {/* Persistent screen-reader description of canvas state. The existing
          aria-live status above narrates *changes*; this proxy gives
          assistive tech a *persistent* description that's navigable any time.
          See docs/plans/accessibility-rollout.md Phase 5. */}
      <CanvasA11yProxy
        viewMode={viewMode}
        renderMode={renderMode}
        selection={selected}
        lookId={appliedLookId}
        lookName={lookPresets.find((p) => p.id === appliedLookId)?.name}
        density={density}
        dotCount={mapData?.points?.length ?? 0}
        effect={shaderSettings.effect}
        flatProjection={flatProjection}
        riversVisible={riversVisible}
        citiesVisible={citiesVisible}
      />


      {!webglSupported ? (
        <NoWebGLFallback />
      ) : (
      <ErrorBoundary
        fallback={({ reset, error }) => (
          <div className="map-background-error" role="alert">
            <p>Couldn’t load the globe view.</p>
            <div className="map-background-error-actions">
              <button type="button" className="button" onClick={() => { reset(); window.location.reload(); }}>
                Reload
              </button>
              {/* Pre-fills the bug-report form with the error message so we
                  see what the user hit. Encoded so newlines + special chars
                  flow through cleanly. */}
              <a
                className="button button-ghost"
                href={`https://github.com/alevizio/globestudio/issues/new?template=bug-report.yml&title=${encodeURIComponent("[bug]: globe view failed to load")}&what-happened=${encodeURIComponent(`Error: ${error?.message || "unknown"}\n\nURL: ${typeof window !== "undefined" ? window.location.href : ""}\nUA: ${typeof navigator !== "undefined" ? navigator.userAgent : ""}`)}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                Report this issue
              </a>
            </div>
          </div>
        )}
      >
        <Suspense fallback={<div className="map-background-placeholder" aria-hidden="true" />}>
          <GlobeBackground
            mapData={mapData}
            selectedDots={selectedDots}
            dotColor={dotColor}
            dotSize={dotSize}
            dotsVisible={dotsVisible}
            shape={shape}
            dotRotation={dotRotation}
            rotateAnimating={rotateAnimating && !motionFrozen}
            sizeVary={sizeVary}
            asciiSymbol={asciiSymbol}
            customShape={customShape}
            dotGradient={dotGradient}
            dotColorAlpha={dotColorAlpha}
            renderMode={renderMode}
            worldFill={worldFill}
            worldFillAlpha={worldFillAlpha}
            worldFillGradient={worldFillGradient}
            worldFillVisible={worldFillVisible}
            worldStroke={worldStroke}
            worldStrokeAlpha={worldStrokeAlpha}
            worldStrokeGradient={worldStrokeGradient}
            worldStrokeVisible={worldStrokeVisible}
            worldStrokeWidth={worldStrokeWidth}
            flatProjection={flatProjection}
            riversVisible={riversVisible}
            citiesVisible={citiesVisible}
            citiesMinPop={citiesMinPop}
            customTopology={customTopology}
            customTopologyVisible={customTopologyVisible}
            selectionCountryCodes={selected.countryCodes}
            selectionCollection={selected.collection}
            background={isSpaceBackground ? "#03030a" : background}
            transparent={effectiveTransparent}
            morphMode={viewMode === "globe" ? "globe" : "flat"}
            morphTransition={viewTransition}
            interactive={!isViewTransitioning}
            mapOffset={mapOffset}
            setMapOffset={setMapOffset}
            mapZoom={mapZoom}
            setMapZoom={setMapZoom}
            mapDepth={mapDepth}
            uiTheme={uiTheme}
            tiltX={tiltX}
            tiltY={tiltY}
            setSelectedDots={setSelectedDots}
            shaderSettings={effectiveShaderSettings}
            globeSettings={effectiveGlobeSettings}
            spaceSettings={effectiveSpaceSettings}
            backgroundStyle={backgroundStyle}
            reducedMotion={motionFrozen}
            canvasHandleRef={globeCanvasRef}
            panelCollapsed={panelCollapsed}
            label={`${selected.label} dotted ${viewMode === "globe" ? "globe" : "map"} background`}
          />
        </Suspense>
      </ErrorBoundary>
      )}

      <ViewModeSwitch viewMode={viewMode} setViewMode={changeViewMode} />
      <MapZoomControls value={mapZoom} onChange={setMapZoom} />

      <a
        className="social-link bug-link"
        href="https://github.com/alevizio/globestudio/issues/new?template=bug-report.yml"
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Report a bug"
        data-tooltip="Report a bug"
      >
        <Bug size={17} />
      </a>
      <nav className="social-links" aria-label="Project links">
        <a
          className="social-link"
          href="https://github.com/alevizio/globestudio"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="View source on GitHub"
          data-tooltip="View source on GitHub"
        >
          <Github size={17} />
        </a>
      </nav>

      {panelCollapsed && (
        <button
          type="button"
          className="panel-toggle"
          onClick={() => setPanelCollapsed(false)}
          aria-label="Show panel"
          data-tooltip="Show panel (H)"
        >
          <PanelLeftOpen size={17} />
        </button>
      )}

      <section
        className={`control-rail ${panelCollapsed ? "is-collapsed" : ""} ${isDragging ? "is-dragging" : ""}`}
        style={{ "--drag-offset": `${dragOffset}px` }}
        aria-hidden={panelCollapsed}
      >
        <button
          type="button"
          className="mobile-drag-handle"
          {...sheetHandlers}
          aria-label={panelCollapsed ? "Expand options panel" : "Collapse options panel"}
        >
          <span className="mobile-drag-handle-bar" aria-hidden="true" />
        </button>
        <div className="panel-header">
          <div className="panel-meta">
            <span
              className={`panel-meta-icon ${appliedLookId ? "is-rippling" : ""}`}
              role="img"
              aria-label={`${selected.label} — ${
                dotsVisible ? `${dotCount.toLocaleString()} dots` : "dots off"
              }`}
              title={`${selected.label} — ${
                dotsVisible ? `${dotCount.toLocaleString()} dots` : "dots off"
              }`}
            >
              <DottedGlobe size={56} />
            </span>
          </div>
          <div className="panel-header-actions">
            <button
              type="button"
              className="panel-icon-button"
              onClick={toggleTheme}
              aria-label={uiTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              aria-pressed={uiTheme === "light"}
              data-tooltip={uiTheme === "dark" ? "Switch to light UI" : "Switch to dark UI"}
            >
              {uiTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              className="panel-icon-button"
              onClick={() => setAboutOpen(true)}
              aria-label="About Globestudio"
              data-tooltip="About"
            >
              <Info size={16} />
            </button>
            <button
              type="button"
              className="panel-icon-button panel-icon-button--keyboard"
              onClick={() => setShortcutsOpen(true)}
              aria-label="Show keyboard shortcuts"
              data-tooltip="Keyboard shortcuts (?)"
            >
              <Keyboard size={16} />
            </button>
            <button
              type="button"
              className="panel-icon-button panel-icon-button--hide-panel"
              onClick={() => setPanelCollapsed(true)}
              aria-label="Hide panel"
              data-tooltip="Hide panel (H)"
            >
              <PanelLeftClose size={16} />
            </button>
            <button
              type="button"
              className="panel-icon-button panel-icon-button--primary"
              onClick={() => setExportModalOpen(true)}
              aria-label="Open export dialog"
              data-tooltip="Export (D)"
            >
              <Download size={16} />
            </button>
          </div>
        </div>
        <LooksBar onPick={applyLook} appliedId={appliedLookId} currentId={currentPresetId} />

        <ControlPanel
            selection={selection}
            setSelection={(value) => {
              handleSelectionChange(value);
              setSelectedDots(new Set());
            }}
            stateSelection={stateSelection}
            setStateSelection={(value) => {
              setStateSelection(value);
              setSelectedDots(new Set());
            }}
            background={background}
            setBackground={setBackground}
            transparent={transparent}
            setTransparent={setTransparent}
            backgroundStyle={backgroundStyle}
            setBackgroundStyle={setBackgroundStyle}
            spaceSettings={spaceSettings}
            setSpaceSettings={setSpaceSettings}
            mapDepth={mapDepth}
            setMapDepth={setMapDepth}
            tiltX={tiltX}
            setTiltX={setTiltX}
            tiltY={tiltY}
            setTiltY={setTiltY}
            density={density}
            setDensity={setDensity}
            dotSize={dotSize}
            setDotSize={setDotSize}
            dotColor={dotColor}
            setDotColor={setDotColor}
            dotColorAlpha={dotColorAlpha}
            setDotColorAlpha={setDotColorAlpha}
            dotGradient={dotGradient}
            setDotGradient={setDotGradient}
            dotsVisible={dotsVisible}
            setDotsVisible={setDotsVisible}
            shape={shape}
            dotRotation={dotRotation}
            setShape={setShape}
            setDotRotation={setDotRotation}
            rotateAnimating={rotateAnimating}
            setRotateAnimating={setRotateAnimating}
            sizeVary={sizeVary}
            setSizeVary={setSizeVary}
            asciiSymbol={asciiSymbol}
            customShape={customShape}
            setCustomShape={setCustomShape}
            setAsciiSymbol={setAsciiSymbol}
            renderMode={renderMode}
            setRenderMode={handleRenderModeChange}
            worldFill={worldFill}
            setWorldFill={setWorldFill}
            worldFillAlpha={worldFillAlpha}
            setWorldFillAlpha={setWorldFillAlpha}
            worldFillGradient={worldFillGradient}
            setWorldFillGradient={setWorldFillGradient}
            worldFillVisible={worldFillVisible}
            setWorldFillVisible={setWorldFillVisible}
            worldStroke={worldStroke}
            setWorldStroke={setWorldStroke}
            worldStrokeAlpha={worldStrokeAlpha}
            setWorldStrokeAlpha={setWorldStrokeAlpha}
            worldStrokeGradient={worldStrokeGradient}
            setWorldStrokeGradient={setWorldStrokeGradient}
            worldStrokeVisible={worldStrokeVisible}
            setWorldStrokeVisible={setWorldStrokeVisible}
            worldStrokeWidth={worldStrokeWidth}
            setWorldStrokeWidth={setWorldStrokeWidth}
            flatProjection={flatProjection}
            setFlatProjection={handleProjectionChange}
            riversVisible={riversVisible}
            setRiversVisible={handleRiversToggle}
            citiesVisible={citiesVisible}
            setCitiesVisible={handleCitiesToggle}
            citiesMinPop={citiesMinPop}
            setCitiesMinPop={setCitiesMinPop}
            customTopologyRaw={customTopologyRaw}
            setCustomTopologyRaw={setCustomTopologyRaw}
            customTopology={customTopology}
            customTopologyVisible={customTopologyVisible}
            setCustomTopologyVisible={setCustomTopologyVisible}
            shaderSettings={shaderSettings}
            setShaderSettings={setShaderSettings}
            globeSettings={globeSettings}
            setGlobeSettings={setGlobeSettings}
            animationsEnabled={animationsEnabled}
            setAnimationsEnabled={setAnimationsEnabled}
            viewMode={viewMode}
            usStates={usStates}
          />
      </section>

      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        canvasWidth={globeCanvasRef.current?.clientWidth || globeCanvasRef.current?.width || 1920}
        canvasHeight={globeCanvasRef.current?.clientHeight || globeCanvasRef.current?.height || 1080}
        exportPng={exportPng}
        pngStatus={pngStatus}
        exportSvg={exportSvg}
        svgStatus={svgStatus}
        copySvg={copySvg}
        copyStatus={copyStatus}
        exportVideo={exportVideo}
        videoStatus={videoStatus}
        videoProgress={videoProgress}
        videoDurationMs={videoDurationMs}
        setVideoDurationMs={setVideoDurationMs}
        videoSupported={videoSupported}
        exportConfig={exportConfig}
        importConfig={importConfig}
        getShareUrl={getShareUrl}
      />

      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <AboutOverlay open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={paletteActions}
      />

      {keyboardHint && (
        <div className="keyboard-hint" role="status" aria-live="polite">
          <kbd className="keyboard-hint-key">{keyboardHint.key}</kbd>
          <span className="keyboard-hint-label">{keyboardHint.label}</span>
        </div>
      )}
      <FollowTooltip />
      <OnboardingHint />
      <Analytics />
      {/* Per-preset long-form copy below the fold. Renders only when a
          preset is applied (i.e. on /looks/:id URLs). Drives SEO Phase 4
          — each preset URL gets 200+ words of unique designer-facing
          content + a "When to use this" section. See docs/plans/
          seo-rollout.md Phase 4 and src/data/preset-seo.js for the copy. */}
      {currentPresetId && (
        <PresetDetail preset={lookPresets.find((p) => p.id === currentPresetId)} />
      )}
    </main>
  );
};

export default App;
