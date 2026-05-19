import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayerAccordion } from "./layer-accordion.jsx";

describe("LayerAccordion", () => {
  it("renders title + toggle reflecting enabled state", () => {
    render(
      <LayerAccordion title="Glow" enabled onEnabledChange={() => {}}>
        <p>strength</p>
      </LayerAccordion>,
    );
    expect(screen.getByText("Glow")).toBeTruthy();
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });

  it("hides content by default and reveals it on chevron click", async () => {
    const user = userEvent.setup();
    render(
      <LayerAccordion title="Grid" enabled onEnabledChange={() => {}}>
        <p>strength</p>
      </LayerAccordion>,
    );
    expect(screen.queryByText("strength")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Expand Grid/ }));
    expect(screen.getByText("strength")).toBeTruthy();
  });

  it("toggle flips the enabled state without opening the accordion", async () => {
    const onEnabledChange = vi.fn();
    const user = userEvent.setup();
    render(
      <LayerAccordion title="Routes" enabled onEnabledChange={onEnabledChange}>
        <p>strength</p>
      </LayerAccordion>,
    );
    await user.click(screen.getByRole("switch"));
    expect(onEnabledChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText("strength")).toBeNull();
  });
});
