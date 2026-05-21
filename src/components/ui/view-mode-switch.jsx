import { Globe, MapIcon } from "../icons.jsx";

const modes = [
  { value: "flat", label: "Flat", icon: MapIcon },
  { value: "globe", label: "Globe", icon: Globe },
];

export const ViewModeSwitch = ({ viewMode, setViewMode }) => (
  <div
    className="view-mode-switch"
    data-active={viewMode}
    aria-label="View mode"
  >
    <span className="view-mode-indicator" aria-hidden="true" />
    {modes.map((mode) => {
      const Icon = mode.icon;
      const active = viewMode === mode.value;
      return (
        <button
          key={mode.value}
          type="button"
          className={`view-mode-button ${active ? "is-active" : ""}`}
          onClick={() => setViewMode(mode.value)}
          aria-pressed={active}
          title={`${mode.label} view (G)`}
        >
          <Icon size={17} />
          {mode.label}
        </button>
      );
    })}
  </div>
);
