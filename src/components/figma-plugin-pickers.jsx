import { lookPresets } from "../data/look-presets.js";
import { areaOptions } from "../data/geography.js";
import { OptionRow } from "./ui/option-row.jsx";
import { RangeControl } from "./ui/range-control.jsx";
import { SearchableSelect } from "./ui/searchable-select.jsx";
import { SegmentedToggle } from "./ui/segmented-toggle.jsx";
import { SelectControl } from "./ui/select-control.jsx";

const LOOK_OPTIONS = lookPresets.map((preset) => ({ value: preset.id, label: preset.name }));
const VIEW_OPTIONS = [
  { value: "globe", label: "Globe" },
  { value: "flat", label: "Flat" },
];

// figma-plugin/code.js turns the Flat SVG into editable vectors only up to
// this many dots and inserts the PNG above it. Keep the two in step.
const VECTOR_DOT_LIMIT = 2500;

// What Insert will put on the Figma canvas, so the choice is never a
// surprise. The text changes only when the outcome does, not on every
// density step, so the status region stays quiet while sliding. Each line
// fits one row of the 380px panel, even in the monospace fallback font, so
// crossing the dot limit never grows the bar under a dragged slider.
const insertNote = (view, dots) => {
  if (view !== "flat") return "Inserts a PNG of the globe.";
  if (dots <= VECTOR_DOT_LIMIT) return "Inserts the flat map as editable vectors.";
  return "Inserts a PNG. Lower the density for vectors.";
};

// Look, region, density and view pickers for the Figma plugin shell
// (/embed?plugin=figma). Each one stands in for the embed's own look /
// selection / density / view query param, so the panel renders what
// /embed?look=…&selection=…&density=…&view=… renders, and Insert sends
// those settings (embed-view.jsx sends the SVG in the Flat view only).
// embed-view.jsx lazy-loads this file: that takes about 0.6 kB gzip off the
// initial payload, counting the icons.jsx chunk Rolldown then splits out
// (both budgeted in scripts/check-bundle-size.js).
export const FigmaPluginPickers = ({ look, selection, density, view, dots, onChange }) => {
  // The embed treats any view other than "flat" as the globe.
  const currentView = view === "flat" ? "flat" : "globe";
  return (
    <div className="embed-plugin-pickers" role="group" aria-label="Globe settings">
      <OptionRow label="Look" stacked>
        <SelectControl
          label="Look"
          value={look}
          options={LOOK_OPTIONS}
          onChange={(value) => onChange({ look: value })}
        />
      </OptionRow>
      <OptionRow label="Country or region" stacked>
        <SearchableSelect
          label="Country or region"
          value={selection}
          options={areaOptions}
          placeholder="Search countries…"
          onChange={(value) => onChange({ selection: value })}
        />
      </OptionRow>
      <OptionRow label="Density" value={density}>
        {/* Same 1 to 90 range as the studio slider and the ?density= clamp. */}
        <RangeControl
          label="Density"
          min={1}
          max={90}
          value={density}
          onChange={(value) => onChange({ density: value })}
        />
      </OptionRow>
      {/* SegmentedToggle already ships with the studio panel, so this
          adds no code to the initial payload (SegmentedControl would). */}
      <OptionRow label="View" stacked>
        <SegmentedToggle
          ariaLabel="View"
          value={currentView}
          options={VIEW_OPTIONS}
          onChange={(value) => onChange({ view: value })}
        />
      </OptionRow>
      {/* In the grid, under Density and View, so it adds no gap of its own. */}
      <p className="embed-plugin-note" role="status">
        {insertNote(currentView, dots)}
      </p>
    </div>
  );
};
