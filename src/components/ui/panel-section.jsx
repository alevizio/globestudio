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
  const contentId = `panel-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const EyeIcon = enabled ? Eye : EyeOff;
  const defaultTooltip = enabledDisabled
    ? `${title} has nothing to toggle yet`
    : enabled
      ? `Hide ${title.toLowerCase()}`
      : `Show ${title.toLowerCase()}`;
  const eyeTooltip = enabledTooltip ?? defaultTooltip;

  return (
    <section
      className={`option-block ${hasEnableToggle && !enabled ? "is-layer-disabled" : ""}`}
      data-open={isOpen ? "true" : "false"}
    >
      <div
        className="option-block-header"
        onClick={(event) => {
          // Whole-row click toggles the section. Matches the native
          // <details>/<summary> behavior we used to rely on, so clicks
          // on the chevron, the empty space between the title and the
          // eye, or the right-end gutter all still expand/collapse.
          // Nested button clicks (disclosure, eye) call stopPropagation
          // so this row-level handler doesn't fire twice for them.
          if (event.defaultPrevented) return;
          setIsOpen((value) => !value);
        }}
      >
        <button
          type="button"
          className="option-block-disclosure"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={(event) => {
            event.stopPropagation();
            setIsOpen((value) => !value);
          }}
        >
          {icon}
          <span>{title}</span>
        </button>
        {hasEnableToggle && (
          <button
            type="button"
            className={`option-block-eye ${enabledDisabled ? "is-disabled" : ""}`}
            aria-pressed={!!enabled}
            aria-disabled={enabledDisabled || undefined}
            aria-label={enabledLabel ?? `Toggle ${title}`}
            title={eyeTooltip}
            onClick={(event) => {
              event.stopPropagation();
              if (enabledDisabled) return;
              onEnabledChange(!enabled);
            }}
          >
            <EyeIcon size={16} />
          </button>
        )}
        <ChevronDown className="option-block-chevron" size={17} aria-hidden="true" />
      </div>
      <div id={contentId} className="option-content" hidden={!isOpen}>
        {children}
      </div>
    </section>
  );
};
