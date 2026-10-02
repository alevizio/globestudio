import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useModalA11y } from "./use-modal-a11y.js";

// A dialog like the app's: opened by a button in the shell, with a
// container that takes focus and a button inside it.
const Dialog = ({ open, onClose, copy = "shown" }) => {
  const dialogRef = useRef(null);
  useModalA11y({ open, onClose, containerRef: dialogRef, backdropSelector: ".backdrop" });
  if (!open) return null;
  return (
    <div className="backdrop">
      <div role="dialog" aria-label="Export" tabIndex={-1} ref={dialogRef}>
        {copy !== "removed" && (
          <button type="button" disabled={copy === "disabled"}>
            Copy
          </button>
        )}
      </div>
    </div>
  );
};
const Shell = (props) => (
  <main className="app-shell">
    <button type="button">Open</button>
    <Dialog {...props} />
  </main>
);

// The hook focuses the dialog on a timer and marks the shell inert on a frame.
const settle = () => act(() => vi.runAllTimers());

describe("useModalA11y", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const open = () => {
    const view = render(<Shell open={false} onClose={() => {}} />);
    screen.getByRole("button", { name: "Open" }).focus();
    view.rerender(<Shell open onClose={() => {}} />);
    settle();
    return view;
  };

  it("moves focus into the dialog when it opens, and back to the trigger when it closes", () => {
    const view = open();
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
    view.rerender(<Shell open={false} onClose={() => {}} />);
    settle();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open" }));
  });

  // App.jsx hands the export dialog a new onClose on every render, and a
  // copy button's state change renders it twice: on the copy, and when the
  // label resets.
  it("leaves focus on the button in use when the parent renders again", () => {
    const view = open();
    const copy = screen.getByRole("button", { name: "Copy" });
    copy.focus();
    view.rerender(<Shell open onClose={() => {}} />);
    settle();
    expect(document.activeElement).toBe(copy);
  });

  it("keeps the rest of the page inert across those renders", () => {
    const view = open();
    const trigger = screen.getByRole("button", { name: "Open" });
    expect(trigger.hasAttribute("inert")).toBe(true);
    view.rerender(<Shell open onClose={() => {}} />);
    expect(trigger.hasAttribute("inert")).toBe(true);
    settle();
    expect(trigger.hasAttribute("inert")).toBe(true);
  });

  it("takes focus back when the element that had it is removed", () => {
    const view = open();
    screen.getByRole("button", { name: "Copy" }).focus();
    view.rerender(<Shell open onClose={() => {}} copy="removed" />);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });

  it("takes focus back when the element that had it is disabled", () => {
    const view = open();
    screen.getByRole("button", { name: "Copy" }).focus();
    view.rerender(<Shell open onClose={() => {}} copy="disabled" />);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });

  it("closes on Escape with the onClose from the latest render", () => {
    const view = open();
    const first = vi.fn();
    const latest = vi.fn();
    view.rerender(<Shell open onClose={first} />);
    view.rerender(<Shell open onClose={latest} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(latest).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});
