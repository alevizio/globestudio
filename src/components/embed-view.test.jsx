import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { EmbedView } from "./embed-view.jsx";
import { RootErrorBoundary } from "./root-error-boundary.jsx";
import { links as legacyLinks } from "../utils/fixtures/legacy-share-links.json";
import { lookPresets } from "../data/look-presets.js";
import { backgroundKind, previewBackground } from "../utils/canvas-background.js";
import { toLinearHex } from "../utils/color-space.js";

// The WebGL globe is replaced by a stand-in that shows the view it was
// asked to draw, and keeps the rest of what it was given. Given an error,
// it throws it from its effect, as the real one does when its renderer
// can't start.
const drawn = vi.hoisted(() => ({ props: null, error: null }));
vi.mock("./globe-background.jsx", async () => {
  const { useEffect } = await import("react");
  return {
    GlobeBackground: (props) => {
      drawn.props = props;
      useEffect(() => {
        if (drawn.error) throw drawn.error;
      }, []);
      return <div data-testid="globe" data-view={props.morphMode} />;
    },
  };
});

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
    drawn.error = null;
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

  describe("a look and a config", () => {
    const open = (search) => {
      window.history.replaceState(null, "", `/embed?${search}`);
      return render(<EmbedView />);
    };

    it("draws a design copied from the studio as it is, over any look", async () => {
      // As embed.js sends data-look with data-config. A design made on the
      // Default look carries no shader effect, and showed Halftone's.
      const { url, expected } = legacyLinks.find((link) => link.name === "studio link, default");
      open(`look=halftone&${new URL(url).search.slice(1)}`);
      await view();
      expect(drawn.props.shaderSettings).toMatchObject({ ...expected.shaderSettings, effect: "none" });
    });

    it("keeps the look's values for the settings a config leaves out", async () => {
      open(`look=topographic&c=${encodeURIComponent(JSON.stringify({ v: 2, shaderSettings: { intensity: 80 } }))}`);
      await view();
      expect(drawn.props.shaderSettings).toMatchObject({ effect: "wave", intensity: 80 });
    });
  });

  // Colors are read the old way, darker than their hex, as every embed has
  // drawn them, unless the share config has hex colors (utils/color-space.js).
  describe("colors", () => {
    const open = (search) => {
      window.history.replaceState(null, "", `/embed?${search}`);
      return render(<EmbedView />);
    };
    const config = (design) => `c=${encodeURIComponent(JSON.stringify(design))}`;
    const toon = lookPresets.find((preset) => preset.id === "toon").settings;

    it("keeps the old reading for a look, ?dotColor=, ?worldFill= and an old config", async () => {
      open("look=toon&worldFill=4080c0");
      await view();
      expect(drawn.props).toMatchObject({ hexColors: false, dotColor: toon.dotColor, worldFill: "#4080c0" });
      expect(drawn.props.globeSettings.gridColor).toBe(toon.globeSettings.gridColor);
    });

    it("keeps the old reading for ?dotColor= and a v2 config", async () => {
      open(`dotColor=ff8000&${config({ v: 2, worldFill: "#4080c0" })}`);
      await view();
      expect(drawn.props).toMatchObject({ hexColors: false, dotColor: "#ff8000", worldFill: "#4080c0" });
    });

    it("draws a v3 config's colors as hex colors, with the look's and the params' turned to match", async () => {
      open(`look=toon&dotColor=808080&${config({ v: 3, worldStroke: "#4080c0", globeSettings: { arcColor: "#ff8000" } })}`);
      await view();
      expect(drawn.props).toMatchObject({
        hexColors: true,
        // The param and the look's own colors, as hex colors that render the same...
        dotColor: "#373737",
        worldFill: toLinearHex(toon.worldFill),
        // ...and the config's, as sent.
        worldStroke: "#4080c0",
      });
      expect(drawn.props.globeSettings.arcColor).toBe("#ff8000");
    });
  });

  // The studio applies a look's settings as they are (App.jsx applyLook) and
  // shows previewBackground behind it. An embed of the look alone used to
  // draw density 40, dot size 10 and the dark theme page whatever the look.
  describe("a look alone", () => {
    const open = (search) => {
      window.history.replaceState(null, "", `/embed?${search}`);
      return render(<EmbedView />);
    };
    const config = (design) => `c=${encodeURIComponent(JSON.stringify({ v: 2, ...design }))}`;
    const look = (id) => lookPresets.find((preset) => preset.id === id).settings;
    // The dotted map is as many rows tall as the density.
    const drawnDensity = () => drawn.props.mapData.image.height;
    const pageColor = (container) => page(container).style.getPropertyValue("--preview-bg");

    it.each(lookPresets.map((look) => [look.id, look.settings]))(
      "draws %s with its own density, dot size and page, as the studio does",
      async (id, settings) => {
        const { container } = open(`look=${id}`);
        await view();
        expect(drawnDensity()).toBe(settings.density);
        expect(drawn.props.dotSize).toBe(settings.dotSize);
        const kind = backgroundKind(settings);
        expect(drawn.props.transparent).toBe(kind !== "solid");
        if (kind === "solid") {
          expect(pageColor(container)).toBe(previewBackground({ ...settings, uiTheme: "dark" }));
        } else {
          expect(page(container).getAttribute("style")).toBeNull();
        }
        expect(page(container).dataset.transparent).toBe(kind === "transparent" ? "true" : undefined);
      },
    );

    it("draws the address's density, dot size and page over the look's", async () => {
      const { container } = open("look=pixel&density=30&dotSize=5&background=204060");
      await view();
      expect(drawnDensity()).toBe(30);
      expect(drawn.props.dotSize).toBe(5);
      expect(pageColor(container)).toBe("#204060");
    });

    it("keeps a page the address paints, or makes opaque, over a see-through look", async () => {
      const painted = open("look=wireframe&background=204060");
      await view();
      expect(drawn.props.transparent).toBe(false);
      expect(pageColor(painted.container)).toBe("#204060");
      painted.unmount();
      const opaque = open("look=wireframe&transparent=0");
      await view();
      expect(drawn.props.transparent).toBe(false);
      expect(pageColor(opaque.container)).toBe(look("wireframe").background);
    });

    it("makes the page see-through when the address asks, over an opaque look", async () => {
      for (const search of ["look=pixel&transparent=1", "look=pixel&background=transparent"]) {
        const { container, unmount } = open(search);
        await view();
        expect(drawn.props.transparent).toBe(true);
        expect(page(container).dataset.transparent).toBe("true");
        unmount();
      }
    });

    it("draws the config's values over the look's, and the look's for the rest", async () => {
      const { container, unmount } = open(`look=pixel&${config({ density: 20, dotSize: 4, background: "#123456" })}`);
      await view();
      expect(drawnDensity()).toBe(20);
      expect(drawn.props.dotSize).toBe(4);
      expect(pageColor(container)).toBe("#123456");
      unmount();
      const partial = open(`look=pixel&${config({ density: 20 })}`);
      await view();
      expect(drawnDensity()).toBe(20);
      expect(drawn.props.dotSize).toBe(look("pixel").dotSize);
      expect(pageColor(partial.container)).toBe(look("pixel").background);
    });

    it("keeps a page the config paints over a see-through look", async () => {
      const { container } = open(`look=wireframe&${config({ background: "#123456" })}`);
      await view();
      expect(drawn.props.transparent).toBe(false);
      expect(pageColor(container)).toBe("#123456");
    });

    it("leaves an embed with no look as it was: density 40, dot size 10 and the dark theme page", async () => {
      for (const search of ["", "view=flat", config({ dotColor: "#ff0000" })]) {
        const { container, unmount } = open(search);
        await view();
        expect(drawnDensity()).toBe(40);
        expect(drawn.props.dotSize).toBe(10);
        expect(drawn.props.background).toBe("#0a0a0a");
        expect(drawn.props.transparent).toBe(false);
        expect(page(container).getAttribute("style")).toBeNull();
        unmount();
      }
    });
  });

  describe("a US state", () => {
    it("is drawn from its outline, with the same empty country list on every render", async () => {
      // A new list on each render rebuilt the globe's solid textures.
      const { rerender } = embed({ selection: "country:USA", stateSelection: "06", renderMode: "solid" });
      await waitFor(() => expect(drawn.props?.selectionCollection).toBeTruthy());
      const codes = drawn.props.selectionCountryCodes;
      expect(codes).toEqual([]);
      rerender(<EmbedView />);
      expect(drawn.props.selectionCountryCodes).toBe(codes);
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

    it("is left to the page when neither the address nor the config has a color, nor a look", async () => {
      const { container, unmount } = embed({ viewMode: "flat" });
      await view();
      expect(page(container).getAttribute("style")).toBeNull();
      unmount();
      const bare = embed(null, "view=flat");
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

  describe("a globe that fails", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("gives way to the no WebGL message when three.js can't start on the context", async () => {
      drawn.error = Object.assign(new Error("Error creating WebGL context."), { noWebGL: true });
      embed(null, "look=default");
      expect(await screen.findByText(/doesn't support WebGL 2/)).toBeTruthy();
      expect(screen.queryByText("Something went wrong.")).toBeNull();
    });

    it("leaves any other error to the root boundary's card", async () => {
      drawn.error = new Error("Something in the globe broke");
      window.history.replaceState(null, "", "/embed?look=default");
      render(
        <RootErrorBoundary where="embed">
          <EmbedView />
        </RootErrorBoundary>,
      );
      expect(await screen.findByText("Something went wrong.")).toBeTruthy();
      expect(screen.queryByText(/doesn't support WebGL 2/)).toBeNull();
    });
  });
});
