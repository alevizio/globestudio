import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { lookPresets } from "../data/look-presets.js";
import { PresetDetail } from "./preset-detail.jsx";

const hrefs = () => screen.getAllByRole("link").map((link) => link.getAttribute("href"));

describe("PresetDetail", () => {
  it("renders the look's copy under its name", () => {
    render(<PresetDetail preset={lookPresets[1]} />);
    expect(screen.getByRole("heading", { level: 2, name: lookPresets[1].name })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "When to use this" })).toBeTruthy();
  });

  it("links the gallery and the previous and next looks", () => {
    render(<PresetDetail preset={lookPresets[1]} />);
    expect(hrefs()).toEqual(["/gallery", `/looks/${lookPresets[0].id}`, `/looks/${lookPresets[2].id}`]);
    expect(screen.getByRole("link", { name: `Next: ${lookPresets[2].name} →` })).toBeTruthy();
  });

  it("wraps around at both ends of the list", () => {
    const last = lookPresets.at(-1);
    render(<PresetDetail preset={lookPresets[0]} />);
    expect(hrefs()).toContain(`/looks/${last.id}`);
    expect(hrefs()).toContain(`/looks/${lookPresets[1].id}`);
  });

  it("renders nothing without a preset", () => {
    const { container } = render(<PresetDetail preset={undefined} />);
    expect(container.innerHTML).toBe("");
  });
});
