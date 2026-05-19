import { useState } from "react";
import { ChevronDown } from "../icons.jsx";
import { ToggleControl } from "./toggle-control.jsx";

// Named layer with a header row carrying both a toggle (turn the layer
// on/off) and a chevron (expand/collapse the layer's parameters). The two
// controls live in the same row but stay independent — clicking the
// chevron region opens the accordion, clicking the toggle flips the
// layer's state without disturbing the open/closed view. Mirrors the
// pattern users know from Photoshop layer panels and Figma properties.
export const LayerAccordion = ({
  title,
  enabled,
  onEnabledChange,
  toggleLabel,
  defaultOpen = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`layer-accordion ${isOpen ? "is-open" : ""} ${enabled ? "is-enabled" : "is-disabled"}`}
    >
      <div className="layer-accordion-header">
        <button
          type="button"
          className="layer-accordion-trigger"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${title}`}
        >
          <span className="layer-accordion-title">{title}</span>
          <ChevronDown size={14} className="layer-accordion-chevron" />
        </button>
        <ToggleControl
          checked={enabled}
          onChange={onEnabledChange}
          label={toggleLabel || `Toggle ${title}`}
        />
      </div>
      {isOpen && (
        <div className="layer-accordion-content">{children}</div>
      )}
    </div>
  );
};
