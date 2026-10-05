// Low power mode in App.jsx: the canvas halo goes, a notice says so, and the
// notice can bring the effects back. The globe itself can't run in jsdom, so
// a stand-in reports what the real one would (a software renderer or a slow
// frame rate) through the same onLowPower prop.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_GLOBE_SETTINGS } from "../config/globe-settings.js";

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

  it("remembers a slow device so the next visit starts in low power mode", async () => {
    globe.report = "slow";
    await renderApp();
    await screen.findByText(NOTICE);
    await waitFor(() => expect(window.localStorage.getItem("globestudio:lowPower")).toBe(JSON.stringify("on")));
  }, 20000);

  it("does not remember a software renderer, which is found again on every visit", async () => {
    globe.report = "software";
    await renderApp();
    await screen.findByText(NOTICE);
    await act(async () => {});
    expect(window.localStorage.getItem("globestudio:lowPower")).toBeNull();
    expect(globe.props.lowPower).toBe(true);
  }, 20000);

  it("starts in low power mode when it is forced on", async () => {
    window.localStorage.setItem("globestudio:lowPower", JSON.stringify("on"));
    await renderApp();
    expect(halo()).toBe("none");
    expect(screen.getByText(NOTICE)).toBeTruthy();
    expect(globe.props.lowPower).toBe(true);
  }, 20000);

  it.each([
    ["the glow is off", { globeSettings: { ...DEFAULT_GLOBE_SETTINGS, glow: false } }],
    ["an opaque Space background hides the halo", { backgroundStyle: "space", shadeBackground: false }],
  ])("says nothing on a 1x screen when %s, as it changes nothing there", async (_, saved) => {
    window.localStorage.setItem("globestudio:lowPower", JSON.stringify("on"));
    for (const [key, value] of Object.entries(saved)) {
      window.localStorage.setItem(`globestudio:${key}`, JSON.stringify(value));
    }
    await renderApp();
    await act(async () => {});
    expect(globe.props.lowPower).toBe(true);
    expect(halo()).toBe("none");
    expect(screen.queryByText(NOTICE)).toBeNull();
  }, 20000);

  // A look route and a share link apply their design in an effect after the
  // first render, which still shows the default design with its glow on.
  it.each([
    ["a look route", "/looks/newsprint"],
    ["a share link", `/?c=${encodeURIComponent(JSON.stringify({ v: 2, globeSettings: { glow: false } }))}`],
  ])("never flashes the notice on a 1x screen when %s opens with the glow off", async (_, url) => {
    window.history.pushState({}, "", url);
    window.localStorage.setItem("globestudio:lowPower", JSON.stringify("on"));
    const records = [];
    const observer = new MutationObserver((batch) => records.push(...batch));
    observer.observe(document.body, { childList: true, subtree: true });
    await renderApp();
    await act(async () => {});
    records.push(...observer.takeRecords());
    observer.disconnect();
    expect(globe.props.globeSettings.glow).toBe(false);
    const notices = records
      .flatMap((record) => [...record.addedNodes, ...record.removedNodes])
      .filter((node) => node.nodeType === 1 && (node.matches(".low-power-notice") || node.querySelector(".low-power-notice")));
    expect(notices).toHaveLength(0);
  }, 20000);

  it("still says so with the glow off on a dense screen, where it previews at one device pixel", async () => {
    const devicePixelRatio = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 2 });
    try {
      window.localStorage.setItem("globestudio:lowPower", JSON.stringify("on"));
      window.localStorage.setItem("globestudio:globeSettings", JSON.stringify({ ...DEFAULT_GLOBE_SETTINGS, glow: false }));
      await renderApp();
      expect(screen.getByText(NOTICE)).toBeTruthy();
    } finally {
      Object.defineProperty(window, "devicePixelRatio", devicePixelRatio);
    }
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
