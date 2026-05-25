import { useState } from "react";
import { ChevronDown, Eye, EyeOff } from "../icons.jsx";

export const PanelSection = ({
  title,
  children,
  icon,
  defaultOpen = false,
  // Optional layer-visibility eye button in the summary. When provided
  // an Eye / EyeClosed icon button renders next to the chevron — click
  // it to hide/show the layer without expanding the section. Clicks
  // stop propagation so they don't also fire the summary's open/close.
  enabled,
  onEnabledChange,
  enabledLabel,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasEnableToggle = typeof onEnabledChange === "function";
  const EyeIcon = enabled ? Eye : EyeOff;

  return (
    <details
      className={`option-block ${hasEnableToggle && !enabled ? "is-layer-disabled" : ""}`}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>
        {icon}
        <span>{title}</span>
        {hasEnableToggle && (
          <button
            type="button"
            className="option-block-eye"
            aria-pressed={!!enabled}
            aria-label={enabledLabel ?? `Toggle ${title}`}
            title={enabled ? "Hide layer" : "Show layer"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onEnabledChange(!enabled);
            }}
          >
            <EyeIcon size={16} />
          </button>
        )}
        <ChevronDown size={17} />
      </summary>
      <div className="option-content">{children}</div>
    </details>
  );
};
