import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { centerOfPoints } from "./face-points.js";
import { latLngToVector3 } from "../three/coordinates.js";

// The rotation GlobeBackground's faceLatLng sets with no saved tilt.
const facingRotation = ({ lat, lng }) =>
  new THREE.Euler(THREE.MathUtils.degToRad(lat), THREE.MathUtils.degToRad(-90 - lng), 0);

describe("centerOfPoints", () => {
  it("finds the middle of a cluster", () => {
    const center = centerOfPoints([
      { lat: 34, lng: 134 },
      { lat: 36, lng: 138 },
      { lat: 38, lng: 140 },
    ]);
    expect(center.lat).toBeCloseTo(36, 0);
    expect(center.lng).toBeCloseTo(137.3, 0);
  });

  it("keeps a selection across the antimeridian on the right side", () => {
    const center = centerOfPoints([
      { lat: -17, lng: 178 },
      { lat: -17, lng: -179 },
    ]);
    expect(Math.abs(center.lng)).toBeGreaterThan(178);
  });

  it("returns null without usable points", () => {
    expect(centerOfPoints([])).toBeNull();
    expect(centerOfPoints([{ x: 1, y: 2 }])).toBeNull();
    expect(centerOfPoints(undefined)).toBeNull();
  });

  it("gives a rotation that puts the place in front of the camera", () => {
    for (const place of [
      { lat: 36, lng: 138 }, // Japan
      { lat: -10, lng: -52 }, // Brazil
      { lat: -17, lng: 179 }, // Fiji
      { lat: 64, lng: -19 }, // Iceland
    ]) {
      const point = latLngToVector3(place.lat, place.lng, 1).applyEuler(facingRotation(place));
      expect(point.z, JSON.stringify(place)).toBeCloseTo(1, 5);
    }
  });
});
