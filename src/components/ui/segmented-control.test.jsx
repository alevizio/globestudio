import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedControl } from "./segmented-control.jsx";

const options = [
  { value: "dots", label: "Shape" },
  { value: "solid", label: "Solid" },
];

describe("SegmentedControl", () => {
  it("renders every option as a radio", () => {
    render(<SegmentedControl label="Style" value="dots" onChange={() => {}} options={options} />);
    options.forEach((opt) => {
      expect(screen.getByRole("radio", { name: opt.label })).toBeTruthy();
    });
  });

  it("marks the controlled value as active", () => {
    render(<SegmentedControl label="Style" value="solid" onChange={() => {}} options={options} />);
    expect(screen.getByRole("radio", { name: "Solid" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Shape" }).getAttribute("aria-checked")).toBe("false");
  });

  it("fires onChange with the clicked value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SegmentedControl label="Style" value="dots" onChange={onChange} options={options} />);

    await user.click(screen.getByRole("radio", { name: "Solid" }));
    expect(onChange).toHaveBeenCalledWith("solid");
  });
});
