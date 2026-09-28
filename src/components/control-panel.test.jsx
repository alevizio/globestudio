import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ControlPanel } from "./control-panel.jsx";
import { DEFAULT_FLOW_SETTINGS, DEFAULT_SPACE_SETTINGS } from "../config/backgrounds.js";
import { DEFAULT_GLOBE_SETTINGS } from "../config/globe-settings.js";
import { DEFAULT_SHADER_SETTINGS } from "../config/shader-effects.js";

const noop = () => {};

// Holds the background state the way App does, so a click in the panel
// re-renders the panel with the new values.
const Harness = ({ initialStyle = "solid", initialTransparent = false }) => {
  const [backgroundStyle, setBackgroundStyle] = useState(initialStyle);
  const [transparent, setTransparent] = useState(initialTransparent);
  return (
    <>
      <output data-testid="state">{`${backgroundStyle}:${transparent}`}</output>
      <ControlPanel
        selection="world"
        setSelection={noop}
        stateSelection="all"
        setStateSelection={noop}
        background="#0a0a0a"
        setBackground={noop}
        transparent={transparent}
        setTransparent={setTransparent}
        backgroundStyle={backgroundStyle}
        setBackgroundStyle={setBackgroundStyle}
        shadeBackground
        setShadeBackground={noop}
        spaceSettings={DEFAULT_SPACE_SETTINGS}
        setSpaceSettings={noop}
        flowSettings={DEFAULT_FLOW_SETTINGS}
        setFlowSettings={noop}
        mapDepth={55}
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
        worldFill="#5a5a64"
        setWorldFill={noop}
        worldStroke="#f6f2ea"
        setWorldStroke={noop}
        dotsVisible
        setDotsVisible={noop}
        shaderSettings={DEFAULT_SHADER_SETTINGS}
        setShaderSettings={noop}
        globeSettings={DEFAULT_GLOBE_SETTINGS}
        setGlobeSettings={noop}
        viewMode="globe"
        usStates={[]}
      />
    </>
  );
};

const state = () => screen.getByTestId("state").textContent;
const styleGroup = () => screen.getByRole("group", { name: "Background style", hidden: true });
const option = (name) => within(styleGroup()).getByRole("button", { name, hidden: true });
const eye = () => screen.getByRole("button", { name: "Toggle background", hidden: true });
const colorRow = () => screen.queryByRole("button", { name: /select background color/i, hidden: true });

describe("ControlPanel background", () => {
  it("offers Solid, Space and Transparent", () => {
    render(<Harness />);
    const labels = within(styleGroup()).getAllByRole("button", { hidden: true }).map((node) => node.textContent);
    expect(labels).toEqual(["Solid", "Space", "Transparent"]);
    expect(option("Solid").getAttribute("aria-pressed")).toBe("true");
  });

  it("Transparent sets the same state as the eye, and the eye follows it", () => {
    render(<Harness />);
    expect(eye().getAttribute("aria-pressed")).toBe("true");
    expect(colorRow()).not.toBeNull();

    fireEvent.click(option("Transparent"));
    expect(state()).toBe("transparent:true");
    expect(option("Transparent").getAttribute("aria-pressed")).toBe("true");
    expect(eye().getAttribute("aria-pressed")).toBe("false");
    // The Color row is for Solid only.
    expect(colorRow()).toBeNull();

    fireEvent.click(option("Solid"));
    expect(state()).toBe("solid:false");
    expect(eye().getAttribute("aria-pressed")).toBe("true");
    expect(colorRow()).not.toBeNull();
  });

  it("the eye turns Transparent on and restores the last other style", () => {
    render(<Harness initialStyle="space" />);
    fireEvent.click(eye());
    expect(state()).toBe("transparent:true");
    expect(option("Transparent").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(eye());
    expect(state()).toBe("space:false");
    expect(option("Space").getAttribute("aria-pressed")).toBe("true");
  });

  it("reads a look that pairs transparent with the solid style as Transparent", () => {
    render(<Harness initialStyle="solid" initialTransparent />);
    expect(option("Transparent").getAttribute("aria-pressed")).toBe("true");
    expect(eye().getAttribute("aria-pressed")).toBe("false");
    expect(colorRow()).toBeNull();

    fireEvent.click(eye());
    expect(state()).toBe("solid:false");
  });
});
