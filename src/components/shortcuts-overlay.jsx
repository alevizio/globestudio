import { useRef } from "react";
import { useModalA11y } from "../hooks/use-modal-a11y.js";
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
  { key: "⌘K", label: "Open the command palette" },
  { key: "?", label: "Show this help" },
  { key: "Esc", label: "Close popovers and dialogs" },
];

export const ShortcutsOverlay = ({ open, onClose }) => {
  const dialogRef = useRef(null);
  // Shared modal a11y plumbing — Escape + inert siblings + focus management.
  // Replaces the prior bespoke useEffect blocks.
  useModalA11y({
    open,
    onClose,
    containerRef: dialogRef,
    backdropSelector: ".shortcuts-overlay-backdrop",
  });

  if (!open) return null;

  return (
    <div className="shortcuts-overlay-backdrop" role="presentation" onClick={onClose}>
      <div
        className="shortcuts-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        tabIndex={-1}
        ref={dialogRef}
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
            <X size={16} />
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
