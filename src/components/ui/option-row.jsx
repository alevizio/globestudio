export const OptionRow = ({ label, value, children, stacked: stackedProp }) => {
  // Auto-stack when there's an output value (range controls etc.); allow an
  // explicit `stacked` prop for cases like long-label dropdowns where we want
  // the control to span the row even without a value readout.
  const stacked = stackedProp ?? value !== undefined;

  return (
    <div className={`option-row ${stacked ? "option-row-stacked" : "option-row-inline"}`}>
      <label>
        <span>{label}</span>
        {value !== undefined && <output>{value}</output>}
      </label>
      <div className="option-control">{children}</div>
    </div>
  );
};
