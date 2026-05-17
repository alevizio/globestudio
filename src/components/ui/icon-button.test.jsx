import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "./icon-button.jsx";

describe("IconButton", () => {
  it("renders children and title", () => {
    render(
      <IconButton title="Refresh" onClick={() => {}}>
        <span>icon</span>
      </IconButton>,
    );
    expect(screen.getByTitle("Refresh")).toBeTruthy();
    expect(screen.getByText("icon")).toBeTruthy();
  });

  it("calls onClick when activated", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton title="Run" onClick={onClick}>
        Run
      </IconButton>,
    );

    await user.click(screen.getByRole("button", { name: "Run" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies the active class when active", () => {
    render(
      <IconButton title="On" onClick={() => {}} active>
        On
      </IconButton>,
    );
    expect(screen.getByRole("button").className).toContain("button-active");
  });

  it("merges custom className", () => {
    render(
      <IconButton title="Custom" onClick={() => {}} className="extra-class">
        Custom
      </IconButton>,
    );
    expect(screen.getByRole("button").className).toContain("extra-class");
  });
});
