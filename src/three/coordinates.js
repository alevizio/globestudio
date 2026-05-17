import * as THREE from "three";
import { GLOBE_RADIUS } from "../config/globe-settings.js";
import { degToRad } from "../utils/math.js";

export const latLngToVector3 = (lat, lng, radius = GLOBE_RADIUS) => {
  const phi = degToRad(90 - lat);
  const theta = degToRad(lng + 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
};

export const pointToFlatVector3 = (point, image, radiusOffset = 0) => {
  const flatWidth = 5.35 + radiusOffset * 12;
  const flatHeight = flatWidth * (image.height / image.width);

  return new THREE.Vector3(
    (point.x / image.width - 0.5) * flatWidth,
    (0.5 - point.y / image.height) * flatHeight,
    -0.18 + radiusOffset * 0.5,
  );
};
