import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OptionRow } from "./option-row.jsx";

describe("OptionRow", () => {
  it("renders the label", () => {
    render(
      <OptionRow label="Density">
        <input aria-label="control" />
      </OptionRow>,
    );
    expect(screen.getByText("Density")).toBeTruthy();
  });

  it("renders the value when provided", () => {
    render(
      <OptionRow label="Density" value={42}>
        <input aria-label="control" />
      </OptionRow>,
    );
    expect(screen.getByText("42")).toBeTruthy();
  });

  it("omits the value display when undefined", () => {
    const { container } = render(
      <OptionRow label="Density">
        <input aria-label="control" />
      </OptionRow>,
    );
    expect(container.querySelector("output")).toBeNull();
  });

  it("renders children in the control slot", () => {
    render(
      <OptionRow label="Shape">
        <input aria-label="custom-control" />
      </OptionRow>,
    );
    expect(screen.getByLabelText("custom-control")).toBeTruthy();
  });
});
