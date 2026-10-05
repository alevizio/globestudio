import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { DEFAULT_GLOBE_SETTINGS } from "../config/globe-settings.js";
import { storedRgb } from "../utils/color-space.js";
import { createDataMarkers } from "./data-markers.js";
import { createGlobeNetwork, setNetworkColors } from "./globe-network.js";
import { createGraticule, syncGraticule } from "./globe.js";

// Each layer draws a stored color the old way unless the design has hex
// colors (three/picked-color.js). tests/e2e/color-space.spec.js checks the
// pixels; these check the values each layer is given.
const hexColor = (hex) => new THREE.Color().setRGB(...storedRgb(hex));
const oldColor = (hex) => new THREE.Color(hex);

describe("scene colors", () => {
  it("the grid draws its color and gradient by the design's color space", () => {
    const settings = { ...DEFAULT_GLOBE_SETTINGS, gridColor: "#808080" };
    expect(createGraticule(settings).children[0].material.color.equals(oldColor("#808080"))).toBe(true);
    expect(createGraticule(settings, true).children[0].material.color.equals(hexColor("#808080"))).toBe(true);

    const gradient = { ...DEFAULT_GLOBE_SETTINGS, gridGradient: { from: "#ff8000", to: "#ff8000" } };
    // Vertex colors are 32-bit floats.
    const vertex = (grid) => new THREE.Color().fromBufferAttribute(grid.children[0].geometry.getAttribute("color"), 0).toArray();
    const close = (actual, expected) => actual.forEach((value, i) => expect(value).toBeCloseTo(expected.toArray()[i], 6));
    close(vertex(createGraticule(gradient)), oldColor("#ff8000"));
    close(vertex(createGraticule(gradient, true)), hexColor("#ff8000"));
  });

  it("rebuilds the grid when the design's color space changes", () => {
    const globeGroup = new THREE.Group();
    const settings = { ...DEFAULT_GLOBE_SETTINGS, gridColor: "#808080" };
    const refs = { globeGroup, graticule: createGraticule(settings) };
    globeGroup.add(refs.graticule);
    syncGraticule(refs, settings);
    const before = refs.graticule;
    refs.hexColors = true;
    syncGraticule(refs, settings);
    expect(refs.graticule).not.toBe(before);
    expect(refs.graticule.children[0].material.color.equals(hexColor("#808080"))).toBe(true);
  });

  it("the data markers draw their color by the design's color space", () => {
    const points = [{ lat: 40.7, lng: -74, value: 5 }, { lat: 51.5, lng: -0.1, value: 3 }];
    const tint = (layer) => layer.children.at(-1).material.color;
    expect(tint(createDataMarkers(points, { color: "#ff0066" })).equals(oldColor("#ff0066"))).toBe(true);
    expect(tint(createDataMarkers(points, { color: "#ff0066", hexColors: true })).equals(hexColor("#ff0066"))).toBe(true);
  });

  it("the network draws picked arc and pulse colors by the design's color space", () => {
    const trail = (root) =>
      root.userData.routeGroup.children[0].children.find((child) => child.userData.role === "trail").material.uniforms.color.value;
    const root = createGlobeNetwork();
    setNetworkColors(root, "#ff0066", null);
    expect(trail(root).equals(oldColor("#ff0066"))).toBe(true);
    setNetworkColors(root, "#ff0066", null, true);
    expect(trail(root).equals(hexColor("#ff0066"))).toBe(true);
  });
});
