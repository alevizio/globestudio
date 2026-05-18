import { clampNumber } from "../../utils/math.js";
import { ZoomIn, ZoomOut } from "../icons.jsx";

export const MapZoomControls = ({ value, onChange }) => {
  const updateZoom = (nextValue) => {
    if (!Number.isFinite(Number(nextValue))) return;
    onChange(Number(clampNumber(nextValue, 0.5, 3).toFixed(2)));
  };

  return (
    <div className="map-zoom-controls" aria-label="Map zoom controls">
      <button
        type="button"
        className="map-zoom-button"
        onClick={() => updateZoom(Number((value - 0.1).toFixed(2)))}
        aria-label="Zoom out"
        title="Zoom out (−)"
      >
        <ZoomOut size={14} />
      </button>
      <output
        className="map-zoom-display"
        aria-label="Map zoom value"
        title="Press 0 to reset"
        onClick={() => updateZoom(1)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            updateZoom(1);
          }
        }}
      >
        {Math.round(value * 100)}%
      </output>
      <button
        type="button"
        className="map-zoom-button"
        onClick={() => updateZoom(Number((value + 0.1).toFixed(2)))}
        aria-label="Zoom in"
        title="Zoom in (+)"
      >
        <ZoomIn size={14} />
      </button>
    </div>
  );
};
