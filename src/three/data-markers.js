import * as THREE from "three";
import { latLngToVector3 } from "./coordinates.js";
import { GLOBE_RADIUS } from "../config/globe-settings.js";
import { valueToRadius } from "../utils/data-points.js";

const ARC_SEGMENTS = 48;

// Great-circle-ish arc between two surface vectors, bowed outward at the
// midpoint so it lifts off the globe. (lerp+normalize approximates the great
// circle closely enough for short/medium hops and reads clean.)
const buildArcPoints = (start, end, lift) => {
  const points = [];
  for (let i = 0; i <= ARC_SEGMENTS; i += 1) {
    const t = i / ARC_SEGMENTS;
    const p = start.clone().lerp(end, t);
    const bow = Math.sin(t * Math.PI) * lift;
    p.normalize().multiplyScalar(GLOBE_RADIUS + 0.02 + bow);
    points.push(p);
  }
  return points;
};

// Additive layer of glowing spheres anchored at lat/lng, sized by value.
// Purely additive — separate from the dot field and the curated network, so
// it never affects existing rendering. Mirrors the network's anchor style
// (additive MeshBasicMaterial spheres lifted just off the surface).
export const createDataMarkers = (points = [], { color = "#7edfff", arcs = false } = {}) => {
  const group = new THREE.Group();
  group.name = "data-markers";
  if (!points.length) return group;

  const tintColor = new THREE.Color(color);
  // Connection arcs between consecutive points (flow-map style). Additive,
  // drawn under the markers. Lift scales with hop distance so long arcs bow
  // higher and don't clip the surface.
  if (arcs && points.length >= 2) {
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = latLngToVector3(points[i].lat, points[i].lng, GLOBE_RADIUS);
      const b = latLngToVector3(points[i + 1].lat, points[i + 1].lng, GLOBE_RADIUS);
      const lift = 0.12 + a.distanceTo(b) * 0.18;
      const geometry = new THREE.BufferGeometry().setFromPoints(buildArcPoints(a, b, lift));
      const material = new THREE.LineBasicMaterial({
        color: tintColor.clone(),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      group.add(new THREE.Line(geometry, material));
    }
  }

  const values = points.map((p) => (Number.isFinite(p.value) ? p.value : 1));
  const valueMin = Math.min(...values);
  const valueMax = Math.max(...values);

  for (const point of points) {
    const radius = valueToRadius(point.value, valueMin, valueMax);
    const material = new THREE.MeshBasicMaterial({
      color: tintColor.clone(),
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
