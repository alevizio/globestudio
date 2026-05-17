import { Globe2, MapIcon } from "../icons.jsx";

const modes = [
  { value: "flat", label: "Flat", icon: MapIcon },
  { value: "globe", label: "Globe", icon: Globe2 },
];

export const ViewModeSwitch = ({ viewMode, setViewMode }) => (
  <div className="view-mode-switch" aria-label="View mode">
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
        >
          <Icon size={15} />
          {mode.label}
        </button>
      );
    })}
  </div>
);
