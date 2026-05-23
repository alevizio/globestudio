import { useEffect } from "react";
import { lookPresets } from "../data/look-presets.js";

// Reads `/looks/:id` from the URL on mount and applies the matching
// preset, then listens for popstate so browser back/forward navigates
// between presets. Each preset has a stable kebab-case id (see
// public/schema/look-preset.json) — the route is a 1:1 reflection of
// that id, no extra resolution.
export const useRouteLook = (applyLook) => {
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
    // applyLook is stable via App's useCallback([]); depend on identity at
    // mount only so re-renders don't re-bind the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
