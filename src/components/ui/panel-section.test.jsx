import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PanelSection } from "./panel-section.jsx";

describe("PanelSection", () => {
  it("renders the title and children", () => {
    render(
      <PanelSection title="Map">
        <div>Map content</div>
      </PanelSection>,
    );
    expect(screen.getByText("Map")).toBeTruthy();
    expect(screen.getByText("Map content")).toBeTruthy();
  });

  it("is closed by default", () => {
    const { container } = render(
      <PanelSection title="Map">
        <div>contents</div>
      </PanelSection>,
    );
    expect(container.querySelector("details").open).toBe(false);
  });

  it("opens when defaultOpen is true", () => {
    const { container } = render(
      <PanelSection title="Map" defaultOpen>
        <div>contents</div>
      </PanelSection>,
    );
    expect(container.querySelector("details").open).toBe(true);
  });

  it("syncs React state on toggle event", () => {
    const { container } = render(
      <PanelSection title="Map">
        <div>contents</div>
      </PanelSection>,
    );
    const details = container.querySelector("details");
    details.open = false;
    fireEvent(details, new Event("toggle", { bubbles: false }));
    expect(details.open).toBe(false);
  });
});
