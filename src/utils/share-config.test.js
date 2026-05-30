import { afterEach, describe, expect, it } from "vitest";
import {
  buildShareUrl,
  clearShareConfigFromUrl,
  normalizeConfig,
  parseShareConfig,
} from "./share-config.js";

afterEach(() => {
  if (typeof window !== "undefined") {
    window.history.replaceState({}, "", "/");
  }
});

describe("share-config", () => {
  it("round-trips a basic config", () => {
    const config = { selection: "country:USA", dotColor: "#ff0044", density: 60 };
    const url = buildShareUrl(config, "https://globestudio.app");
    expect(url).toMatch(/^https:\/\/globestudio\.app\/\?c=/);

    const search = url.split("?")[1];
    const parsed = parseShareConfig(`?${search}`);
    expect(parsed).toMatchObject(config);
  });

  it("round-trips deeply-nested config (gradients, shader/globe settings)", () => {
    const config = {
      selection: "continent:Europe",
      backgroundStyle: "flow",
      dotGradient: { from: "#ff0", to: "#0ff", angle: 45 },
      shaderSettings: { effect: "halftone", cellSize: 10, intensity: 80 },
      globeSettings: { autoSpin: false, networkMono: true, glowStrength: 64 },
      flowSettings: { colorA: "#635bff", colorB: "#00d4ff", colorC: "#ff5c93", turbulence: 72 },
    };
    const url = buildShareUrl(config, "https://globestudio.app");
    const parsed = parseShareConfig(`?${url.split("?")[1]}`);
    expect(parsed).toMatchObject(config);
  });

  it("strips the version marker so importConfig doesn't see it", () => {
    const url = buildShareUrl({ selection: "world" }, "https://globestudio.app");
    const parsed = parseShareConfig(`?${url.split("?")[1]}`);
    expect(parsed).not.toHaveProperty("v");
    expect(parsed).not.toHaveProperty("version");
  });

  it("returns null for missing or malformed config", () => {
    expect(parseShareConfig("")).toBe(null);
    expect(parseShareConfig("?other=value")).toBe(null);
    expect(parseShareConfig("?c=not-valid-base64-json")).toBe(null);
    expect(parseShareConfig(null)).toBe(null);
    expect(parseShareConfig(undefined)).toBe(null);
  });

  it("clamps imported numeric settings to supported ranges", () => {
    const normalized = normalizeConfig({
      density: 999,
      dotSize: -5,
      dotColorAlpha: 10,
      shaderSettings: { effect: "halftone", intensity: 180, cellSize: 99 },
      globeSettings: { glowStrength: -20, gridSize: 999 },
    });

    expect(normalized.density).toBe(100);
    expect(normalized.dotSize).toBe(0.1);
    expect(normalized.dotColorAlpha).toBe(1);
    expect(normalized.shaderSettings.intensity).toBe(100);
    expect(normalized.shaderSettings.cellSize).toBe(30);
    expect(normalized.globeSettings.glowStrength).toBe(0);
    expect(normalized.globeSettings.gridSize).toBe(90);
  });

  it("rejects unknown fields and invalid custom-shape payloads", () => {
    const normalized = normalizeConfig({
      density: 50,
      unknown: "ignored",
      shape: "Custom",
      customShape: {
        type: "text/html",
        dataUrl: "data:text/html,<script>alert(1)</script>",
      },
    });

    expect(normalized).toEqual({ density: 50, shape: "Custom" });
  });

  it("sanitizes imported SVG custom shapes", () => {
    const normalized = normalizeConfig({
      customShape: {
        name: "Logo",
        type: "image/svg+xml",
        svgSource: `<svg onload="bad()"><script>bad()</script><path d="M0 0" /></svg>`,
        dataUrl: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
      },
    });

    expect(normalized.customShape.type).toBe("image/svg+xml");
    expect(normalized.customShape.svgSource).not.toContain("<script>");
    expect(normalized.customShape.svgSource).not.toContain("onload");
  });

  it("lands at / by default — not the caller's current path", () => {
    // Important so the recipient's mount doesn't apply /looks/:id preset
    // defaults on top of the share config and clobber its differences.
    const url = buildShareUrl({ selection: "world" }, "https://globestudio.app");
    expect(new URL(url).pathname).toBe("/");
  });

  it("honors an explicit pathname override", () => {
    const url = buildShareUrl({ selection: "world" }, "https://globestudio.app", "/embed");
    expect(new URL(url).pathname).toBe("/embed");
  });

  it("strips ?c= from the URL after applying", () => {
    if (typeof window === "undefined") return;
    window.history.replaceState({}, "", "/?c=encoded-thing&other=keep");
    expect(window.location.search).toContain("c=");

    clearShareConfigFromUrl();
    expect(window.location.search).not.toContain("c=");
    expect(window.location.search).toContain("other=keep");
  });

  it("clearShareConfigFromUrl is a no-op when ?c= isn't present", () => {
    if (typeof window === "undefined") return;
    window.history.replaceState({}, "", "/looks/halftone?other=value");
    const before = window.location.href;
    clearShareConfigFromUrl();
    expect(window.location.href).toBe(before);
  });
});
