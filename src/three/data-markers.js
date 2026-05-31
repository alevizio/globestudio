import * as THREE from "three";
import { latLngToVector3, pointToFlatVector3 } from "./coordinates.js";
import { GLOBE_RADIUS } from "../config/globe-settings.js";
import { valueToRadius } from "../utils/data-points.js";
import { latLngToImagePoint } from "../utils/projection.js";

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
// Purely additive — separate from the dot field + curated network. Each marker
// stashes BOTH its sphere position and its flat-plane position on userData so
// the per-frame loop can morph it flat↔globe in lock-step with the dots (the
// flat position uses the same Mercator projection as the dot field). Arc lines
// are tagged isArc so the loop can show them in globe view only.
export const createDataMarkers = (points = [], { color = "#7edfff", arcs = false, image = null } = {}) => {
  const group = new THREE.Group();
  group.name = "data-markers";
  if (!points.length) return group;

  const tintColor = new THREE.Color(color);
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
      const line = new THREE.Line(geometry, material);
      line.userData.isArc = true;
      group.add(line);
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
    const spherePos = latLngToVector3(point.lat, point.lng, GLOBE_RADIUS + 0.02);
    mesh.userData.spherePos = spherePos;
    // Flat-plane position (matches the dots' Mercator layout) — only when we
    // have the map image to project against.
    mesh.userData.flatPos = image
      ? pointToFlatVector3(latLngToImagePoint(point.lat, point.lng, image), image, 0.02)
      : spherePos.clone();
    mesh.position.copy(spherePos);
    group.add(mesh);
  }
  return group;
};
