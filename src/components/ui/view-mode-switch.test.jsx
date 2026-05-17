import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewModeSwitch } from "./view-mode-switch.jsx";

describe("ViewModeSwitch", () => {
  it("renders both Flat and Globe modes", () => {
    render(<ViewModeSwitch viewMode="globe" setViewMode={() => {}} />);
    expect(screen.getByRole("button", { name: /flat/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /globe/i })).toBeTruthy();
  });

  it("marks the active mode with aria-pressed", () => {
    render(<ViewModeSwitch viewMode="globe" setViewMode={() => {}} />);
    expect(screen.getByRole("button", { name: /globe/i }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /flat/i }).getAttribute("aria-pressed")).toBe("false");
  });

  it("calls setViewMode with the clicked mode", async () => {
    const user = userEvent.setup();
    const setViewMode = vi.fn();
    render(<ViewModeSwitch viewMode="globe" setViewMode={setViewMode} />);

    await user.click(screen.getByRole("button", { name: /flat/i }));
    expect(setViewMode).toHaveBeenCalledWith("flat");
  });
});
