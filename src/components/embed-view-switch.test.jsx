import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EmbedViewSwitch } from "./embed-view-switch.jsx";

describe("EmbedViewSwitch", () => {
  it("is a group of a Map and a Globe button, pressed for the view shown", () => {
    render(<EmbedViewSwitch view="globe" onChange={() => {}} />);
    const group = screen.getByRole("group", { name: "View" });
    expect([...group.querySelectorAll("button")].map((button) => button.getAttribute("aria-label"))).toEqual([
      "Map view",
      "Globe view",
    ]);
    expect(screen.getByRole("button", { name: "Globe view" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Map view" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("asks for the view of the button pressed", () => {
    const onChange = vi.fn();
    render(<EmbedViewSwitch view="globe" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Map view" }));
    expect(onChange).toHaveBeenLastCalledWith("flat");
    fireEvent.click(screen.getByRole("button", { name: "Globe view" }));
    expect(onChange).toHaveBeenLastCalledWith("globe");
  });

  it("takes the light palette only for theme light", () => {
    const { rerender } = render(<EmbedViewSwitch view="flat" onChange={() => {}} theme="light" />);
    expect(screen.getByRole("group", { name: "View" }).dataset.theme).toBe("light");
    rerender(<EmbedViewSwitch view="flat" onChange={() => {}} theme="dark" />);
    expect(screen.getByRole("group", { name: "View" }).dataset.theme).toBeUndefined();
  });
});
