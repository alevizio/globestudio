import { useEffect } from "react";
import { lookPresets } from "../data/look-presets.js";

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const clampZoom = (value) =>
  Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +value.toFixed(2)));

// Global single-key shortcuts: S shuffle, D export, R reset, H toggle
// panel, G toggle view, +/-/0 zoom, [/] cycle preset, ?/Shift+/ toggle
// help. Bails when the user is in a field so typing in the country
// search / color picker still works, and when a modifier is held so OS
// chords (cmd+r reload, etc.) pass through untouched.
//
// Setters are passed in directly (rather than wrapped callbacks) so App
// doesn't need to mint a stable identity for every key action.
// `viewModeRef.current` is read at fire-time so toggling is always
// relative to the live view mode.
export const useKeyboardShortcuts = ({
  viewModeRef,
  shuffle,
  reset,
  applyLook,
  toggleView,
  setExportModalOpen,
  setShortcutsOpen,
  setPanelCollapsed,
  setMapZoom,
  setAmbientMode,
  setPaletteOpen,
  flashHint,
}) => {
  useEffect(() => {
    const onKey = (event) => {
      // Cmd+K / Ctrl+K — open the command palette. Allowed even when
      // focus is in a text field, because the palette IS the field the
      // user wants to type into next.
      const isPaletteCombo =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "k";
      if (isPaletteCombo) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
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
        shuffle();
        flashHint("S", "Shuffle");
      } else if (key === "d") {
        event.preventDefault();
        setExportModalOpen(true);
        flashHint("D", "Export");
      } else if (key === "r") {
        event.preventDefault();
        reset();
        flashHint("R", "Reset");
      } else if (key === "h") {
        event.preventDefault();
        setPanelCollapsed((collapsed) => {
          flashHint("H", collapsed ? "Show panel" : "Hide panel");
          return !collapsed;
        });
      } else if (key === "g") {
        event.preventDefault();
        const next = viewModeRef.current === "globe" ? "flat" : "globe";
        toggleView(next);
        flashHint("G", next === "globe" ? "Globe view" : "Flat view");
      } else if (key === "b") {
        // Ambient mode toggle — hides every piece of UI chrome so the
        // canvas reads as a single full-bleed art piece.
        event.preventDefault();
        setAmbientMode((current) => {
          flashHint("B", current ? "Exit ambient mode" : "Ambient mode");
          return !current;
        });
      } else if (event.key === "+" || event.key === "=" || event.key === "-" || event.key === "_") {
        // +/= zoom in, -/_ zoom out. Including the unshifted = and _ so users
        // don't need to hold Shift on US keyboards. 0 resets.
        event.preventDefault();
        const direction = event.key === "+" || event.key === "=" ? 1 : -1;
        setMapZoom((current) => clampZoom(current + direction * ZOOM_STEP));
        flashHint(direction > 0 ? "+" : "−", direction > 0 ? "Zoom in" : "Zoom out");
      } else if (event.key === "0") {
        event.preventDefault();
        setMapZoom(1);
        flashHint("0", "Reset zoom");
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
        flashHint(event.key, next.name);
      } else if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault();
        setShortcutsOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    shuffle,
    reset,
    applyLook,
    toggleView,
    setExportModalOpen,
    setShortcutsOpen,
    setPanelCollapsed,
    setMapZoom,
    setAmbientMode,
    setPaletteOpen,
    flashHint,
    viewModeRef,
  ]);
};
