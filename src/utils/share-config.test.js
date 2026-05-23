import { afterEach, describe, expect, it } from "vitest";
import {
  buildShareUrl,
  clearShareConfigFromUrl,
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
      dotGradient: { from: "#ff0", to: "#0ff", angle: 45 },
      shaderSettings: { effect: "halftone", cellSize: 10, intensity: 80 },
      globeSettings: { autoSpin: false, networkMono: true, glowStrength: 64 },
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
