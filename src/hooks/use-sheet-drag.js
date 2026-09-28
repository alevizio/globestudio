import { useCallback, useEffect, useRef } from "react";

// Past this speed a release goes the way the finger was moving, however short
// the drag. In px per ms, so 0.5 is 500 px/s, a flick.
const FLING_VELOCITY = 0.5;
// Without a flick, a drag this long (px) changes the state.
const SNAP_DISTANCE = 60;
// Release velocity comes from the last stretch of movement only, so a drag
// that stops and then lets go reads as slow.
const VELOCITY_WINDOW_MS = 100;
// Movement under this (px) is still a tap.
const TAP_SLOP = 6;
// Past either end of the sheet's travel the finger moves it at this rate.
const OVERDRAG = 0.2;
// A click that lands this soon (ms) after a drag belongs to the drag.
const CLICK_AFTER_DRAG_MS = 400;
// Touches that start on these keep their own gesture: sliders drag
// sideways, text fields select.
const NO_DRAG = 'input[type="range"], textarea, [data-sheet-no-drag]';

// Which state a released drag lands in. Exported for the tests.
export const resolveSheetSnap = ({ wasCollapsed, delta, velocity }) => {
  if (velocity > FLING_VELOCITY) return true;
  if (velocity < -FLING_VELOCITY) return false;
  return wasCollapsed ? delta > -SNAP_DISTANCE : delta > SNAP_DISTANCE;
};

// Finger delta to sheet offset: 1:1 inside the travel between the peek and
// fully open, damped past either end so the sheet can't leave the bottom.
const sheetOffset = ({ wasCollapsed, delta, travel }) => {
  const min = wasCollapsed ? -travel : 0;
  const max = wasCollapsed ? 0 : travel;
  if (delta < min) return min + (delta - min) * OVERDRAG;
  if (delta > max) return max + (delta - max) * OVERDRAG;
  return delta;
};

const releaseVelocity = (samples, now) => {
  const recent = samples.filter((sample) => now - sample.t <= VELOCITY_WINDOW_MS);
  if (recent.length < 2) return 0;
  const first = recent[0];
  const last = recent[recent.length - 1];
  return last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0;
};

// Drag, flick and tap for the mobile bottom sheet.
//
// The finger offset never goes through React: it lives in a ref and is
// written to the rail's --drag-offset once per animation frame, so a drag
// commits nothing until release (it used to re-render the whole app, about
// 80 controls plus the globe, on every move). React only hears about the
// result, through setPanelCollapsed.
//
// Touch: a touch that starts on the grabber strip drags the sheet. So does
// any vertical touch on the peek, and a downward one on the open sheet while
// its list is scrolled to the top. Everything else scrolls the list natively.
// The claim is made on the first touchmove and cancels it, which is the only
// point where iOS still lets a page stop the scroll (and with it the page
// bounce, Chrome's pull to refresh and the address bar collapse).
//
// Mouse and pen: drag the grabber. A click on it toggles, as does a tap,
// Enter or Space, since it is a real button.
export const useSheetDrag = ({ railRef, panelCollapsed, setPanelCollapsed, enabled = true }) => {
  const collapsedRef = useRef(panelCollapsed);
  const gestureRef = useRef(null);
  const offsetRef = useRef(0);
  const frameRef = useRef(0);
  const mousePointerRef = useRef(null);
  const clickBlockedUntilRef = useRef(0);

  useEffect(() => {
    collapsedRef.current = panelCollapsed;
  }, [panelCollapsed]);

  const writeOffset = useCallback(() => {
    frameRef.current = 0;
    railRef.current?.style.setProperty("--drag-offset", `${offsetRef.current}px`);
  }, [railRef]);

  const start = useCallback(
    (y) => {
      const rail = railRef.current;
      if (!rail) return;
      const peek = parseFloat(getComputedStyle(rail).getPropertyValue("--sheet-peek")) || 0;
      gestureRef.current = {
        startY: y,
        wasCollapsed: collapsedRef.current,
        travel: Math.max(0, rail.offsetHeight - peek),
        delta: 0,
        moved: false,
        samples: [{ y, t: performance.now() }],
      };
      rail.classList.add("is-dragging");
    },
    [railRef],
  );

  const track = useCallback(
    (y) => {
      const gesture = gestureRef.current;
      if (!gesture) return;
      const now = performance.now();
      gesture.delta = y - gesture.startY;
      if (Math.abs(gesture.delta) > TAP_SLOP) gesture.moved = true;
      gesture.samples.push({ y, t: now });
      if (gesture.samples.length > 12) gesture.samples.shift();
      offsetRef.current = sheetOffset(gesture);
      if (!frameRef.current) frameRef.current = requestAnimationFrame(writeOffset);
    },
    [writeOffset],
  );

  const finish = useCallback(
    (cancelled) => {
      const gesture = gestureRef.current;
      gestureRef.current = null;
      if (!gesture) return;
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      offsetRef.current = 0;
      const rail = railRef.current;
      if (rail) {
        rail.classList.remove("is-dragging");
        rail.style.setProperty("--drag-offset", "0px");
      }
      if (!gesture.moved) return;
      clickBlockedUntilRef.current = performance.now() + CLICK_AFTER_DRAG_MS;
      if (cancelled) return;
      const velocity = releaseVelocity(gesture.samples, performance.now());
      const next = resolveSheetSnap({ ...gesture, velocity });
      if (next !== gesture.wasCollapsed) setPanelCollapsed(next);
    },
    [railRef, setPanelCollapsed],
  );

  useEffect(() => {
    const rail = railRef.current;
    if (!enabled || !rail) return undefined;
    let pending = null;
    const onTouchStart = (event) => {
      pending = null;
      if (event.touches.length !== 1) {
        finish(true);
        return;
      }
      if (event.target.closest?.(NO_DRAG)) return;
      const touch = event.touches[0];
      pending = {
        x: touch.clientX,
        y: touch.clientY,
        fromGrabber: Boolean(event.target.closest?.(".mobile-drag-handle")),
      };
    };
    const onTouchMove = (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      if (pending) {
        const dx = touch.clientX - pending.x;
        const dy = touch.clientY - pending.y;
        if (dx === 0 && dy === 0) return;
        const vertical = Math.abs(dy) > Math.abs(dx);
        const claim =
          vertical && (pending.fromGrabber || collapsedRef.current || (rail.scrollTop <= 0 && dy > 0));
        const startY = pending.y;
        pending = null;
        if (claim) start(startY);
      }
      if (!gestureRef.current) return;
      if (event.cancelable) event.preventDefault();
      track(touch.clientY);
    };
    const onTouchEnd = (event) => {
      pending = null;
      finish(event.type === "touchcancel");
    };
    rail.addEventListener("touchstart", onTouchStart, { passive: true });
    rail.addEventListener("touchmove", onTouchMove, { passive: false });
    rail.addEventListener("touchend", onTouchEnd);
    rail.addEventListener("touchcancel", onTouchEnd);
    return () => {
      rail.removeEventListener("touchstart", onTouchStart);
      rail.removeEventListener("touchmove", onTouchMove);
      rail.removeEventListener("touchend", onTouchEnd);
      rail.removeEventListener("touchcancel", onTouchEnd);
      finish(true);
    };
  }, [enabled, railRef, start, track, finish]);

  const onPointerDown = useCallback(
    (event) => {
      // Touches arrive through the touch listeners above.
      if (event.pointerType === "touch") return;
      if (event.button !== undefined && event.button !== 0) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      mousePointerRef.current = event.pointerId;
      start(event.clientY);
    },
    [start],
  );

  // Only a pressed pointer drags: hovering the grabber used to move the
  // sheet by the distance from the last press.
  const onPointerMove = useCallback(
    (event) => {
      if (event.pointerId !== mousePointerRef.current) return;
      track(event.clientY);
    },
    [track],
  );

  const onPointerUp = useCallback(
    (event) => {
      if (event.pointerId !== mousePointerRef.current) return;
      mousePointerRef.current = null;
      finish(event.type === "pointercancel");
    },
    [finish],
  );

  const onClick = useCallback(() => {
    if (performance.now() < clickBlockedUntilRef.current) return;
    setPanelCollapsed((value) => !value);
  }, [setPanelCollapsed]);

  return {
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onClick,
    },
  };
};
