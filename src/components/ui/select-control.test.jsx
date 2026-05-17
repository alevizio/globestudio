import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectControl } from "./select-control.jsx";

const options = [
  { value: "circle", label: "Circle" },
  { value: "square", label: "Square" },
  { value: "triangle", label: "Triangle" },
];

describe("SelectControl", () => {
  it("renders all options", () => {
    render(<SelectControl label="Shape" value="circle" onChange={() => {}} options={options} />);
    options.forEach((opt) => {
      expect(screen.getByRole("option", { name: opt.label })).toBeTruthy();
    });
  });

  it("reflects the controlled value", () => {
    render(<SelectControl label="Shape" value="square" onChange={() => {}} options={options} />);
    expect(screen.getByLabelText("Shape").value).toBe("square");
  });

  it("fires onChange with the selected value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SelectControl label="Shape" value="circle" onChange={onChange} options={options} />);

    await user.selectOptions(screen.getByLabelText("Shape"), "triangle");
    expect(onChange).toHaveBeenCalledWith("triangle");
  });
});
