import { Globe, MapIcon } from "./icons.jsx";

// The Globe and Map switch an embed shows when its config asks for one
// ("viewSwitch": true): two icon buttons in a corner that turn the globe into
// the flat map and back, in the studio's order (Flat, then Globe). `theme` is
// the embed's palette, so the switch reads on light pages too.
const VIEWS = [
  { value: "flat", label: "Map view", Icon: MapIcon },
  { value: "globe", label: "Globe view", Icon: Globe },
];

export const EmbedViewSwitch = ({ view, onChange, theme }) => (
  <div
    className="embed-view-switch"
    role="group"
    aria-label="View"
    data-theme={theme === "light" ? "light" : undefined}
  >
    {VIEWS.map(({ value, label, Icon }) => (
      <button
        key={value}
        type="button"
        className="embed-view-switch-button"
        aria-pressed={view === value}
        aria-label={label}
        title={label}
        onClick={() => onChange(value)}
      >
        <Icon size={16} />
      </button>
    ))}
  </div>
);
