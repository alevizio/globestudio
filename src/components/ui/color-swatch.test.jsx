import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ColorSwatch } from "./color-swatch.jsx";

describe("ColorSwatch", () => {
  it("renders the swatch and color input", () => {
    render(<ColorSwatch value="#ff0000" onChange={() => {}} label="Pick color" />);
    expect(screen.getAllByLabelText("Pick color")).toHaveLength(2);
  });

  it("emits the new value on change", () => {
    const onChange = vi.fn();
    render(<ColorSwatch value="#000000" onChange={onChange} label="Pick color" />);

    const colorInput = screen.getAllByLabelText("Pick color").find((el) => el.tagName === "INPUT");
    fireEvent.change(colorInput, { target: { value: "#abcdef" } });
    expect(onChange).toHaveBeenCalledWith("#abcdef");
  });

  it("renders transparent overlay when value is 'transparent'", () => {
    const { container } = render(
      <ColorSwatch value="transparent" onChange={() => {}} label="Pick color" />,
    );
    expect(container.querySelector(".transparent-grid")).toBeTruthy();
  });
});
