import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RangeControl } from "./range-control.jsx";

describe("RangeControl", () => {
  it("renders a slider reflecting the controlled value", () => {
    render(<RangeControl label="Density" min={0} max={100} value={42} onChange={() => {}} />);
    expect(screen.getByLabelText("Density").value).toBe("42");
  });

  it("sets the --fill CSS variable to the value's percentage of the range", () => {
    render(<RangeControl label="Density" min={0} max={100} value={42} onChange={() => {}} />);
    expect(screen.getByLabelText("Density").style.getPropertyValue("--fill")).toBe("42%");
  });

  it("clamps values above max on change", () => {
    const onChange = vi.fn();
    render(<RangeControl label="Density" min={0} max={50} value={10} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Density"), { target: { value: "999" } });
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it("clamps values below min on change", () => {
    const onChange = vi.fn();
    render(<RangeControl label="Density" min={10} max={100} value={50} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Density"), { target: { value: "-50" } });
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("passes through valid integer values unchanged", () => {
    const onChange = vi.fn();
    render(<RangeControl label="Density" min={0} max={100} value={50} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Density"), { target: { value: "42" } });
    expect(onChange).toHaveBeenCalledWith(42);
  });
});
