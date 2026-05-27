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
    expect(container.querySelector(".option-content").hidden).toBe(true);
  });

  it("opens when defaultOpen is true", () => {
    const { container } = render(
      <PanelSection title="Map" defaultOpen>
        <div>contents</div>
      </PanelSection>,
    );
    expect(container.querySelector(".option-content").hidden).toBe(false);
  });

  it("toggles when the disclosure button is clicked", () => {
    const { container } = render(
      <PanelSection title="Map">
        <div>contents</div>
      </PanelSection>,
    );
    const content = container.querySelector(".option-content");
    fireEvent.click(screen.getByRole("button", { name: "Map" }));
    expect(content.hidden).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Map" }));
    expect(content.hidden).toBe(true);
  });
});
