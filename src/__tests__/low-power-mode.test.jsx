// Low power mode in App.jsx: the canvas halo goes, a notice says so, and the
// notice can bring the effects back. The globe itself can't run in jsdom, so
// a stand-in reports what the real one would (a software renderer or a slow
// frame rate) through the same onLowPower prop.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const globe = vi.hoisted(() => ({ props: null, report: null }));

vi.mock("../utils/webgl-support.js", () => ({ hasWebGL: () => true }));
vi.mock("../components/globe-background.jsx", async () => {
  const { useEffect } = await import("react");
  return {
    GlobeBackground: (props) => {
      globe.props = props;
      useEffect(() => {
        if (globe.report) props.onLowPower?.(globe.report);
      }, [props.onLowPower]);
      return <canvas className="globe-stand-in" tabIndex={0} ref={props.canvasHandleRef} />;
    },
  };
});

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const NOTICE = "Effects reduced so the globe runs faster on this device.";

const halo = () => document.querySelector("main.app-shell").style.getPropertyValue("--globe-canvas-halo");

const renderApp = async () => {
  const { default: App } = await import("../App.jsx");
  render(<App />);
  await waitFor(() => expect(globe.props).not.toBeNull());
};

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  globe.props = null;
  globe.report = null;
});

describe("Low power mode", () => {
  it("changes nothing while the globe reports no trouble", async () => {
    await renderApp();
    expect(halo()).toContain("drop-shadow");
    expect(screen.queryByText(NOTICE)).toBeNull();
    expect(globe.props.lowPower).toBe(false);
    expect(typeof globe.props.onLowPower).toBe("function");
  }, 20000);

  it("drops the canvas halo and shows the notice when the globe reports a slow device", async () => {
    globe.report = "slow";
    await renderApp();
    await screen.findByText(NOTICE);
    expect(halo()).toBe("none");
    expect(globe.props.lowPower).toBe(true);
  }, 20000);

  it("starts in low power mode when it is forced on", async () => {
    window.localStorage.setItem("globestudio:lowPower", JSON.stringify("on"));
    await renderApp();
    expect(halo()).toBe("none");
    expect(screen.getByText(NOTICE)).toBeTruthy();
    expect(globe.props.lowPower).toBe(true);
  }, 20000);

  it("turns the effects back on for good from the notice", async () => {
    const user = userEvent.setup();
    globe.report = "software";
    await renderApp();
    await screen.findByText(NOTICE);
    await user.click(screen.getByRole("button", { name: "Turn effects back on" }));
    expect(halo()).toContain("drop-shadow");
    expect(screen.queryByText(NOTICE)).toBeNull();
    expect(globe.props.lowPower).toBe(false);
    // Remembered, and the globe stops watching for a slow device.
    expect(window.localStorage.getItem("globestudio:lowPower")).toBe(JSON.stringify("off"));
    expect(globe.props.onLowPower).toBeFalsy();
    // Focus goes to the globe the notice was about, not the page top.
    expect(document.activeElement?.classList.contains("globe-stand-in")).toBe(true);
  }, 20000);

  it("keeps the effects reduced when the notice is dismissed", async () => {
    const user = userEvent.setup();
    globe.report = "slow";
    await renderApp();
    await screen.findByText(NOTICE);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(NOTICE)).toBeNull();
    expect(halo()).toBe("none");
  }, 20000);

  it("never turns itself on in an automated browser", async () => {
    // Playwright, Lighthouse and other drivers set navigator.webdriver. The
    // CI browser renders in SwiftShader, so it would always detect.
    Object.defineProperty(window.navigator, "webdriver", { configurable: true, get: () => true });
    try {
      globe.report = "software";
      await renderApp();
      await act(async () => {});
      expect(globe.props.onLowPower).toBeFalsy();
      expect(halo()).toContain("drop-shadow");
      expect(screen.queryByText(NOTICE)).toBeNull();
    } finally {
      delete window.navigator.webdriver;
    }
  }, 20000);

  it("does not count the saved choice as a design change", async () => {
    window.localStorage.setItem("globestudio:lowPower", JSON.stringify("off"));
    await renderApp();
    expect(document.querySelector(".looks-chip.is-current")?.textContent).toMatch(/Default/);
  }, 20000);
});
