import { useEffect } from "react";
import { TRACKPAD_ZOOM_IGNORE_SELECTOR } from "../config/constants.js";
import { clampNumber } from "../utils/math.js";

// Captures trackpad pinch-zoom (`gesture*` events on Safari, ctrl/meta+wheel
// on Chromium/Firefox) and ordinary scroll-wheel zoom across the whole app
// shell. Ignores gestures that start inside elements matching
// TRACKPAD_ZOOM_IGNORE_SELECTOR (scrollable lists, code blocks, the panel
// itself) so those scroll natively. In flat view, anchors the zoom on the
// pointer position by shifting mapOffset alongside the new zoom — the
// canvas centerline stays under the user's finger.
export const useTrackpadZoom = ({
  mapZoomRef,
  viewModeRef,
  setMapZoom,
  setMapOffset,
}) => {
  useEffect(() => {
    const shouldIgnore = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(TRACKPAD_ZOOM_IGNORE_SELECTOR)) return true;
      const shell = document.querySelector(".app-shell");
      return Boolean(target && shell && !shell.contains(target));
    };

    const applyZoom = (event, nextZoom, currentZoom) => {
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

    const onWheel = (event) => {
      if (event.defaultPrevented || shouldIgnore(event)) return;

      const deltaScale =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const dominantDelta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      const delta = dominantDelta * deltaScale;
      if (!Number.isFinite(delta) || Math.abs(delta) < 0.01) return;

      event.preventDefault();
      event.stopPropagation();

      const currentZoom = clampNumber(mapZoomRef.current, 0.5, 3);
      const intensity = event.ctrlKey || event.metaKey ? 0.01 : 0.0018;
      const nextZoom = clampNumber(currentZoom * Math.exp(-delta * intensity), 0.5, 3);
      applyZoom(event, nextZoom, currentZoom);
    };

    const onGestureStart = (event) => {
      if (shouldIgnore(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.__worldDotsGestureZoom = clampNumber(
        mapZoomRef.current,
        0.5,
        3,
      );
    };

    const onGestureChange = (event) => {
      if (shouldIgnore(event)) return;
      event.preventDefault();
      event.stopPropagation();

      const currentZoom = clampNumber(mapZoomRef.current, 0.5, 3);
      const startZoom = clampNumber(
        event.currentTarget.__worldDotsGestureZoom || currentZoom,
        0.5,
        3,
      );
      const scale = Number.isFinite(event.scale) ? event.scale : 1;
      const nextZoom = clampNumber(startZoom * scale, 0.5, 3);
      applyZoom(event, nextZoom, currentZoom);
    };

    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("gesturestart", onGestureStart, {
      capture: true,
      passive: false,
    });
    window.addEventListener("gesturechange", onGestureChange, {
      capture: true,
      passive: false,
    });

    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("gesturestart", onGestureStart, { capture: true });
      window.removeEventListener("gesturechange", onGestureChange, { capture: true });
    };
    // Refs + setters are stable for the App component's lifetime; depend on
    // identity at mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
