import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { DEFAULT_GLOBE_SETTINGS } from "../config/globe-settings.js";
import { DEFAULT_SHADER_SETTINGS } from "../config/shader-effects.js";
import { ControlPanel } from "./control-panel.jsx";

const noop = () => {};

// Holds globeSettings in real state, like App.jsx does, and reports every
// render's value so tests can read what the panel wrote.
const Harness = ({ initialGlobeSettings = DEFAULT_GLOBE_SETTINGS, viewMode = "globe", latest = {} }) => {
  const [globeSettings, setGlobeSettings] = useState(initialGlobeSettings);
  latest.globeSettings = globeSettings;
  return (
    <ControlPanel
      selection="world"
      setSelection={noop}
      stateSelection="all"
      setStateSelection={noop}
      background="#0a0a0c"
      setBackground={noop}
      transparent={false}
      setTransparent={noop}
      backgroundStyle="solid"
      setBackgroundStyle={noop}
      shadeBackground={false}
      setShadeBackground={noop}
      mapDepth={0}
      setMapDepth={noop}
      tiltX={0}
      setTiltX={noop}
      tiltY={0}
      setTiltY={noop}
      density={40}
      setDensity={noop}
      dotSize={10}
      setDotSize={noop}
      dotColor="#ffffff"
      setDotColor={noop}
      shape="Circle"
      setShape={noop}
      dotRotation={0}
      setDotRotation={noop}
      asciiSymbol="*"
      setAsciiSymbol={noop}
      renderMode="dots"
      setRenderMode={noop}
      worldFill="#ffffff"
      setWorldFill={noop}
      worldStroke="#ffffff"
      setWorldStroke={noop}
      dotsVisible
      setDotsVisible={noop}
      shaderSettings={DEFAULT_SHADER_SETTINGS}
      setShaderSettings={noop}
      globeSettings={globeSettings}
      setGlobeSettings={setGlobeSettings}
      viewMode={viewMode}
      usStates={[]}
    />
  );
};

const sectionTitles = (container) =>
  [...container.querySelectorAll(".option-block-disclosure")].map((node) => node.textContent);

const dataSection = (container) =>
  [...container.querySelectorAll(".option-block")].find(
    (node) => node.querySelector(".option-block-disclosure").textContent === "Data",
  );

describe("ControlPanel Data section", () => {
  it("sits right after Network and before Animations, in both views", () => {
    for (const viewMode of ["globe", "flat"]) {
      const { container, unmount } = render(<Harness viewMode={viewMode} />);
      const titles = sectionTitles(container);
      expect(titles.indexOf("Data"), viewMode).toBe(titles.indexOf("Network") + 1);
      expect(titles.indexOf("Animations"), viewMode).toBe(titles.indexOf("Data") + 1);
      // Markers draw on the flat map too, so the section isn't parked in
      // Network's globe only collapsible.
      expect(dataSection(container).closest(".collapsible-section"), viewMode).toBeNull();
      unmount();
    }
  });

  it("renders collapsed", () => {
    const { container } = render(<Harness />);
    const disclosure = screen.getByRole("button", { name: "Data" });
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(`#${disclosure.getAttribute("aria-controls")}`).hidden).toBe(true);
  });

  it("moves the paste box out of Surface", () => {
    const { container } = render(<Harness />);
    const surface = [...container.querySelectorAll(".option-block")].find(
      (node) => node.querySelector(".option-block-disclosure").textContent === "Surface",
    );
    expect(surface.querySelector(".data-points-control")).toBeNull();
    expect(dataSection(container).querySelector(".data-points-control")).not.toBeNull();
  });

  it("has no axe violations with the section open", async () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Data" }));
    const results = await axe.run(dataSection(container), {
      rules: { region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
