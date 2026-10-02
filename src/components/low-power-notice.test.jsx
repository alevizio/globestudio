import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { LowPowerNotice } from "./low-power-notice.jsx";

describe("LowPowerNotice", () => {
  it("says why the effects are off, as a status message", () => {
    render(<LowPowerNotice onRestore={() => {}} onDismiss={() => {}} />);
    expect(screen.getByRole("status").textContent).toContain(
      "Effects reduced so the globe runs faster on this device.",
    );
  });

  it("turns the effects back on and dismisses from the keyboard", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    const onDismiss = vi.fn();
    render(<LowPowerNotice onRestore={onRestore} onDismiss={onDismiss} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Turn effects back on" }));
    await user.keyboard("{Enter}");
    expect(onRestore).toHaveBeenCalledTimes(1);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Dismiss" }));
    await user.keyboard(" ");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("uses no dashes in its copy", () => {
    const { container } = render(<LowPowerNotice onRestore={() => {}} onDismiss={() => {}} />);
    expect(container.textContent).not.toMatch(/[-–—]/);
  });

  it("has no axe violations", async () => {
    const { container } = render(<LowPowerNotice onRestore={() => {}} onDismiss={() => {}} />);
    const results = await axe.run(container, { rules: { region: { enabled: false } } });
    expect(results.violations).toHaveLength(0);
  });
});
