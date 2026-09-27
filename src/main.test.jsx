// @vitest-environment-options {"url": "https://globestudio.app/"}
// (analytics is off on localhost, jsdom's default host)
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// main.jsx is the one place <Analytics /> mounts. The Vercel components are
// stand-ins that leave a marker in the DOM, so a test counts live instances
// (StrictMode renders everything twice, so counting calls would not).
vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => <i data-testid="vercel-analytics" />,
}));
vi.mock("@vercel/speed-insights/react", () => ({
  SpeedInsights: () => <i data-testid="speed-insights" />,
}));

// Keep each root main.jsx creates, so a test can unmount it afterwards.
const { roots } = vi.hoisted(() => ({ roots: [] }));
vi.mock("react-dom/client", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createRoot: (...args) => {
      const root = actual.createRoot(...args);
      roots.push(root);
      return root;
    },
  };
});

vi.mock("./utils/console-greeting.js", () => ({ consoleGreeting: () => {} }));
// The real teaser mounts WebGL shaders jsdom can't run.
vi.mock("./components/teaser-page.jsx", () => ({ TeaserPage: () => <h1>Waitlist teaser</h1> }));

// main.jsx isn't rendered through Testing Library, so opt in to act().
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// App's first render reads media queries and observes sizes (see
// app-smoke.test.jsx), and the takeover nav watches scroll; jsdom ships
// none of the three.
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
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// main.jsx renders on import, so boot it fresh at the given path.
const boot = async (path) => {
  window.history.replaceState(null, "", path);
  document.body.innerHTML = '<div id="root"></div>';
  vi.resetModules();
  await act(async () => {
    await import("./main.jsx");
  });
};

const count = (testId) => document.querySelectorAll(`[data-testid="${testId}"]`).length;
const heading = () => document.querySelector("h1")?.textContent;
// RootErrorBoundary's fallback: a crash would unmount analytics too.
const crashed = () => document.querySelector(".map-background-error") !== null;

describe("main.jsx analytics mount", () => {
  afterEach(() => {
    act(() => {
      roots.splice(0).forEach((root) => root.unmount());
    });
    vi.unstubAllEnvs();
  });

  it.each([
    ["/gallery", "Looks gallery"],
    ["/docs", "Docs"],
    ["/no-such-page", "Page not found"],
  ])(
    "mounts analytics and Speed Insights once on the static route %s",
    async (path, title) => {
      await boot(path);
      await vi.waitFor(() => expect(heading()).toBe(title));
      expect(count("vercel-analytics")).toBe(1);
      expect(count("speed-insights")).toBe(1);
      expect(crashed()).toBe(false);
    },
    20000,
  );

  it("mounts analytics and Speed Insights once on the app route", async () => {
    await boot("/");
    expect(document.querySelector("main.app-shell")).not.toBeNull();
    await vi.waitFor(() => expect(count("vercel-analytics")).toBe(1));
    expect(count("speed-insights")).toBe(1);
    expect(crashed()).toBe(false);
  }, 20000);

  it("mounts analytics once on the teaser", async () => {
    vi.stubEnv("VITE_TEASER", "1");
    await boot("/");
    await vi.waitFor(() => expect(heading()).toBe("Waitlist teaser"));
    expect(count("vercel-analytics")).toBe(1);
    expect(count("speed-insights")).toBe(1);
    expect(crashed()).toBe(false);
  }, 20000);

  it("mounts no analytics and no Speed Insights on /embed", async () => {
    await boot("/embed?look=halftone");
    expect(document.getElementById("root").childElementCount).toBeGreaterThan(0);
    expect(crashed()).toBe(false);
    expect(count("vercel-analytics")).toBe(0);
    expect(count("speed-insights")).toBe(0);
  }, 20000);

  it("still mounts nothing for a visitor who opted out", async () => {
    window.localStorage.setItem("gs_optout", "true");
    await boot("/docs");
    expect(heading()).toBe("Docs");
    expect(crashed()).toBe(false);
    expect(count("vercel-analytics")).toBe(0);
    expect(count("speed-insights")).toBe(0);
  }, 20000);
});
