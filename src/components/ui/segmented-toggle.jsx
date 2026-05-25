// Compact two-option segmented control for use inside the panel. Same
// visual language as the canvas-level ViewModeSwitch (sliding pill
// indicator behind two pressable buttons) but sized to sit at the top
// of a PanelSection rather than as a fixed-position toolbar.

export const SegmentedToggle = ({ value, onChange, options, ariaLabel }) => (
  <div
    className="segmented-toggle"
    data-active={value}
    role="group"
    aria-label={ariaLabel}
  >
    <span className="segmented-toggle-indicator" aria-hidden="true" />
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          className={`segmented-toggle-button ${active ? "is-active" : ""}`}
          onClick={() => onChange(opt.value)}
          aria-pressed={active}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);
