import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TRACKPAD_ZOOM_IGNORE_SELECTOR,
  US_COUNTRY_ID,
} from "./config/constants.js";
import { DEFAULT_SHADER_SETTINGS } from "./config/shader-effects.js";
import {
  DEFAULT_GLOBE_SETTINGS,
  GLOBE_MORPH_DURATION,
} from "./config/globe-settings.js";
import { areaOptionByValue, areaOptions } from "./data/geography.js";
import { lookPresets } from "./data/look-presets.js";
import { loadUsStates } from "./data/us-states.js";
import { clampNumber } from "./utils/math.js";
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
import { ControlPanel } from "./components/control-panel.jsx";
import { ErrorBoundary } from "./components/error-boundary.jsx";
import { ExportModal } from "./components/export-modal.jsx";
import { LooksBar } from "./components/looks-bar.jsx";
import { ShortcutsOverlay } from "./components/shortcuts-overlay.jsx";
import { DottedGlobe, Download, Github, Keyboard, Moon, PanelLeftClose, PanelLeftOpen, Sun } from "./components/icons.jsx";
import { FollowTooltip } from "./components/ui/follow-tooltip.jsx";
import { IconButton } from "./components/ui/icon-button.jsx";
import { MapZoomControls } from "./components/ui/map-zoom-controls.jsx";
import { ViewModeSwitch } from "./components/ui/view-mode-switch.jsx";

const GlobeBackground = lazy(() =>
  import("./components/globe-background.jsx").then((m) => ({ default: m.GlobeBackground })),
);

const App = () => {
  const globeCanvasRef = useRef(null);
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
  const [mapZoom, setMapZoom] = useState(0.8);
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
  const [shaderSettings, setShaderSettings] = usePersistedState("shaderSettings", DEFAULT_SHADER_SETTINGS);
  const [globeSettings, setGlobeSettings] = usePersistedState("globeSettings", DEFAULT_GLOBE_SETTINGS);
  // First-time mobile visitors land on the globe with the panel hidden so the
  // visual is the first impression. Returning users keep their saved choice.
  const [panelCollapsed, setPanelCollapsed] = usePersistedState(
    "panelCollapsed",
    typeof window !== "undefined" && window.innerWidth < 720,
  );
  const [animationsEnabled, setAnimationsEnabled] = usePersistedState("animationsEnabled", true);
  // UI theme: "dark" (default) or "light". Only swaps the panel/picker tokens —
  // the canvas/globe rendering stays on its dark base because the artwork
  // is colored independently and reads best against the canvas's own background.
  const [uiTheme, setUiTheme] = usePersistedState("uiTheme", "dark");
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
  const [statusMessage, setStatusMessage] = useState("");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
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

  // Read /looks/:id from the URL on first mount and apply that preset.
  // Also listen for popstate so browser back/forward navigates between presets.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const applyFromPath = () => {
      const match = window.location.pathname.match(/^\/looks\/([a-z0-9-]+)\/?$/i);
      if (!match) return;
      const preset = lookPresets.find((p) => p.id === match[1]);
      if (preset) applyLook(preset);
    };
    applyFromPath();
    window.addEventListener("popstate", applyFromPath);
    return () => window.removeEventListener("popstate", applyFromPath);
    // applyLook is stable via useCallback([]) so safe to depend on identity only at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const selectedCountryId = selection.startsWith("country:") ? selection.replace("country:", "") : "";
    if (selectedCountryId !== US_COUNTRY_ID || usStates.length > 0) return undefined;

    let cancelled = false;
    loadUsStates().then((states) => {
      if (!cancelled) setUsStates(states);
    });
    return () => {
      cancelled = true;
    };
  }, [selection, usStates.length]);

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
      label: option.label.replace(" (Region)", "").replace(" (Subregion)", ""),
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
    setBackground("#0a0a0a");
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
    setDotColor("#ffffff");
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
    setWorldFill("#5a5a64");
    setWorldFillAlpha(1);
    setWorldFillGradient(null);
    setWorldFillVisible(true);
    setWorldStroke("#f6f2ea");
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
    if (s.selection !== undefined) setSelection(s.selection);
    if (s.stateSelection !== undefined) setStateSelection(s.stateSelection);
    if (s.background !== undefined) setBackground(s.background);
    if (s.transparent !== undefined) setTransparent(s.transparent);
    if (s.backgroundStyle !== undefined) setBackgroundStyle(s.backgroundStyle);
    if (s.spaceSettings) setSpaceSettings((current) => ({ ...current, ...s.spaceSettings }));
    if (s.density !== undefined) setDensity(s.density);
    if (s.dotSize !== undefined) setDotSize(s.dotSize);
    if (s.dotColor !== undefined) setDotColor(s.dotColor);
    if (s.dotColorAlpha !== undefined) setDotColorAlpha(s.dotColorAlpha);
    if (s.dotGradient !== undefined) setDotGradient(s.dotGradient);
    if (s.dotsVisible !== undefined) setDotsVisible(s.dotsVisible);
    if (s.shape !== undefined) setShape(s.shape);
    if (s.dotRotation !== undefined) setDotRotation(s.dotRotation);
    if (s.rotateAnimating !== undefined) setRotateAnimating(s.rotateAnimating);
    if (s.sizeVary !== undefined) setSizeVary(s.sizeVary);
    if (s.customShape !== undefined) setCustomShape(s.customShape);
    if (s.asciiSymbol !== undefined) setAsciiSymbol(s.asciiSymbol);
    if (s.renderMode !== undefined) setRenderMode(s.renderMode);
    if (s.worldFill !== undefined) setWorldFill(s.worldFill);
    if (s.worldFillAlpha !== undefined) setWorldFillAlpha(s.worldFillAlpha);
    if (s.worldFillGradient !== undefined) setWorldFillGradient(s.worldFillGradient);
    if (s.worldFillVisible !== undefined) setWorldFillVisible(s.worldFillVisible);
    if (s.worldStroke !== undefined) setWorldStroke(s.worldStroke);
    if (s.worldStrokeAlpha !== undefined) setWorldStrokeAlpha(s.worldStrokeAlpha);
    if (s.worldStrokeGradient !== undefined) setWorldStrokeGradient(s.worldStrokeGradient);
    if (s.worldStrokeVisible !== undefined) setWorldStrokeVisible(s.worldStrokeVisible);
    if (s.worldStrokeWidth !== undefined) setWorldStrokeWidth(s.worldStrokeWidth);
    if (s.shaderSettings) setShaderSettings(s.shaderSettings);
    if (s.globeSettings) setGlobeSettings(s.globeSettings);
    if (s.mapDepth !== undefined) setMapDepth(s.mapDepth);
    if (s.tiltX !== undefined) setTiltX(s.tiltX);
    if (s.tiltY !== undefined) setTiltY(s.tiltY);
    setSelectedDots(new Set());
    setAppliedLookId(preset.id);
    setStatusMessage(`Applied ${preset.name}`);
    window.setTimeout(() => setAppliedLookId((id) => (id === preset.id ? null : id)), 700);
    // Sync the URL so the look becomes a shareable, indexable surface.
    if (typeof window !== "undefined" && window.history?.pushState) {
      const url = `/looks/${preset.id}`;
      if (window.location.pathname !== url) {
        window.history.pushState({ lookId: preset.id }, "", url);
      }
      // Per-preset SEO + share metadata. The chip preview image (if any) doubles
      // as the OG card so each preset has a distinct link preview. Falls back to
      // the homepage og.svg when no previewImage is present. Wired into
      // docs/research/2026-05-seo-playbook.md Finding 3.
      const title = `${preset.name} — Worlddots dotted globe`;
      const description = `${preset.blurb}. Generate dotted maps and animated 3D globes with the ${preset.name} preset. Export as PNG, SVG, or WebM.`;
      const absoluteUrl = `https://worlddots.app/looks/${preset.id}`;
      const previewImage = preset.previewImage
        ? `https://worlddots.app${preset.previewImage}`
        : "https://worlddots.app/og.svg";
      document.title = title;
      const setMeta = (selector, content) => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute("content", content);
      };
      setMeta('meta[name="description"]', description);
      setMeta('meta[property="og:title"]', title);
      setMeta('meta[property="og:description"]', description);
      setMeta('meta[property="og:url"]', absoluteUrl);
      setMeta('meta[property="og:image"]', previewImage);
      setMeta('meta[name="twitter:title"]', title);
      setMeta('meta[name="twitter:description"]', description);
      setMeta('meta[name="twitter:image"]', previewImage);
    }
  }, []);

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
    setStatusMessage("Reset to defaults");
    window.setTimeout(() => setResetFlash(false), 600);
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.history.pushState({}, "", "/");
      // Restore the homepage SEO + share metadata (mirrors the applyLook block
      // above). Keeps link previews accurate when users navigate back to root.
      const homeTitle = "Worlddots — Open-Source Dotted Maps and 3D Globes for Designers";
      const homeDescription = "Designer-first tool for dotted maps and animated 3D globes. Pick any country, region, or US state. Customize shapes, gradients, shader effects. Export PNG, SVG, WebM. Open source under MIT.";
      const homeImage = "https://worlddots.app/og.svg";
      document.title = homeTitle;
      const setMeta = (selector, content) => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute("content", content);
      };
      setMeta('meta[name="description"]', homeDescription);
      setMeta('meta[property="og:title"]', homeTitle);
      setMeta('meta[property="og:description"]', homeDescription);
      setMeta('meta[property="og:url"]', "https://worlddots.app/");
      setMeta('meta[property="og:image"]', homeImage);
      setMeta('meta[name="twitter:title"]', "Worlddots — Open-Source Dotted Maps and 3D Globes");
      setMeta('meta[name="twitter:description"]', homeDescription);
      setMeta('meta[name="twitter:image"]', homeImage);
    }
  }, []);

  const changeViewMode = useCallback((nextMode) => {
    if (nextMode === viewMode) return;

    window.clearTimeout(viewTransitionTimeoutRef.current);
    setViewTransition(nextMode === "globe" ? "to-globe" : "to-flat");
    setViewMode(nextMode);
    viewTransitionTimeoutRef.current = window.setTimeout(() => {
      setViewTransition(null);
    }, GLOBE_MORPH_DURATION + 80);
  }, [viewMode]);

  // Single-key shortcuts for the common panel actions. We bail when the user
  // is in a field so typing in the country search / color picker still works,
  // and when a modifier is held so OS chords (cmd+r reload, etc.) pass through.
  useEffect(() => {
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (target.isContentEditable) return;
      }
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        shuffleLook();
        flashKeyboardHint("S", "Shuffle");
      } else if (key === "d") {
        event.preventDefault();
        setExportModalOpen(true);
        flashKeyboardHint("D", "Export");
      } else if (key === "r") {
        event.preventDefault();
        handleReset();
        flashKeyboardHint("R", "Reset");
      } else if (key === "h") {
        event.preventDefault();
        setPanelCollapsed((collapsed) => {
          flashKeyboardHint("H", collapsed ? "Show panel" : "Hide panel");
          return !collapsed;
        });
      } else if (key === "g") {
        event.preventDefault();
        const next = viewModeRef.current === "globe" ? "flat" : "globe";
        changeViewMode(next);
        flashKeyboardHint("G", next === "globe" ? "Globe view" : "Flat view");
      } else if (event.key === "+" || event.key === "=" || event.key === "-" || event.key === "_") {
        // +/= zoom in, -/_ zoom out. Including the unshifted = and _ so users
        // don't need to hold Shift on US keyboards. 0 resets.
        event.preventDefault();
        const direction = event.key === "+" || event.key === "=" ? 1 : -1;
        setMapZoom((current) => {
          const next = Math.max(0.5, Math.min(3, +(current + direction * 0.1).toFixed(2)));
          return next;
        });
        flashKeyboardHint(direction > 0 ? "+" : "−", direction > 0 ? "Zoom in" : "Zoom out");
      } else if (event.key === "0") {
        event.preventDefault();
        setMapZoom(1);
        flashKeyboardHint("0", "Reset zoom");
      } else if (event.key === "[" || event.key === "]") {
        // Cycle through look presets. Anchor on the URL (/looks/:id) when
        // available — that's the canonical "last applied" — otherwise start
        // from index 0 so the first press always lands somewhere predictable.
        event.preventDefault();
        const direction = event.key === "]" ? 1 : -1;
        const pathMatch = window.location.pathname.match(/^\/looks\/([^/]+)/);
        const anchorIndex = pathMatch
          ? lookPresets.findIndex((p) => p.id === pathMatch[1])
          : -1;
        const startIndex = anchorIndex >= 0 ? anchorIndex : 0;
        const nextIndex = (startIndex + direction + lookPresets.length) % lookPresets.length;
        const next = lookPresets[nextIndex];
        applyLook(next);
        flashKeyboardHint(event.key, next.name);
      } else if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault();
        setShortcutsOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shuffleLook, handleReset, changeViewMode, setPanelCollapsed, flashKeyboardHint, applyLook]);

  useEffect(() => {
    const shouldIgnoreTrackpadZoom = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(TRACKPAD_ZOOM_IGNORE_SELECTOR)) return true;

      const shell = document.querySelector(".app-shell");
      return Boolean(target && shell && !shell.contains(target));
    };

    const applyTrackpadZoom = (event, nextZoom, currentZoom) => {
      if (Math.abs(nextZoom - currentZoom) < 0.001) return;

      const shell = document.querySelector(".app-shell");
      if (viewModeRef.current === "flat" && shell) {
        const rect = shell.getBoundingClientRect();
        const pointerX = event.clientX - rect.left - rect.width / 2;
        const pointerY = event.clientY - rect.top - rect.height / 2;
        const zoomRatio = nextZoom / currentZoom;

        setMapOffset((offset) => ({
          x: pointerX - (pointerX - offset.x) * zoomRatio,
          y: pointerY - (pointerY - offset.y) * zoomRatio,
        }));
      }

      setMapZoom(Number(nextZoom.toFixed(3)));
    };

    const handleTrackpadWheel = (event) => {
      if (event.defaultPrevented || shouldIgnoreTrackpadZoom(event)) return;

      const deltaScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const dominantDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      const delta = dominantDelta * deltaScale;
      if (!Number.isFinite(delta) || Math.abs(delta) < 0.01) return;

      event.preventDefault();
      event.stopPropagation();

      const currentZoom = clampNumber(mapZoomRef.current, 0.5, 3);
      const intensity = event.ctrlKey || event.metaKey ? 0.01 : 0.0018;
      const nextZoom = clampNumber(currentZoom * Math.exp(-delta * intensity), 0.5, 3);
      applyTrackpadZoom(event, nextZoom, currentZoom);
    };

    const handleGestureStart = (event) => {
      if (shouldIgnoreTrackpadZoom(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.__worldDotsGestureZoom = clampNumber(mapZoomRef.current, 0.5, 3);
    };

    const handleGestureChange = (event) => {
      if (shouldIgnoreTrackpadZoom(event)) return;
      event.preventDefault();
      event.stopPropagation();

      const currentZoom = clampNumber(mapZoomRef.current, 0.5, 3);
      const startZoom = clampNumber(event.currentTarget.__worldDotsGestureZoom || currentZoom, 0.5, 3);
      const scale = Number.isFinite(event.scale) ? event.scale : 1;
      const nextZoom = clampNumber(startZoom * scale, 0.5, 3);
      applyTrackpadZoom(event, nextZoom, currentZoom);
    };

    window.addEventListener("wheel", handleTrackpadWheel, { capture: true, passive: false });
    window.addEventListener("gesturestart", handleGestureStart, { capture: true, passive: false });
    window.addEventListener("gesturechange", handleGestureChange, { capture: true, passive: false });

    return () => {
      window.removeEventListener("wheel", handleTrackpadWheel, { capture: true });
      window.removeEventListener("gesturestart", handleGestureStart, { capture: true });
      window.removeEventListener("gesturechange", handleGestureChange, { capture: true });
    };
  }, []);

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

  const exportConfig = () => {
    const config = {
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
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    downloadBlob(blob, buildExportFilename(selected.label, "json", viewMode));
    setStatusMessage("Configuration exported");
  };

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
      <h1 className="visually-hidden">Worlddots — dotted maps and globe generator</h1>
      <div className="visually-hidden" role="status" aria-live="polite">{statusMessage}</div>


      <ErrorBoundary
        fallback={({ reset }) => (
          <div className="map-background-error" role="alert">
            <p>Couldn’t load the globe view.</p>
            <button type="button" className="button" onClick={() => { reset(); window.location.reload(); }}>
              Reload
            </button>
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

      <ViewModeSwitch viewMode={viewMode} setViewMode={changeViewMode} />
      <MapZoomControls value={mapZoom} onChange={setMapZoom} />

      <nav className="social-links" aria-label="Project links">
        <a
          className="social-link"
          href="https://github.com/alevizio/worlddots"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="View source on GitHub"
          data-tooltip="View source on GitHub"
        >
          <Github size={15} />
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
          <PanelLeftOpen size={15} />
        </button>
      )}

      <section
        className={`control-rail ${panelCollapsed ? "is-collapsed" : ""}`}
        aria-hidden={panelCollapsed}
      >
        <div className="panel-header">
          <div className="panel-meta">
            <span
              className={`panel-meta-icon ${appliedLookId ? "is-rippling" : ""}`}
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
              onClick={() => setUiTheme((current) => (current === "dark" ? "light" : "dark"))}
              aria-label={uiTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              aria-pressed={uiTheme === "light"}
              data-tooltip={uiTheme === "dark" ? "Switch to light UI" : "Switch to dark UI"}
            >
              {uiTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              type="button"
              className="panel-icon-button"
              onClick={() => setShortcutsOpen(true)}
              aria-label="Show keyboard shortcuts"
              data-tooltip="Keyboard shortcuts (?)"
            >
              <Keyboard size={14} />
            </button>
            <button
              type="button"
              className="panel-icon-button"
              onClick={() => setExportModalOpen(true)}
              aria-label="Open export dialog"
              data-tooltip="Export (D)"
            >
              <Download size={14} />
            </button>
            <button
              type="button"
              className="panel-icon-button"
              onClick={() => setPanelCollapsed(true)}
              aria-label="Hide panel"
              data-tooltip="Hide panel (H)"
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
        </div>
        <LooksBar onPick={applyLook} appliedId={appliedLookId} />

        <ControlPanel
            selection={selection}
            setSelection={(value) => {
              setSelection(value);
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
            setRenderMode={setRenderMode}
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
      />

      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {keyboardHint && (
        <div className="keyboard-hint" role="status" aria-live="polite">
          <kbd className="keyboard-hint-key">{keyboardHint.key}</kbd>
          <span className="keyboard-hint-label">{keyboardHint.label}</span>
        </div>
      )}
      <FollowTooltip />
    </main>
  );
};

export default App;
