// Inline segmented control with a sliding indicator pill. Use this in place
// of <SelectControl> when there are only two or three options — a toggle
// surfaces both choices at once and reads faster than expanding a dropdown
// to discover the same handful of values. Mirrors the design language of
// the top-of-screen ViewModeSwitch so the two read as one family.
export const SegmentedControl = ({ value, onChange, options, label }) => {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      className="segmented-control"
      style={{
        // Drive the indicator geometry from CSS variables so the same
        // component works for 2- and 3-option toggles without reshuffling
        // the stylesheet.
        "--segment-count": options.length,
        "--active-index": activeIndex,
      }}
      role="radiogroup"
      aria-label={label}
    >
      <span className="segmented-control-indicator" aria-hidden="true" />
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`segmented-control-button ${active ? "is-active" : ""}`}
            onClick={() => onChange(option.value)}
            role="radio"
            aria-checked={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
