import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FLOW_BACKGROUND_BASE, SPACE_BACKGROUND_BASE } from "../config/backgrounds.js";
import {
  THEME_CANVAS_COLORS,
  backgroundKind,
  exportBackground,
  previewBackground,
} from "./canvas-background.js";

const STORED = "#123456";
const CREAM = "#f4f1ea";
const DARK_CANVAS = "#0b0b0c";
const FORMATS = ["png", "svg", "webm", "gif", "mp4"];

const solid = (uiTheme) => ({ background: STORED, backgroundStyle: "solid", transparent: false, uiTheme });
const clear = (uiTheme) => ({ background: STORED, backgroundStyle: "transparent", transparent: true, uiTheme });

describe("THEME_CANVAS_COLORS", () => {
  it("matches the --bg tokens in styles.css (dark first, then the light theme)", () => {
    const stylesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../styles.css");
    const tokens = [...readFileSync(stylesPath, "utf8").matchAll(/--bg:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1]);
    expect(tokens).toEqual([THEME_CANVAS_COLORS.dark, THEME_CANVAS_COLORS.light]);
    expect(THEME_CANVAS_COLORS).toEqual({ dark: DARK_CANVAS, light: CREAM });
  });
});

describe("backgroundKind", () => {
  it("reads the transparent flag on a Solid look as Transparent", () => {
    expect(backgroundKind({ backgroundStyle: "solid", transparent: true })).toBe("transparent");
    expect(backgroundKind({ backgroundStyle: "transparent", transparent: false })).toBe("transparent");
  });

  it("lets Space and Flow win over the transparent flag", () => {
    expect(backgroundKind({ backgroundStyle: "space", transparent: true })).toBe("space");
    expect(backgroundKind({ backgroundStyle: "flow", transparent: true })).toBe("flow");
  });
});

describe("previewBackground", () => {
  it("shows the stored color under Solid in the dark theme", () => {
    expect(previewBackground(solid("dark"))).toBe(STORED);
  });

  it("shows the light theme's cream under Solid, whatever color is stored", () => {
    expect(previewBackground(solid("light"))).toBe(CREAM);
  });

  it("puts the Transparent checkerboard on the theme canvas", () => {
    expect(previewBackground(clear("dark"))).toBe(DARK_CANVAS);
    expect(previewBackground(clear("light"))).toBe(CREAM);
  });

  it("keeps the Space and Flow bases in both themes", () => {
    for (const uiTheme of ["dark", "light"]) {
      expect(previewBackground({ ...solid(uiTheme), backgroundStyle: "space" })).toBe(SPACE_BACKGROUND_BASE);
      expect(previewBackground({ ...solid(uiTheme), backgroundStyle: "flow" })).toBe(FLOW_BACKGROUND_BASE);
    }
  });
});

describe("exportBackground", () => {
  describe.each([
    ["dark", STORED],
    ["light", CREAM],
  ])("Solid in the %s theme", (uiTheme, shown) => {
    it.each(FORMATS)("paints %s with the color the preview shows", (format) => {
      expect(exportBackground(format, solid(uiTheme))).toBe(shown);
      expect(exportBackground(format, solid(uiTheme))).toBe(previewBackground(solid(uiTheme)));
    });
  });

  describe.each([
    ["dark", DARK_CANVAS],
    ["light", CREAM],
  ])("Transparent in the %s theme", (uiTheme, themeCanvas) => {
    it.each(["png", "svg", "webm", "gif"])("keeps the alpha in %s", (format) => {
      expect(exportBackground(format, clear(uiTheme))).toBeNull();
    });

    it("gives MP4, which has no alpha, the theme canvas instead of black", () => {
      expect(exportBackground("mp4", clear(uiTheme))).toBe(themeCanvas);
    });
  });

  describe.each(["dark", "light"])("Space and Flow in the %s theme", (uiTheme) => {
    it.each(["space", "flow"])("leave the %s canvas to draw its own background in raster formats", (backgroundStyle) => {
      for (const format of ["png", "webm", "gif", "mp4"]) {
        expect(exportBackground(format, { ...solid(uiTheme), backgroundStyle })).toBeNull();
      }
    });

    it.each(["space", "flow"])("keep the stored color in the SVG, which can't draw %s", (backgroundStyle) => {
      expect(exportBackground("svg", { ...solid(uiTheme), backgroundStyle })).toBe(STORED);
      expect(exportBackground("svg", { ...solid(uiTheme), backgroundStyle, transparent: true })).toBeNull();
    });
  });
});
