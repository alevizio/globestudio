import { lookPresets } from "../data/look-presets.js";
import { areaOptions } from "../data/geography.js";
import { OptionRow } from "./ui/option-row.jsx";
import { RangeControl } from "./ui/range-control.jsx";
import { SearchableSelect } from "./ui/searchable-select.jsx";
import { SelectControl } from "./ui/select-control.jsx";

const LOOK_OPTIONS = lookPresets.map((preset) => ({ value: preset.id, label: preset.name }));

// Look, region and density pickers for the Figma plugin shell
// (/embed?plugin=figma). Each one stands in for the embed's own look /
// selection / density query param, so the panel renders what
// /embed?look=…&selection=…&density=… renders, and Insert sends those
// settings (embed-view.jsx notes when the plugin inserts a flat SVG).
// embed-view.jsx lazy-loads this file: that takes about 0.6 kB gzip off the
// initial payload, counting the icons.jsx chunk Rolldown then splits out
// (both budgeted in scripts/check-bundle-size.js).
export const FigmaPluginPickers = ({ look, selection, density, onChange }) => (
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
  </div>
);
