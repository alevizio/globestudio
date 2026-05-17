import { lookPresets } from "../data/look-presets.js";
import { LookPreview } from "./look-preview.jsx";

export const LooksBar = ({ onPick, appliedId = null }) => (
  <div className="looks-bar" role="list" aria-label="Looks">
    {lookPresets.map((preset) => (
      <button
        key={preset.id}
        type="button"
        role="listitem"
        className={`looks-chip ${appliedId === preset.id ? "is-applied" : ""}`}
        title={preset.blurb}
        onClick={() => onPick(preset)}
      >
        <LookPreview preset={preset} />
        <span>{preset.name}</span>
      </button>
    ))}
  </div>
);
