import { clampNumber } from "../../utils/math.js";

export const TiltControl = ({ value, onChange, label }) => {
  const updateTilt = (nextValue) => {
    if (!Number.isFinite(Number(nextValue))) return;
    onChange(clampNumber(nextValue, -45, 45));
  };

  return (
    <input
      aria-label={label}
      className="slider"
      type="range"
      min={-45}
      max={45}
      step={1}
      value={value}
      style={{ "--fill": `${((clampNumber(value, -45, 45) + 45) / 90) * 100}%` }}
      onChange={(event) => updateTilt(event.target.value)}
    />
  );
};
