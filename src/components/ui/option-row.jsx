export const OptionRow = ({ label, value, children }) => {
  const stacked = value !== undefined;

  return (
    <div className={`option-row ${stacked ? "option-row-stacked" : "option-row-inline"}`}>
      <label>
        <span>{label}</span>
        {stacked && <output>{value}</output>}
      </label>
      <div className="option-control">{children}</div>
    </div>
  );
};
