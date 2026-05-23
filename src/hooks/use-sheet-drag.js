import { useCallback, useRef, useState } from "react";

// Pointer-driven drag-to-collapse behavior for the mobile bottom sheet.
// Tracks a transient drag offset (for inline transform) and an isDragging
// flag (for cursor + CSS state). On release, snaps the panel open/closed
// based on a 60px threshold and the direction relative to where the
// gesture started. A separate click handler toggles collapse when the
// gesture didn't actually move (so taps on the sheet's drag handle still
// behave like a button).
//
// Why refs alongside state: the snap-on-release check needs the *latest*
// drag delta and the start state at pointerup time. Reading from state
// directly would race the next React commit, so we keep mirrors in refs.
export const useSheetDrag = (panelCollapsed, setPanelCollapsed) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ y: 0, wasCollapsed: false });
  const dragOffsetRef = useRef(0);
  const draggedRef = useRef(false);

  const onPointerDown = useCallback(
    (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragStartRef.current = { y: event.clientY, wasCollapsed: panelCollapsed };
      dragOffsetRef.current = 0;
      draggedRef.current = false;
      setIsDragging(true);
      setDragOffset(0);
    },
    [panelCollapsed],
  );

  const onPointerMove = useCallback((event) => {
    const delta = event.clientY - dragStartRef.current.y;
    if (Math.abs(delta) > 6) draggedRef.current = true;
    dragOffsetRef.current = delta;
    setDragOffset(delta);
  }, []);

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
    if (draggedRef.current) {
      const snapThreshold = 60;
      const finalDelta = dragOffsetRef.current;
      if (dragStartRef.current.wasCollapsed) {
        if (finalDelta < -snapThreshold) setPanelCollapsed(false);
      } else if (finalDelta > snapThreshold) {
        setPanelCollapsed(true);
      }
    }
    dragOffsetRef.current = 0;
    setDragOffset(0);
  }, [setPanelCollapsed]);

  const onClick = useCallback(() => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    setPanelCollapsed((value) => !value);
  }, [setPanelCollapsed]);

  return {
    dragOffset,
    isDragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onClick,
    },
  };
};
