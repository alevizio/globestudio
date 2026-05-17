export const ToggleControl = ({ checked, onChange, label }) => (
  <button
    type="button"
    className={`toggle-control ${checked ? "is-active" : ""}`}
    role="switch"
    aria-label={label}
    aria-checked={checked}
    onClick={() => onChange(!checked)}
  >
    <span className="toggle-track" aria-hidden="true">
      <span className="toggle-knob" />
    </span>
  </button>
);
