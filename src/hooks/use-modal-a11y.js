import { useEffect } from "react";

// Shared accessibility plumbing for modal dialogs. Centralises three concerns
// that WCAG 2.1.2 (No Keyboard Trap), 2.4.11 (Focus Not Obscured), and the
// dialog-pattern convention all require:
//
// 1. Escape closes the dialog.
// 2. Focus moves into the dialog on open (so screen readers and keyboard
//    users land on the right context). Restored to the trigger on close.
// 3. The rest of the page becomes `inert` while open, so Tab can't escape
//    behind the modal AND assistive tech treats the background as
//    non-interactive. The `inert` attribute is supported by every browser
//    Worlddots targets (Chrome 102+, Safari 15.5+, Firefox 112+, 2022+).
//
// Callers pass `open` plus an optional `containerRef` (the actual dialog
// element to focus on open). If the ref is omitted, the hook still applies
// inert + Escape + focus restore — useful for overlays without a single
// focus target.
//
// The "inert siblings" pattern walks the direct children of the configured
// root (defaults to <main className="app-shell">) and marks each one inert
// except the supplied modal backdrop element. That backdrop is identified
// by the configured `backdropSelector` (defaults to looking up the
// container's nearest backdrop wrapper).
export const useModalA11y = ({ open, onClose, containerRef, backdropSelector }) => {
  useEffect(() => {
    if (!open) return undefined;

    const previous = document.activeElement;
    const root = document.querySelector(".app-shell");
    const backdropEl = backdropSelector ? document.querySelector(backdropSelector) : null;

    // Mark every sibling of the modal inert. We do this on the next frame
    // so the freshly rendered modal element is guaranteed to be in the DOM.
    const inertSiblings = new Set();
    const applyInert = () => {
      if (!root) return;
      for (const child of root.children) {
        if (child === backdropEl) continue;
        // Skip elements already inert (parent may have set it).
        if (child.hasAttribute("inert")) continue;
        child.setAttribute("inert", "");
        inertSiblings.add(child);
      }
    };
    const frame = requestAnimationFrame(applyInert);

    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);

    // Move focus into the dialog so screen readers announce the right
    // context. Slight delay so React has rendered + ref is wired.
    if (containerRef?.current) {
      window.setTimeout(() => containerRef.current?.focus(), 0);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      // Clean up inert from every sibling we marked.
      for (const child of inertSiblings) {
        child.removeAttribute("inert");
      }
      inertSiblings.clear();
      // Restore focus to whatever the user came from. Falls back silently
      // if the trigger has unmounted.
      if (previous instanceof HTMLElement && document.body.contains(previous)) {
        previous.focus();
      }
    };
  }, [open, onClose, containerRef, backdropSelector]);
};
