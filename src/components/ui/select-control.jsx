export const SelectControl = ({ value, onChange, options, label }) => (
  <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);
