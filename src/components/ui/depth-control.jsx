import { clampNumber } from "../../utils/math.js";

export const DepthControl = ({ value, onChange }) => {
  const updateDepth = (nextValue) => {
    if (!Number.isFinite(Number(nextValue))) return;
    onChange(clampNumber(nextValue, 0, 100));
  };

  return (
    <input
      aria-label="Depth"
      className="slider"
      type="range"
      min={0}
      max={100}
      step={1}
      value={value}
      style={{ "--fill": `${clampNumber(value, 0, 100)}%` }}
      onChange={(event) => updateDepth(event.target.value)}
    />
  );
};
