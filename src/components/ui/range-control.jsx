import { clampNumber } from "../../utils/math.js";

export const RangeControl = ({ value, min, max, step = 1, onChange, label }) => {
  const updateValue = (nextValue) => {
    if (!Number.isFinite(Number(nextValue))) return;
    onChange(clampNumber(nextValue, min, max));
  };
  const fillPercent = max === min ? 0 : ((clampNumber(value, min, max) - min) / (max - min)) * 100;

  return (
    <input
      aria-label={label}
      className="slider"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      style={{ "--fill": `${fillPercent}%` }}
      onChange={(event) => updateValue(event.target.value)}
    />
  );
};
