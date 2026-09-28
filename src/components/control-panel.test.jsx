import { useState } from "react";
import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { DEFAULT_GLOBE_SETTINGS } from "../config/globe-settings.js";
import { DEFAULT_SHADER_SETTINGS } from "../config/shader-effects.js";
import { ControlPanel } from "./control-panel.jsx";

const noop = () => {};

// Holds globeSettings in real state, like App.jsx does, and reports every
// render's value so tests can read what the panel wrote. The setter is
// exposed too, so a test can change settings from outside the panel the
// way a share link or JSON import does.
const Harness = ({ initialGlobeSettings = DEFAULT_GLOBE_SETTINGS, viewMode = "globe", latest = {} }) => {
  const [globeSettings, setGlobeSettings] = useState(initialGlobeSettings);
  latest.globeSettings = globeSettings;
  latest.setGlobeSettings = setGlobeSettings;
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

  it("renders collapsed with its eye on even when there is no data", () => {
    const { container } = render(<Harness />);
    const disclosure = screen.getByRole("button", { name: "Data" });
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(`#${disclosure.getAttribute("aria-controls")}`).hidden).toBe(true);
    const eye = screen.getByRole("button", { name: "Show data markers" });
    expect(eye.getAttribute("aria-pressed")).toBe("true");
    expect(eye.getAttribute("aria-disabled")).toBeNull();
    expect(eye.title).toBe("Hide data markers + arcs");
  });

  it("has the same header semantics as the other sections", () => {
    const { container } = render(<Harness />);
    const headerShape = (section) => {
      const disclosure = section.querySelector(".option-block-disclosure");
      const eye = section.querySelector(".option-block-eye");
      return {
        disclosure: [disclosure.tagName, disclosure.type, disclosure.hasAttribute("aria-expanded"), disclosure.hasAttribute("aria-controls")],
        eye: [eye.tagName, eye.type, eye.hasAttribute("aria-pressed"), eye.hasAttribute("aria-label"), eye.hasAttribute("title")],
      };
    };
    const network = [...container.querySelectorAll(".option-block")].find(
      (node) => node.querySelector(".option-block-disclosure").textContent === "Network",
    );
    expect(headerShape(dataSection(container))).toEqual(headerShape(network));
  });

  it("moves the paste box out of Surface", () => {
    const { container } = render(<Harness />);
    const surface = [...container.querySelectorAll(".option-block")].find(
      (node) => node.querySelector(".option-block-disclosure").textContent === "Surface",
    );
    expect(surface.querySelector(".data-points-control")).toBeNull();
    expect(dataSection(container).querySelector(".data-points-control")).not.toBeNull();
  });

  it("hides the markers with the eye without clearing the pasted text", () => {
    const latest = {};
    render(<Harness latest={latest} />);
    fireEvent.click(screen.getByRole("button", { name: "Data" }));
    fireEvent.click(screen.getByRole("button", { name: "Load sample" }));
    const textarea = screen.getByRole("textbox", { name: /Data points/ });
    const pasted = textarea.value;
    expect(latest.globeSettings.dataPoints).toHaveLength(7);

    const eye = screen.getByRole("button", { name: "Show data markers" });
    fireEvent.click(eye);
    expect(eye.getAttribute("aria-pressed")).toBe("false");
    expect(eye.title).toBe("Show data markers + arcs");
    expect(latest.globeSettings.data).toBe(false);
    expect(latest.globeSettings.dataPoints).toHaveLength(7);
    expect(textarea.value).toBe(pasted);
    expect(screen.getByText("7 points, hidden.")).toBeTruthy();

    fireEvent.click(eye);
    expect(latest.globeSettings.data).toBe(true);
    expect(latest.globeSettings.dataPoints).toHaveLength(7);
    expect(screen.getByText(/^7 points plotted\./)).toBeTruthy();
  });

  it("says a single hidden point in the singular, and keeps the paste prompt with no points", () => {
    const point = { lat: 40.7, lng: -74, value: 10 };
    const { unmount } = render(
      <Harness initialGlobeSettings={{ ...DEFAULT_GLOBE_SETTINGS, data: false, dataPoints: [point] }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Data" }));
    expect(screen.getByText("1 point, hidden.")).toBeTruthy();
    unmount();

    render(<Harness initialGlobeSettings={{ ...DEFAULT_GLOBE_SETTINGS, data: false }} />);
    fireEvent.click(screen.getByRole("button", { name: "Data" }));
    expect(screen.getByText(/^Paste lat,lng,value/)).toBeTruthy();
  });

  it("fills the paste box with points loaded after it mounted, and keeps them on edit", () => {
    const latest = {};
    render(<Harness latest={latest} />);
    fireEvent.click(screen.getByRole("button", { name: "Data" }));
    const textarea = screen.getByRole("textbox", { name: /Data points/ });
    expect(textarea.value).toBe("");

    // A share link or JSON import lands after the panel mounted.
    act(() =>
      latest.setGlobeSettings((settings) => ({
        ...settings,
        dataPoints: [
          { lat: 40.7, lng: -74, value: 10 },
          { lat: 51.5, lng: -0.1, value: 6 },
          { lat: 35.7, lng: 139.7, value: 8 },
        ],
      })),
    );
    expect(textarea.value).toBe("40.7,-74,10\n51.5,-0.1,6\n35.7,139.7,8");
    expect(screen.getByText(/3 points plotted/)).toBeTruthy();

    // Editing one line keeps the other two instead of wiping them.
    fireEvent.change(textarea, { target: { value: "40.7,-74,10\n51.5,-0.1,60\n35.7,139.7,8" } });
    expect(latest.globeSettings.dataPoints).toEqual([
      { lat: 40.7, lng: -74, value: 10 },
      { lat: 51.5, lng: -0.1, value: 60 },
      { lat: 35.7, lng: 139.7, value: 8 },
    ]);

    // Clearing the points from outside (a reset) empties the box too.
    act(() => latest.setGlobeSettings((settings) => ({ ...settings, dataPoints: [] })));
    expect(textarea.value).toBe("");
  });

  it("never rewrites what the user typed", () => {
    const latest = {};
    render(<Harness latest={latest} />);
    fireEvent.click(screen.getByRole("button", { name: "Data" }));
    const textarea = screen.getByRole("textbox", { name: /Data points/ });
    // A comment, a country line, and a half typed coordinate: the parsed
    // points serialize to something else, so a rewrite would show here.
    const typed = "# visits\nUS,1200\n40.7,-7";
    fireEvent.change(textarea, { target: { value: typed } });
    expect(latest.globeSettings.dataPoints).toHaveLength(2);
    expect(textarea.value).toBe(typed);

    // Other Data settings changing around it leave the text alone too.
    fireEvent.click(screen.getByRole("button", { name: "Show data markers" }));
    act(() => latest.setGlobeSettings((settings) => ({ ...settings, dataMarkerColor: "#ff0000" })));
    expect(textarea.value).toBe(typed);
  });

  it("shows a saved hidden state as the eye off", () => {
    render(<Harness initialGlobeSettings={{ ...DEFAULT_GLOBE_SETTINGS, data: false }} />);
    expect(screen.getByRole("button", { name: "Show data markers" }).getAttribute("aria-pressed")).toBe("false");
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
