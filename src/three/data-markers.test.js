import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createDataMarkers } from "./data-markers.js";

const OFFICES = [
  { lat: 40.71, lng: -74.01, value: 10 },
  { lat: 51.51, lng: -0.13, value: 10 },
  { lat: 35.68, lng: 139.69, value: 10 },
];

describe("createDataMarkers", () => {
  it("draws after the sphere, so the sphere's depth hides far-side markers and arcs", () => {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.28 }));
    const markers = createDataMarkers(OFFICES, { arcs: true });
    expect(markers.renderOrder).toBeGreaterThan(sphere.renderOrder);
    const drawn = markers.children.filter((child) => child.isMesh || child.isLine);
    expect(drawn).toHaveLength(OFFICES.length + OFFICES.length - 1);
    for (const child of drawn) {
      expect(child.material.depthTest).toBe(true);
      expect(child.material.depthWrite).toBe(false);
    }
  });

  it("keeps the draw order on an empty layer too", () => {
    expect(createDataMarkers([]).renderOrder).toBe(1);
  });
});
