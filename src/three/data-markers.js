import * as THREE from "three";
import { latLngToVector3 } from "./coordinates.js";
import { GLOBE_RADIUS } from "../config/globe-settings.js";
import { valueToRadius } from "../utils/data-points.js";

// Additive layer of glowing spheres anchored at lat/lng, sized by value.
// Purely additive — separate from the dot field and the curated network, so
// it never affects existing rendering. Mirrors the network's anchor style
// (additive MeshBasicMaterial spheres lifted just off the surface).
export const createDataMarkers = (points = [], { color = "#7edfff" } = {}) => {
  const group = new THREE.Group();
  group.name = "data-markers";
  if (!points.length) return group;

  const values = points.map((p) => (Number.isFinite(p.value) ? p.value : 1));
  const valueMin = Math.min(...values);
  const valueMax = Math.max(...values);
  const tint = new THREE.Color(color);

  for (const point of points) {
    const radius = valueToRadius(point.value, valueMin, valueMax);
    const material = new THREE.MeshBasicMaterial({
      color: tint.clone(),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material);
    mesh.position.copy(latLngToVector3(point.lat, point.lng, GLOBE_RADIUS + 0.02));
    group.add(mesh);
  }
  return group;
};
