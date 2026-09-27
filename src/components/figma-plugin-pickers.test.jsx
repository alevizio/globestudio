import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { lookPresets } from "../data/look-presets.js";
import { FigmaPluginPickers } from "./figma-plugin-pickers.jsx";

const renderPickers = (props = {}) => {
  const onChange = vi.fn();
  const utils = render(
    <FigmaPluginPickers look="default" selection="world" density={40} onChange={onChange} {...props} />,
  );
  return { onChange, ...utils };
};

describe("FigmaPluginPickers", () => {
  it("renders a labeled look, region and density control", () => {
    renderPickers();
    expect(screen.getByRole("group", { name: "Globe settings" })).toBeTruthy();
    const look = screen.getByRole("combobox", { name: "Look" });
    expect(look.value).toBe("default");
    expect(screen.getByRole("button", { name: "Country or region: World" })).toBeTruthy();
    expect(screen.getByRole("slider", { name: "Density" }).value).toBe("40");
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

  it("shows the current region label", () => {
    renderPickers({ selection: "country:JPN" });
    expect(screen.getByRole("button", { name: /^Country or region: Japan/ })).toBeTruthy();
  });

  it("has no axe violations", async () => {
    const { container } = renderPickers();
    const results = await axe.run(container, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
