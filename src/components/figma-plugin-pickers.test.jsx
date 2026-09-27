import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { lookPresets } from "../data/look-presets.js";
import { FigmaPluginPickers } from "./figma-plugin-pickers.jsx";

const renderPickers = (props = {}) => {
  const onChange = vi.fn();
  const utils = render(
    <FigmaPluginPickers
      look="default"
      selection="world"
      density={40}
      view="globe"
      dots={1365}
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange, ...utils };
};

describe("FigmaPluginPickers", () => {
  it("renders a labeled look, region, density and view control", () => {
    renderPickers();
    expect(screen.getByRole("group", { name: "Globe settings" })).toBeTruthy();
    const look = screen.getByRole("combobox", { name: "Look" });
    expect(look.value).toBe("default");
    expect(screen.getByRole("button", { name: "Country or region: World" })).toBeTruthy();
    expect(screen.getByRole("slider", { name: "Density" }).value).toBe("40");
    expect(screen.getByRole("group", { name: "View" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Globe", pressed: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Flat", pressed: false })).toBeTruthy();
  });

  it("offers every look preset", () => {
    renderPickers();
    const options = screen.getAllByRole("option").map((option) => option.value);
    expect(options).toEqual(lookPresets.map((preset) => preset.id));
  });

  it("reports a look change", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPickers();
    await user.selectOptions(screen.getByRole("combobox", { name: "Look" }), "halftone");
    expect(onChange).toHaveBeenCalledWith({ look: "halftone" });
  });

  it("reports a region picked by search", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPickers();
    await user.click(screen.getByRole("button", { name: /^Country or region/ }));
    await user.type(screen.getByLabelText("Filter Country or region"), "japan");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith({ selection: "country:JPN" });
  });

  it("reports a density change within the studio range", () => {
    const { onChange } = renderPickers();
    fireEvent.change(screen.getByRole("slider", { name: "Density" }), { target: { value: "72" } });
    expect(onChange).toHaveBeenCalledWith({ density: 72 });
  });

  it("reports a view change from the keyboard", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPickers();
    screen.getByRole("button", { name: "Flat" }).focus();
    await user.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith({ view: "flat" });
  });

  it("shows the Flat view as checked", () => {
    renderPickers({ view: "flat" });
    expect(screen.getByRole("button", { name: "Flat", pressed: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Globe", pressed: false })).toBeTruthy();
  });

  it("treats an unknown view as the globe, like the embed does", () => {
    renderPickers({ view: "sideways" });
    expect(screen.getByRole("button", { name: "Globe", pressed: true })).toBeTruthy();
    expect(screen.getByText("Inserts a PNG of the globe.")).toBeTruthy();
  });

  it("says what Insert adds for each view and dot count", () => {
    const props = { look: "default", selection: "world", density: 40, onChange: vi.fn() };
    const { rerender } = renderPickers();
    // A polite status region, so a screen reader hears the outcome change.
    expect(screen.getByText("Inserts a PNG of the globe.").getAttribute("role")).toBe("status");
    // The Globe view inserts the PNG whatever the dot count.
    rerender(<FigmaPluginPickers {...props} view="globe" dots={9000} />);
    expect(screen.getByText("Inserts a PNG of the globe.")).toBeTruthy();
    // figma-plugin/code.js keeps vectors up to and including 2,500 dots.
    rerender(<FigmaPluginPickers {...props} view="flat" dots={2500} />);
    expect(screen.getByText("Inserts the flat map as editable vectors.")).toBeTruthy();
    rerender(<FigmaPluginPickers {...props} view="flat" dots={2501} />);
    expect(screen.getByText("Inserts a PNG. Lower the density for vectors.")).toBeTruthy();
  });

  it("says a solid look inserts a PNG of the flat map at any dot count", () => {
    const props = { look: "bloom", selection: "world", density: 40, solid: true, onChange: vi.fn() };
    // Bloom's Flat view shows a textured map, so no dotted vectors, even
    // under the 2,500 dot limit.
    const { rerender } = render(<FigmaPluginPickers {...props} view="flat" dots={1365} />);
    expect(screen.getByText("Inserts a PNG of the flat map.")).toBeTruthy();
    rerender(<FigmaPluginPickers {...props} view="flat" dots={9000} />);
    expect(screen.getByText("Inserts a PNG of the flat map.")).toBeTruthy();
    rerender(<FigmaPluginPickers {...props} view="globe" dots={1365} />);
    expect(screen.getByText("Inserts a PNG of the globe.")).toBeTruthy();
  });

  it("shows the current region label", () => {
    renderPickers({ selection: "country:JPN" });
    expect(screen.getByRole("button", { name: /^Country or region: Japan/ })).toBeTruthy();
  });

  it.each(["globe", "flat"])("has no axe violations in the %s view", async (view) => {
    const { container } = renderPickers({ view });
    const results = await axe.run(container, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
