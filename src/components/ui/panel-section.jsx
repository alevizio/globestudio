import { useState } from "react";
import { ChevronDown, Eye, EyeOff } from "../icons.jsx";

export const PanelSection = ({
  title,
  children,
  icon,
  defaultOpen = false,
  // Optional layer-visibility eye button in the summary. When provided
  // an Eye / EyeOff icon button renders next to the chevron — click
  // it to hide/show the layer without expanding the section. Clicks
  // stop propagation so they don't also fire the summary's open/close.
  // `enabledDisabled` keeps the eye visible but makes it non-clickable
  // — useful when there's nothing to toggle yet (e.g. the Shaders
  // section when no effect is picked).
  // `enabledTooltip` overrides the default hover tooltip.
  enabled,
  onEnabledChange,
  enabledLabel,
  enabledDisabled = false,
  enabledTooltip,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasEnableToggle = typeof onEnabledChange === "function";
  const EyeIcon = enabled ? Eye : EyeOff;
  const defaultTooltip = enabledDisabled
    ? `${title} has nothing to toggle yet`
    : enabled
      ? `Hide ${title.toLowerCase()}`
      : `Show ${title.toLowerCase()}`;
  const eyeTooltip = enabledTooltip ?? defaultTooltip;

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
            className={`option-block-eye ${enabledDisabled ? "is-disabled" : ""}`}
            aria-pressed={!!enabled}
            aria-disabled={enabledDisabled || undefined}
            aria-label={enabledLabel ?? `Toggle ${title}`}
            title={eyeTooltip}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (enabledDisabled) return;
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
