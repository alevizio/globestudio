import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmbedView } from "./embed-view.jsx";

// The WebGL globe is replaced by a stand-in that shows the view it was
// asked to draw, and keeps the rest of what it was given.
const drawn = vi.hoisted(() => ({ props: null }));
vi.mock("./globe-background.jsx", () => ({
  GlobeBackground: (props) => {
    drawn.props = props;
    return <div data-testid="globe" data-view={props.morphMode} />;
  },
}));

// What the React and web component packages send: the share config alone.
const embed = (design, extra = "") => {
  const config = design ? `c=${encodeURIComponent(JSON.stringify({ v: 2, ...design }))}` : "";
  window.history.replaceState(null, "", `/embed?${config}${extra}`);
  return render(<EmbedView />);
};
const view = async () => (await screen.findByTestId("globe")).dataset.view;
const page = (container) => container.querySelector(".embed-view");

describe("EmbedView", () => {
  beforeEach(() => {
    // jsdom has no WebGL, and the embed shows a fallback without it.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => null });
    drawn.props = null;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  describe("the view", () => {
    it("is the share config's when the address names none", async () => {
      embed({ viewMode: "flat" });
      expect(await view()).toBe("flat");
    });

    it("is the globe for a config that says so, or says nothing", async () => {
      embed({ viewMode: "globe" }).unmount();
      embed({ density: 50 });
      expect(await view()).toBe("globe");
    });

    it("is the address's when it names one, whatever the config says", async () => {
      embed({ viewMode: "flat" }, "&view=globe");
      expect(await view()).toBe("globe");
    });

    it("is the address's Flat view over a config's globe", async () => {
      embed({ viewMode: "globe" }, "&view=flat");
      expect(await view()).toBe("flat");
    });

    it("is still the address's without a share config", async () => {
      embed(null, "look=halftone&view=flat");
      expect(await view()).toBe("flat");
    });
  });

  describe("the rest of the design", () => {
    const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M5 0L10 10H0z" fill="#e00"/></svg>';
    const DESIGN = {
      shape: "Custom",
      customShape: {
        name: "triangle.svg",
        type: "image/svg+xml",
        svgSource: SVG,
        dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SVG)}`,
      },
      dotsVisible: false,
      sizeVary: true,
      dotColorAlpha: 0.4,
      renderMode: "solid",
      worldFillAlpha: 0.5,
      worldFillGradient: { from: "#112233", to: "#445566", angle: 90 },
      worldFillVisible: false,
      worldStrokeAlpha: 0.3,
      worldStrokeGradient: { from: "#778899", to: "#aabbcc", angle: 45 },
      worldStrokeVisible: false,
      worldStrokeWidth: 3.5,
      flatProjection: "robinson",
      riversVisible: true,
      citiesVisible: true,
      citiesMinPop: 1_000_000,
      mapDepth: 20,
    };

    it("is drawn from the share config, which the embed used to leave at its own values", async () => {
      embed(DESIGN);
      await view();
      expect(drawn.props).toMatchObject({
        customShape: { name: "triangle.svg", type: "image/svg+xml", svgSource: SVG },
        dotsVisible: false,
        sizeVary: true,
        dotColorAlpha: 0.4,
        worldFillAlpha: 0.5,
        worldFillGradient: { from: "#112233", to: "#445566", angle: 90 },
        worldFillVisible: false,
        worldStrokeAlpha: 0.3,
        worldStrokeGradient: { from: "#778899", to: "#aabbcc", angle: 45 },
        worldStrokeVisible: false,
        worldStrokeWidth: 3.5,
        flatProjection: "robinson",
        riversVisible: true,
        citiesVisible: true,
        citiesMinPop: 1_000_000,
        mapDepth: 20,
      });
    });

    it("keeps the embed's own values for a config without them, and for no config", async () => {
      const defaults = {
        customShape: null,
        dotsVisible: true,
        sizeVary: false,
        dotColorAlpha: 1,
        worldFillAlpha: 1,
        worldFillGradient: null,
        worldFillVisible: true,
        worldStrokeAlpha: 1,
        worldStrokeGradient: null,
        worldStrokeVisible: true,
        worldStrokeWidth: 1.8,
        flatProjection: "mercator",
        riversVisible: false,
        citiesVisible: false,
        citiesMinPop: 0,
        mapDepth: 55,
      };
      const { unmount } = embed({ density: 50 });
      await view();
      expect(drawn.props).toMatchObject(defaults);
      unmount();
      drawn.props = null;
      embed(null, "look=halftone");
      await view();
      expect(drawn.props).toMatchObject(defaults);
    });

    it("holds still when the design has its animations off", async () => {
      embed({ animationsEnabled: false });
      await view();
      expect(drawn.props.rotateAnimating).toBe(false);
      expect(drawn.props.reducedMotion).toBe(true);
    });

    it("moves when the design's animations are on, or the config doesn't say", async () => {
      for (const design of [{ animationsEnabled: true }, { density: 50 }]) {
        const { unmount } = embed(design);
        await view();
        expect(drawn.props.rotateAnimating).toBe(true);
        expect(drawn.props.reducedMotion).toBe(false);
        unmount();
      }
    });
  });

  describe("the page background", () => {
    it("is the share config's Solid color when the address names none", async () => {
      const { container } = embed({ background: "#7a1f1f" });
      await view();
      expect(page(container).style.backgroundColor).toBe("rgb(122, 31, 31)");
      expect(page(container).style.getPropertyValue("--preview-bg")).toBe("#7a1f1f");
    });

    it("is left to the page for a Transparent, Space or Flow design", async () => {
      for (const design of [
        { background: "#7a1f1f", transparent: true },
        { background: "#7a1f1f", backgroundStyle: "transparent" },
        { background: "#7a1f1f", backgroundStyle: "space" },
        { background: "#7a1f1f", backgroundStyle: "flow" },
      ]) {
        const { container, unmount } = embed(design);
        await view();
        expect(page(container).getAttribute("style")).toBeNull();
        unmount();
      }
    });

    it("is left to the page when neither the address nor the config has a color", async () => {
      const { container, unmount } = embed({ viewMode: "flat" });
      await view();
      expect(page(container).getAttribute("style")).toBeNull();
      unmount();
      const bare = embed(null, "look=halftone");
      await view();
      expect(page(bare.container).getAttribute("style")).toBeNull();
    });

    it("stays see-through when the address asks for background=transparent", async () => {
      const { container } = embed({ background: "#7a1f1f" }, "&background=transparent");
      await view();
      expect(page(container).getAttribute("style")).toBeNull();
    });

    it("is still painted when the address asks for one", async () => {
      const { container } = embed(null, "look=halftone&background=204060");
      await view();
      expect(page(container).style.backgroundColor).toBe("rgb(32, 64, 96)");
    });
  });
});
