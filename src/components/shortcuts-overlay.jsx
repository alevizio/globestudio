import { useEffect } from "react";
import { X } from "./icons.jsx";

const shortcuts = [
  { key: "S", label: "Shuffle to a random look" },
  { key: "[", label: "Previous look preset" },
  { key: "]", label: "Next look preset" },
  { key: "+", label: "Zoom in" },
  { key: "−", label: "Zoom out" },
  { key: "0", label: "Reset zoom" },
  { key: "D", label: "Open the export dialog" },
  { key: "R", label: "Reset to defaults" },
  { key: "G", label: "Toggle globe and flat view" },
  { key: "H", label: "Hide or show the control panel" },
  { key: "?", label: "Show this help" },
  { key: "Esc", label: "Close popovers and dialogs" },
];

export const ShortcutsOverlay = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Restore focus to the element that opened this overlay (e.g. the help
  // button) when it closes. Keyboard users navigating with Tab/Esc should
  // never end up stranded on the document body.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    return () => {
      if (previous instanceof HTMLElement && document.body.contains(previous)) {
        previous.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="shortcuts-overlay-backdrop" role="presentation" onClick={onClose}>
      <div
        className="shortcuts-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shortcuts-overlay-header">
          <h2 id="shortcuts-title" className="shortcuts-overlay-title">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            className="shortcuts-overlay-close"
            onClick={onClose}
            aria-label="Close shortcuts"
          >
            <X size={14} />
          </button>
        </div>
        <ul className="shortcuts-overlay-list">
          {shortcuts.map((row) => (
            <li key={row.key} className="shortcuts-overlay-row">
              <kbd className="shortcuts-overlay-key">{row.key}</kbd>
              <span className="shortcuts-overlay-label">{row.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
