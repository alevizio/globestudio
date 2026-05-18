import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShortcutsOverlay } from "./shortcuts-overlay.jsx";

describe("ShortcutsOverlay", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<ShortcutsOverlay open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the shortcut list when open", () => {
    render(<ShortcutsOverlay open={true} onClose={() => {}} />);
    expect(screen.getByText("Keyboard shortcuts")).toBeTruthy();
    expect(screen.getByText("Shuffle to a random look")).toBeTruthy();
    expect(screen.getByText("Open the export dialog")).toBeTruthy();
    expect(screen.getByText("Reset to defaults")).toBeTruthy();
    expect(screen.getByText("Toggle globe and flat view")).toBeTruthy();
    expect(screen.getByText("Previous look preset")).toBeTruthy();
    expect(screen.getByText("Next look preset")).toBeTruthy();
    expect(screen.getByText("Zoom in")).toBeTruthy();
    expect(screen.getByText("Zoom out")).toBeTruthy();
    expect(screen.getByText("Reset zoom")).toBeTruthy();
  });

  it("closes when the close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ShortcutsOverlay open={true} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Close shortcuts" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<ShortcutsOverlay open={true} onClose={onClose} />);

    const backdrop = container.querySelector(".shortcuts-overlay-backdrop");
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not close when the dialog itself is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ShortcutsOverlay open={true} onClose={onClose} />);

    await user.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on Escape key", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ShortcutsOverlay open={true} onClose={onClose} />);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("restores focus to the previously focused element when it closes", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { rerender } = render(<ShortcutsOverlay open={true} onClose={() => {}} />);
    rerender(<ShortcutsOverlay open={false} onClose={() => {}} />);

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
