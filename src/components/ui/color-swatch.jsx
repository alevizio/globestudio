export const ColorSwatch = ({ value, onChange, label }) => (
  <div className="color-control">
    <button
      type="button"
      className="color-swatch"
      style={{ backgroundColor: value === "transparent" ? "#18171a" : value }}
      aria-label={label}
      title={label}
    >
      {value === "transparent" && <span className="transparent-grid" />}
    </button>
    <input
      type="color"
      value={value === "transparent" ? "#18171a" : value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
    />
  </div>
);
