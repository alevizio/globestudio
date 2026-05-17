import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleControl } from "./toggle-control.jsx";

describe("ToggleControl", () => {
  it("reflects checked state via aria-checked='true'", () => {
    render(<ToggleControl checked onChange={() => {}} label="Test toggle" />);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch").classList.contains("is-active")).toBe(true);
  });

  it("reflects unchecked state via aria-checked='false'", () => {
    render(<ToggleControl checked={false} onChange={() => {}} label="Test toggle" />);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("switch").classList.contains("is-active")).toBe(false);
  });

  it("flips the value on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ToggleControl checked={false} onChange={onChange} label="Test toggle" />);

    await user.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("uses the label as accessible name", () => {
    render(<ToggleControl checked={false} onChange={() => {}} label="Dark mode" />);
    expect(screen.getByRole("switch", { name: "Dark mode" })).toBeTruthy();
  });
});
